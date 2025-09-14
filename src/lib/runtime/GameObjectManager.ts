import * as THREE from "three";
import { GameObject } from "./GameObject";
import { VisualComponent } from "./VisualComponent";
import { ScriptComponent } from "./ScriptComponent";
import * as Types from "$lib/types";
import { PhysicsComponent } from "./PhysicsComponent";
import { PlayerControllerComponent } from "./PlayerControllerComponent";
import { sceneStore } from "$lib/sceneStore";
import { CameraComponent } from "./CameraComponent";

/**
 * GameObjectManager handles the lifecycle of all GameObjects in the scene
 * Provides centralized management for creation, updates, and destruction
 */
export class GameObjectManager {
    private gameObjects: Map<string, GameObject> = new Map();
    private scene: THREE.Scene;
    private camera: THREE.Camera | null = null;
    private variablesMap: Record<string, { value: any; type: string }> = {};

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Initialize GameObjects from scene store data
     */
    initializeFromScene(sceneStore: any): THREE.Camera | null {
        // Clear existing objects
        this.clear();

        // Get scene objects
        const sceneObjects = sceneStore.getScene().objects;
        let sceneCamera: Types.BCamera | null = null;
        let activeCameraSet = false;

        // Create variables map from scene store
        const variables = sceneStore.getVariables();
        this.variablesMap = variables.reduce(
            (acc: Record<string, { value: any; type: string }>, v: any) => {
                acc[v.name] = { value: v.value, type: v.type };
                return acc;
            },
            {}
        );

        // First pass: create GameObjects for all scene BNode3D objects
        for (const obj of sceneObjects) {
            if (obj instanceof Types.BNode3D) {
                console.warn(
                    "NOT ALL PROPERTY REPLICATION IMPLEMENTED YET. ADDING",
                    obj
                );

                // Create GameObject wrapper
                const gameObject = new GameObject(obj);
                this.gameObjects.set(obj.id, gameObject);

                // Add VisualComponent for renderable objects
                if (obj instanceof Types.BPart || obj instanceof Types.BLight) {
                    gameObject.addComponent(
                        new VisualComponent(gameObject, this.scene)
                    );
                }

                // Attach CameraComponent to cameras and select active camera
                if (obj instanceof Types.BCamera) {
                    gameObject.addComponent(new CameraComponent(gameObject));
                    const camComp = gameObject.getComponent(
                        CameraComponent
                    ) as CameraComponent | null;
                    if (obj.isActive && !activeCameraSet && camComp) {
                        this.camera = camComp.getCamera();
                        activeCameraSet = true;
                    }
                }

                // Add PhysicsComponent for physical objects
                if (obj instanceof Types.BPart) {
                    gameObject.addComponent(new PhysicsComponent(gameObject));
                }

                // Add PlayerControllerComponent for player controllers
                if (obj instanceof Types.BPlayerController) {
                    gameObject.addComponent(
                        new PlayerControllerComponent(gameObject)
                    );
                }

                // Store camera reference for later use
                if (obj instanceof Types.BCamera && !sceneCamera) {
                    sceneCamera = obj;
                }
            } else if (obj instanceof Types.BScript) {
                // Handle scripts - they need to be attached to their parent GameObject
                const parentObject = obj.parent;
                if (parentObject) {
                    const gameObject = this.gameObjects.get(parentObject.id);
                    if (gameObject) {
                        gameObject.addComponent(
                            new ScriptComponent(
                                gameObject,
                                obj,
                                this.scene,
                                this.variablesMap
                            )
                        );
                    } else {
                        console.warn(
                            `Script ${obj.id} parent ${parentObject.id} not found in GameObjects`
                        );
                    }
                } else {
                    console.warn(`Script ${obj.id} has no parent object`);
                    // TODO: support scripts with no parent
                }
            }
        }

        // Second pass: build GameObject parent/child hierarchy from BNode3D relationships
        for (const obj of sceneObjects) {
            if (obj instanceof Types.BNode3D) {
                const childGO = this.gameObjects.get(obj.id);
                if (!childGO) continue;

                const parentRef: any = (obj as any).parent;
                if (!parentRef) continue;

                // parentRef may be a BObject or an ID string
                const parentId: string | null =
                    typeof parentRef === "string"
                        ? parentRef
                        : (parentRef && parentRef.id) || null;

                if (!parentId) continue;

                const parentGO = this.gameObjects.get(parentId);
                if (parentGO) {
                    parentGO.addChild(childGO);
                }
            }
        }

        // Setup camera if found (fallback to first camera if no active marked)
        if (!this.camera && sceneCamera) {
            const go = this.gameObjects.get(sceneCamera.id);
            const camComp = go?.getComponent(
                CameraComponent
            ) as CameraComponent | null;
            if (camComp) {
                this.camera = camComp.getCamera();
            }
        }

        console.log(
            `GameObjectManager initialized with ${this.gameObjects.size} objects`
        );
        return this.camera;
    }

    /**
     * Update the aspect ratio on all camera components
     */
    updateCameraAspect(aspect: number): void {
        for (const go of this.gameObjects.values()) {
            const cam = go.getComponent(CameraComponent);
            if (cam) {
                cam.setAspect(aspect);
            }
        }
    }

    /**
     * Create THREE.js camera from BCamera
     */
    private createCameraFromBCamera(
        bCamera: Types.BCamera
    ): THREE.PerspectiveCamera {
        const camera = new THREE.PerspectiveCamera(
            bCamera.fieldOfView || 75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        camera.position.set(
            bCamera.position.x,
            bCamera.position.y,
            bCamera.position.z
        );

        // Convert BCamera Euler rotation to Three.js quaternion
        const euler = new THREE.Euler(
            bCamera.rotation.x,
            bCamera.rotation.y,
            bCamera.rotation.z
        );
        camera.quaternion.setFromEuler(euler);

        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();

        return camera;
    }

    /**
     * Update all GameObjects
     */
    update(delta: number): void {
        // First, update all world matrices from the root objects down
        for (const gameObject of this.gameObjects.values()) {
            if (!gameObject.getParent()) {
                gameObject.updateWorldMatrix();
            }
        }

        // Then, update all components
        for (const gameObject of this.gameObjects.values()) {
            gameObject.update(delta);
        }
    }

    /**
     * Get a GameObject by its ID
     */
    getGameObject(id: string): GameObject | null {
        return this.gameObjects.get(id) || null;
    }

    /**
     * Get all GameObjects
     */
    getAllGameObjects(): GameObject[] {
        return Array.from(this.gameObjects.values());
    }

    /**
     * Get GameObjects with a specific component type
     */
    getGameObjectsWithComponent<T>(
        componentClass: new (...args: any[]) => T
    ): GameObject[] {
        return this.getAllGameObjects().filter((go) =>
            go.hasComponent(componentClass)
        );
    }

    /**
     * Add a new GameObject
     */
    addGameObject(gameObject: GameObject): void {
        this.gameObjects.set(gameObject.id, gameObject);
    }

    /**
     * Remove a GameObject
     */
    removeGameObject(id: string): void {
        const gameObject = this.gameObjects.get(id);
        if (gameObject) {
            gameObject.destroy();
            this.gameObjects.delete(id);
        }
    }

    /**
     * Update variables map (useful when scene variables change)
     */
    updateVariables(
        variablesMap: Record<string, { value: any; type: string }>
    ): void {
        this.variablesMap = variablesMap;

        // Update all script components with new variables
        for (const gameObject of this.gameObjects.values()) {
            const scriptComponent = gameObject.getComponent(ScriptComponent);
            if (scriptComponent) {
                scriptComponent.updateVariables(variablesMap);
            }
        }
    }

    /**
     * Get the current camera
     */
    getCamera(): THREE.Camera | null {
        return this.camera;
    }

    /**
     * Set up default lighting for the scene
     */
    setupDefaultLighting(): void {
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, Math.PI);
        directionalLight.position.set(3, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
    }

    /**
     * Clear all GameObjects
     */
    clear(): void {
        for (const gameObject of this.gameObjects.values()) {
            gameObject.destroy();
        }
        this.gameObjects.clear();
        this.camera = null;
    }

    /**
     * Destroy the manager and clean up all resources
     */
    destroy(): void {
        this.clear();

        // Reset physics world after all GameObjects are destroyed
        // This ensures no double-removal of physics bodies/colliders
        sceneStore.resetPhysicsWorld();
    }
}
