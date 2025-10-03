// @ts-nocheck
import * as THREE from "three";
import { GameObject } from "./GameObject";
import { VisualComponent } from "./VisualComponent";
import { ScriptComponent } from "./ScriptComponent";
import * as Types from "$lib/types";
import { PhysicsComponent } from "./PhysicsComponent";
import { PlayerControllerComponent } from "./PlayerControllerComponent";
import { ConstraintComponent } from "./ConstraintComponent";
import { MotorComponent } from "./MotorComponent";
import { sceneStore } from "$lib/sceneStore";
import { CameraComponent } from "./CameraComponent";
import { runtimeStore } from "$lib/runtimeStore";
import { WaypointNavigatorComponent } from "./WaypointNavigatorComponent";

/**
 * GameObjectManager handles the lifecycle of all GameObjects in the scene
 * Provides centralized management for creation, updates, and destruction
 */
export class GameObjectManager {
    private gameObjects: Map<string, GameObject> = new Map();
    private scene: THREE.Scene;
    private camera: THREE.Camera | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        runtimeStore.setThreeScene(scene);
        runtimeStore.setGameObjectManager(this);
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

        // First pass: build hierarchy map from all BObjects
        const hierarchyMap = new Map<string, string[]>(); // parentId -> childIds
        const rootObjects: Types.BObject[] = [];

        for (const obj of sceneObjects) {
            const parentRef: any = (obj as any).parent;
            const parentId: string | null =
                typeof parentRef === "string"
                    ? parentRef
                    : (parentRef && parentRef.id) || null;

            if (parentId) {
                if (!hierarchyMap.has(parentId)) {
                    hierarchyMap.set(parentId, []);
                }
                hierarchyMap.get(parentId)!.push(obj.id);
            } else {
                rootObjects.push(obj);
            }
        }

        // Second pass: create GameObjects recursively with complete hierarchy
        const createGameObjectWithChildren = (
            bObject: Types.BObject
        ): GameObject => {
            console.warn(
                "NOT ALL PROPERTY REPLICATION IMPLEMENTED YET. ADDING",
                bObject
            );

            // Get children for this node
            const childIds = hierarchyMap.get(bObject.id) || [];
            const children: GameObject[] = [];

            // Recursively create child GameObjects first
            for (const childId of childIds) {
                const childBObject = sceneObjects.find(
                    (obj) => obj.id === childId
                );
                if (childBObject) {
                    children.push(createGameObjectWithChildren(childBObject));
                }
            }

            // Create GameObject with its children
            const gameObject = new GameObject(bObject, children);
            this.gameObjects.set(bObject.id, gameObject);

            return gameObject;
        };

        // Create all root GameObjects (this will recursively create the entire hierarchy)
        for (const rootObj of rootObjects) {
            createGameObjectWithChildren(rootObj);
        }

        // Third pass: add components to all GameObjects now that hierarchy is complete
        for (const obj of sceneObjects) {
            const gameObject = this.gameObjects.get(obj.id);
            if (!gameObject) continue;

            // Always create components, but we'll toggle enabled based on Storage membership
            this.addComponentsToGameObject(obj, gameObject);
            const enable = !gameObject.isUnderStorage();
            for (const c of gameObject.getComponents()) c.setEnabled(enable);

            // Handle camera selection for active camera
            if (obj instanceof Types.BCamera) {
                const camComp = gameObject.getComponent(
                    CameraComponent
                ) as CameraComponent | null;
                if (obj.isActive && !activeCameraSet && camComp) {
                    this.camera = camComp.getCamera();
                    activeCameraSet = true;
                }
                // Store camera reference for later use
                if (!sceneCamera) {
                    sceneCamera = obj;
                }
            }
        }

        // Fourth pass: handle scripts
        for (const obj of sceneObjects) {
            if (obj instanceof Types.BScript) {
                const parentObject = obj.parent;
                if (parentObject) {
                    const gameObject = this.gameObjects.get(parentObject.id);
                    if (gameObject) {
                        if (!gameObject.isUnderStorage()) {
                            gameObject.addComponent(
                                new ScriptComponent(gameObject, obj, this.scene)
                            );
                        }
                    } else {
                        runtimeStore.warn(
                            `Script ${obj.id} parent ${parentObject.id} not found in GameObjects`,
                            "GameObjectManager"
                        );
                    }
                } else {
                    runtimeStore.warn(
                        `Script ${obj.id} has no parent object`,
                        "GameObjectManager"
                    );
                    // TODO: support scripts with no parent
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

        runtimeStore.info(
            `GameObjectManager initialized with ${this.gameObjects.size} objects`,
            "GameObjectManager"
        );
        return this.camera;
    }

    /**
     * Update the aspect ratio on all camera components
     */
    updateCameraAspect(aspect: number): void {
        for (const go of this.gameObjects.values()) {
            const cam = go.getComponent(
                CameraComponent
            ) as CameraComponent | null;
            if (cam) {
                cam.setAspect(aspect);
            }
        }
    }

    /**
     * Update all GameObjects
     */
    update(delta: number): void {
        // Update world matrices for all GameObjects
        for (const gameObject of this.gameObjects.values()) {
            gameObject.updateWorldMatrix();
        }

        // Then, update all components
        for (const gameObject of this.gameObjects.values()) {
            gameObject.update(delta);
        }

        // Broadcast update event for scripts that listen
        runtimeStore.emit("update", delta);
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
     * Return UI roots (children under the first BUIStorage) from the runtime snapshot
     */
    getUIRoots(): GameObject[] {
        const all = this.getAllGameObjects();
        const uiStorageGO = all.find(
            (go) => go.bObject instanceof Types.BUIStorage
        );
        if (!uiStorageGO) return [];
        return uiStorageGO
            .getChildren()
            .filter((child) => child.bObject instanceof Types.BUI);
    }

    /**
     * Get GameObjects with a specific component type
     */
    getGameObjectsWithComponent(componentClass: {
        name: string;
    }): GameObject[] {
        return this.getAllGameObjects().filter((go: GameObject) =>
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

    cloneGameObject(id: string): GameObject | null {
        const original = this.getGameObject(id);
        if (!original) {
            runtimeStore.warn(
                `GameObject with id ${id} not found`,
                "GameObjectManager"
            );
            return null;
        }

        // Create a new GameObject by cloning the original
        const clone = original.clone();
        this.addGameObject(clone);

        runtimeStore.info(
            `Cloned GameObject ${id} to ${clone.id}`,
            "GameObjectManager"
        );
        return clone;
    }

    // updateVariables removed; variables live in runtimeStore

    /**
     * Get the current camera
     */
    getCamera(): THREE.Camera | null {
        return this.camera;
    }

    /**
     * Set up default lighting for the scene
     * Enhanced for beautiful visuals inspired by Minecraft shaders
     */
    setupDefaultLighting(): void {
        // Main directional light (sun) with warmer color
        const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.5); // Warm sunlight
        sunLight.position.set(10, 20, 10);
        sunLight.castShadow = true;

        // Configure shadow quality for beautiful soft shadows
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sunLight.shadow.bias = -0.0001;
        sunLight.shadow.radius = 2; // Soft shadow edges

        this.scene.add(sunLight);

        // Ambient light for soft fill (sky color)
        const ambientLight = new THREE.AmbientLight(0xb3d9ff, 0.4); // Cool sky blue
        this.scene.add(ambientLight);

        // Hemisphere light for sky-ground color variation (atmospheric)
        const hemisphereLight = new THREE.HemisphereLight(
            0x87ceeb, // Sky color (light blue)
            0x362312, // Ground color (warm brown)
            0.6
        );
        this.scene.add(hemisphereLight);

        // Optional: Add subtle rim/back light for depth
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(-5, 5, -10);
        this.scene.add(rimLight);
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
     * Add components to a GameObject based on its BObject type
     */
    private addComponentsToGameObject(
        bObject: Types.BObject,
        gameObject: GameObject
    ): void {
        // Add VisualComponent for renderable objects (idempotent)
        if (
            (bObject instanceof Types.BPart ||
                bObject instanceof Types.BLight) &&
            !gameObject.getComponent(VisualComponent) &&
            bObject.enableRendering
        ) {
            gameObject.addComponent(
                new VisualComponent(gameObject, this.scene)
            );
        }

        // Attach CameraComponent to cameras
        if (
            bObject instanceof Types.BCamera &&
            !gameObject.getComponent(CameraComponent)
        ) {
            gameObject.addComponent(new CameraComponent(gameObject));
        }

        // Add PhysicsComponent for physical objects (only if physics is enabled)
        if (
            bObject instanceof Types.BPart &&
            bObject.enablePhysics &&
            !gameObject.getComponent(PhysicsComponent)
        ) {
            gameObject.addComponent(new PhysicsComponent(gameObject));
        }

        // Add PlayerControllerComponent for player controllers
        if (
            bObject instanceof Types.BPlayerController &&
            !gameObject.getComponent(PlayerControllerComponent)
        ) {
            gameObject.addComponent(new PlayerControllerComponent(gameObject));
        }

        // Add ConstraintComponent for constraints
        if (
            bObject instanceof Types.BConstraint &&
            !gameObject.getComponent(ConstraintComponent)
        ) {
            gameObject.addComponent(new ConstraintComponent(gameObject));
        }

        // Add MotorComponent for motors
        if (
            bObject instanceof Types.BMotor &&
            !gameObject.getComponent(MotorComponent)
        ) {
            gameObject.addComponent(new MotorComponent(gameObject));
        }

        // Add WaypointNavigatorComponent to the navigator's own GameObject
        if (bObject instanceof Types.BWaypointNavigator) {
            const hostGameObject = gameObject.getParent();

            if (!hostGameObject) {
                runtimeStore.warn(
                    `WaypointNavigator ${bObject.id} has no parent GameObject to attach to`,
                    "GameObjectManager"
                );
                return;
            }

            hostGameObject.setComponentConfig(
                WaypointNavigatorComponent,
                bObject
            );

            if (!hostGameObject.getComponent(WaypointNavigatorComponent)) {
                hostGameObject.addComponent(
                    new WaypointNavigatorComponent(hostGameObject)
                );
            }

            return;
        }
    }

    /**
     * Remove all components from a GameObject
     */
    removeAllComponents(gameObject: GameObject): void {
        // Get all components and remove them one by one
        const components = gameObject.getComponents();
        for (const component of components) {
            gameObject.removeComponent(component);
        }
    }

    /**
     * Ensure components exist for this GameObject and all descendants if not under Storage
     */
    ensureComponentsRecursive(gameObject: GameObject): void {
        if (!gameObject.isUnderStorage()) {
            this.addComponentsToGameObject(gameObject.bObject, gameObject);
            // Attach script if present and not already attached
            if (!gameObject.getComponent(ScriptComponent)) {
                const bObj = gameObject.bObject;
                const scriptChild = bObj.children?.find(
                    (c) => c instanceof Types.BScript
                ) as Types.BScript | undefined;
                if (scriptChild) {
                    gameObject.addComponent(
                        new ScriptComponent(gameObject, scriptChild, this.scene)
                    );
                }
            }
        }
        for (const child of gameObject.getChildren()) {
            this.ensureComponentsRecursive(child);
        }
    }

    /**
     * Remove all components from this GameObject and descendants
     */
    removeAllComponentsRecursive(gameObject: GameObject): void {
        this.removeAllComponents(gameObject);
        for (const child of gameObject.getChildren()) {
            this.removeAllComponentsRecursive(child);
        }
    }

    /**
     * Destroy the manager and clean up all resources
     */
    destroy(): void {
        this.clear();

        // Reset physics world after all GameObjects are destroyed to clean up any leftover bodies/colliders
        sceneStore.resetPhysicsWorld();
        runtimeStore.setGameObjectManager(null);
    }
}
