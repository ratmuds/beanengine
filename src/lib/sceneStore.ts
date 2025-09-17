// src/lib/sceneStore.ts
import * as Types from "$lib/types";
import RAPIER from "@dimforge/rapier3d-compat";
import { writable } from "svelte/store";

class SceneManager {
    public scene: Types.BScene;
    public variables: Array<{ name: string; value: any; type: string }>;
    public physicsWorld: RAPIER.World | null = null;
    public physicsInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor(scene?: Types.BScene) {
        this.scene = scene || new Types.BScene();
        this.variables = [];
        // Initialize physics world asynchronously
        this.initializePhysics();
    }

    private async initializePhysics(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                await RAPIER.init();
                const gravity = new RAPIER.Vector3(0, -9.81, 0);
                this.physicsWorld = new RAPIER.World(gravity);
                this.physicsInitialized = true;
                console.log(
                    "[SceneStore] Physics world initialized successfully"
                );
            } catch (error) {
                console.error(
                    "[SceneStore] Failed to initialize physics world:",
                    error
                );
                throw error;
            }
        })();

        return this.initPromise;
    }

    public async waitForPhysicsInitialization(): Promise<void> {
        if (this.physicsInitialized) {
            return;
        }
        return this.initializePhysics();
    }

    public getPhysicsWorld(): RAPIER.World | null {
        return this.physicsWorld;
    }

    public getPhysicsInitialized(): boolean {
        return this.physicsInitialized;
    }

    /**
     * Reset the physics world by removing all bodies and colliders
     * This should be called when stopping play mode to clean up physics state
     */
    public resetPhysicsWorld(): void {
        if (this.physicsWorld) {
            // Remove all rigid bodies
            const bodies = this.physicsWorld.bodies;
            for (let i = bodies.len() - 1; i >= 0; i--) {
                const body = bodies.get(i);
                if (body) {
                    this.physicsWorld.removeRigidBody(body);
                }
            }

            // Remove all colliders
            const colliders = this.physicsWorld.colliders;
            for (let i = colliders.len() - 1; i >= 0; i--) {
                const collider = colliders.get(i);
                if (collider) {
                    this.physicsWorld.removeCollider(collider, true);
                }
            }

            console.log(
                "[SceneStore] Physics world reset - all bodies and colliders removed"
            );
        }
    }

    createObject(
        objectType: string,
        parentId: string | number,
        options?: {
            position?: Types.BVector3;
            name?: string;
            [key: string]: any;
        }
    ): Types.BObject {
        let newObject: Types.BObject;
        const name = options?.name || this.generateObjectName(objectType);

        switch (objectType.toLowerCase()) {
            case "part":
                newObject = new Types.BPart(name, null, null);
                if (newObject instanceof Types.BPart) {
                    newObject.position =
                        options?.position || new Types.BVector3(0, 0, 0);
                    newObject.scale = new Types.BVector3(1, 1, 1);
                }
                break;
            case "mesh":
                newObject = new Types.BPart(name, null, null);
                if (newObject instanceof Types.BPart) {
                    newObject.position =
                        options?.position || new Types.BVector3(0, 0, 0);
                    newObject.scale = new Types.BVector3(1, 1, 1);
                    // Set mesh from asset if provided
                    if (options?.assetId) {
                        newObject.setAssetMesh(options.assetId);
                    }
                }
                break;
            case "storage":
                newObject = new Types.BStorage(name, null, null);
                break;
            case "camera":
                newObject = new Types.BCamera(name, null, null);
                if (newObject instanceof Types.BCamera) {
                    newObject.position =
                        options?.position || new Types.BVector3(0, 5, 10);
                    if (options?.fieldOfView)
                        newObject.fieldOfView = options.fieldOfView;
                    if (options?.isActive)
                        newObject.isActive = options.isActive;
                }
                break;
            case "light":
                newObject = new Types.BLight(name, null, null);
                if (newObject instanceof Types.BLight) {
                    newObject.position =
                        options?.position || new Types.BVector3(0, 10, 0);
                    if (options?.color) newObject.color = options.color;
                    if (options?.intensity)
                        newObject.intensity = options.intensity;
                }
                break;
            case "script":
                newObject = new Types.BScript(name, null, null);
                break;
            case "playercontroller":
                newObject = new Types.BPlayerController(name, null, null);
                if (newObject instanceof Types.BPlayerController) {
                    newObject.position =
                        options?.position || new Types.BVector3(0, 0, 0);
                    newObject.scale = new Types.BVector3(1, 1, 1);
                    // Set default movement settings if provided
                    if (options?.movementSpeed)
                        newObject.moveSpeed = options.movementSpeed;
                    if (options?.mouseSensitivity)
                        newObject.mouseSensitivity = options.mouseSensitivity;
                    if (options?.cameraClampAngle)
                        newObject.maxLookAngle = options.cameraClampAngle;
                }
                break;
            case "constraint":
                // Create constraint with placeholder parts (will be set via properties panel)
                const allParts = this.getAllParts();
                const partA = allParts[0] || null;
                const partB = allParts[1] || partA || null;
                if (!partA || !partB) {
                    console.warn("Cannot create constraint: need at least one BPart in scene");
                    newObject = new Types.BObject(name, null, null);
                    break;
                }
                newObject = new Types.BConstraint(name, null, null, partA, partB);
                break;
            default:
                console.warn(`Unknown object type: ${objectType}`);
                newObject = new Types.BObject(name, null, null);
                break;
        }

        // Set parent if provided
        if (parentId) {
            const parentObject = this.getObjectById(parentId.toString());
            if (parentObject) {
                console.log(
                    `Parent object with ID ${parentId} found:`,
                    parentObject
                );
                newObject.parent = parentObject;
                parentObject.addChild(newObject);
            } else {
                console.warn(`Parent object with ID ${parentId} not found`);
            }
        }

        this.scene.addObject(newObject);
        return newObject;
    }

    private generateObjectName(objectType: string): string {
        const typeCount = this.scene.objects.filter(
            (obj) => obj.type === objectType.toLowerCase()
        ).length;
        const capitalizedType =
            objectType.charAt(0).toUpperCase() + objectType.slice(1);
        return `${capitalizedType}${typeCount + 1}`;
    }

    // Convenience methods for backward compatibility and common use cases
    createPartInFrontOfCamera(
        parentId: string | number,
        position?: Types.BVector3
    ): Types.BPart {
        return this.createObject("part", parentId, { position }) as Types.BPart;
    }

    createScript(parentId: string | number): Types.BScript {
        return this.createObject("script", parentId) as Types.BScript;
    }

    addObject(object: Types.BObject) {
        this.scene.addObject(object);
    }

    removeObject(object: Types.BObject) {
        this.scene.removeObject(object);
    }

    updateObject(object: Types.BObject) {
        const index = this.scene.objects.findIndex(
            (obj) => obj.id === object.id
        );
        if (index !== -1) {
            // Update the object in place and then create a new array to trigger reactivity
            this.scene.objects[index] = object;
            this.scene.objects = [...this.scene.objects];
        } else {
            console.warn("Object not found:", object.id);
        }
    }

    reparentObject(objectId: string, newParentId: string | number) {
        const objectToReparent = this.scene.objects.find(
            (obj) => obj.id === objectId
        );
        if (!objectToReparent) {
            console.warn("Object to reparent not found:", objectId);
            return;
        }

        // Remove from current parent if it has one
        if (objectToReparent.parent) {
            objectToReparent.parent.removeChild(objectToReparent);
        }

        // If newParentId is -1, set parent to null (make it root)
        if (newParentId === -1) {
            objectToReparent.parent = null;
        } else {
            // Find the new parent object
            const newParent = this.scene.objects.find(
                (obj) => obj.id === newParentId.toString()
            );
            if (!newParent) {
                console.warn("New parent object not found:", newParentId);
                return;
            }
            objectToReparent.parent = newParent;
            newParent.addChild(objectToReparent);
        }

        // Trigger reactivity by creating a new array
        this.scene.objects = [...this.scene.objects];
    }

    getScene(): Types.BScene {
        return this.scene;
    }

    setVariables(variables: Array<{ name: string; value: any; type: string }>) {
        console.log("[SceneStore] Setting variables:", variables);
        this.variables = variables;
    }

    updateVariable(name: string, value: any) {
        const variable = this.variables.find((v) => v.name === name);
        if (variable) {
            console.log(
                `[SceneStore] Updating variable '${name}':`,
                variable.value,
                "->",
                value
            );
            variable.value = value;
        } else {
            console.log(`[SceneStore] Adding new variable '${name}':`, value);
            this.variables.push({ name, value, type: typeof value });
        }
    }

    getVariables(): Array<{ name: string; value: any; type: string }> {
        console.log("[SceneStore] Getting variables:", this.variables);
        return this.variables;
    }

    // Helper functions for object management
    getObjectById(id: string): Types.BObject | undefined {
        return this.scene.objects.find((obj) => obj.id === id);
    }

    getObjectsByType<T extends Types.BObject>(type: string): T[] {
        return this.scene.objects.filter((obj) => obj.type === type) as T[];
    }

    getFirstObjectByType<T extends Types.BObject>(type: string): T | undefined {
        return this.scene.objects.find((obj) => obj.type === type) as
            | T
            | undefined;
    }

    getAllCameras(): Types.BCamera[] {
        return this.getObjectsByType<Types.BCamera>("camera");
    }

    getAllLights(): Types.BLight[] {
        return this.getObjectsByType<Types.BLight>("light");
    }

    getAllParts(): Types.BPart[] {
        return this.getObjectsByType<Types.BPart>("part");
    }

    getAllScripts(): Types.BScript[] {
        return this.getObjectsByType<Types.BScript>("script");
    }

    getActiveCamera(): Types.BCamera | undefined {
        return this.getAllCameras().find((camera) => camera.isActive);
    }

    setActiveCamera(cameraId: string): void {
        // Deactivate all cameras first
        this.getAllCameras().forEach((camera) => {
            camera.isActive = false;
        });

        // Activate the specified camera
        const camera = this.getObjectById(cameraId) as Types.BCamera;
        if (camera && camera instanceof Types.BCamera) {
            camera.isActive = true;
        }
    }

    getChildrenOf(parentId: string): Types.BObject[] {
        return this.scene.objects.filter(
            (obj) =>
                obj.parent &&
                (typeof obj.parent === "string"
                    ? obj.parent === parentId
                    : obj.parent.id === parentId)
        );
    }

    getRootObjects(): Types.BObject[] {
        return this.scene.objects.filter((obj) => !obj.parent);
    }

    /**
     * Clear the scene by removing all objects and resetting variables
     * This keeps the physics world intact for reuse
     */
    public clearScene(): void {
        // Clear all objects from the scene
        this.scene.objects = [];
        this.scene.children = [];

        // Reset variables
        this.variables = [];

        // Create default BStorage container
        const defaultStorage = new Types.BStorage("Storage", null, null);
        this.scene.addObject(defaultStorage);

        console.log(
            "[SceneStore] Scene cleared - all objects and variables reset"
        );
    }

    /**
     * Serialize the scene to a plain JSON payload
     * Returns objects and variables without File/URL blobs for persistence
     */
    public serialize(): any {
        const serializedObjects = this.scene.objects.map((obj) =>
            this.serializeObject(obj)
        );

        return {
            objects: serializedObjects,
            variables: this.variables.map((v) => ({
                name: v.name,
                value: v.value,
                type: v.type,
            })),
        };
    }

    /**
     * Serialize a single object to a plain object
     */
    private serializeObject(obj: Types.BObject): any {
        const baseData = {
            id: obj.id,
            name: obj.name,
            type: obj.type,
            parentId: obj.parent ? obj.parent.id : null,
        };

        // Add type-specific properties
        if (obj instanceof Types.BNode3D) {
            const node3D = obj as Types.BNode3D;
            Object.assign(baseData, {
                position: {
                    x: node3D.position.x,
                    y: node3D.position.y,
                    z: node3D.position.z,
                },
                rotation: {
                    x: node3D.rotation.x,
                    y: node3D.rotation.y,
                    z: node3D.rotation.z,
                },
                scale: {
                    x: node3D.scale.x,
                    y: node3D.scale.y,
                    z: node3D.scale.z,
                },
                positionOffset: {
                    x: node3D.positionOffset.x,
                    y: node3D.positionOffset.y,
                    z: node3D.positionOffset.z,
                },
                rotationOffset: {
                    x: node3D.rotationOffset.x,
                    y: node3D.rotationOffset.y,
                    z: node3D.rotationOffset.z,
                },
            });
        }

        if (obj instanceof Types.BPart) {
            const part = obj as Types.BPart;
            Object.assign(baseData, {
                meshSource: part.meshSource,
                color: part.color,
                material: part.material,
                transparency: part.transparency,
                castShadows: part.castShadows,
                receiveShadows: part.receiveShadows,
                visible: part.visible,
                positionLocked: part.positionLocked,
                rotationLocked: part.rotationLocked,
                canTouch: part.canTouch,
                canCollide: part.canCollide,
                canQuery: part.canQuery,
            });
        }

        if (obj instanceof Types.BPlayerController) {
            const controller = obj as Types.BPlayerController;
            Object.assign(baseData, {
                moveSpeed: controller.moveSpeed,
                jumpForce: controller.jumpForce,
                mouseSensitivity: controller.mouseSensitivity,
                maxLookAngle: controller.maxLookAngle,
            });
        }

        if (obj instanceof Types.BCamera) {
            const camera = obj as Types.BCamera;
            Object.assign(baseData, {
                fieldOfView: camera.fieldOfView,
                nearClipPlane: camera.nearClipPlane,
                farClipPlane: camera.farClipPlane,
                projectionType: camera.projectionType,
                orthographicSize: camera.orthographicSize,
                aspectRatio: camera.aspectRatio,
                isActive: camera.isActive,
                clearColor: camera.clearColor,
                clearFlags: camera.clearFlags,
            });
        }

        if (obj instanceof Types.BLight) {
            const light = obj as Types.BLight;
            Object.assign(baseData, {
                color: light.color,
                intensity: light.intensity,
            });
        }

        if (obj instanceof Types.BScript) {
            const script = obj as Types.BScript;
            Object.assign(baseData, {
                code: script.code,
            });
        }

        return baseData;
    }

    /**
     * Deserialize a JSON payload to rebuild the scene
     * Creates objects first, then wires parent-child relationships by ID
     */
    public deserialize(data: any): void {
        // Clear the current scene first
        this.clearScene();

        // Create a map to store objects by ID for parent-child wiring
        const objectMap = new Map<string, Types.BObject>();

        // First pass: Create all objects without parent relationships
        for (const objData of data.objects) {
            const obj = this.createObjectFromData(objData);
            if (obj) {
                this.scene.addObject(obj);
                objectMap.set(obj.id, obj);
            }
        }

        // Second pass: Wire parent-child relationships
        for (const objData of data.objects) {
            if (objData.parentId) {
                const child = objectMap.get(objData.id);
                const parent = objectMap.get(objData.parentId);
                if (child && parent) {
                    child.setParent(parent);
                }
            }
        }

        // Restore variables
        if (data.variables) {
            this.variables = data.variables.map((v: any) => ({
                name: v.name,
                value: v.value,
                type: v.type,
            }));
        }

        console.log("[SceneStore] Scene deserialized successfully");
    }

    /**
     * Create an object from serialized data
     */
    private createObjectFromData(data: any): Types.BObject | null {
        let obj: Types.BObject | null = null;

        // Create object based on type
        switch (data.type) {
            case "BStorage":
                obj = new Types.BStorage(data.name, null, null);
                break;
            case "BPart":
                obj = new Types.BPart(data.name, null, null);
                break;
            case "BPlayerController":
                obj = new Types.BPlayerController(data.name, null, null);
                break;
            case "BCamera":
                obj = new Types.BCamera(data.name, null, null);
                break;
            case "BLight":
                obj = new Types.BLight(data.name, null, null);
                break;
            case "BScript":
                obj = new Types.BScript(data.name, null, null);
                break;
            default:
                console.warn(`[SceneStore] Unknown object type: ${data.type}`);
                return null;
        }

        if (!obj) return null;

        // Set the ID to match the serialized data
        obj.id = data.id;

        // Apply type-specific properties
        if (obj instanceof Types.BNode3D && data.position) {
            const node3D = obj as Types.BNode3D;
            node3D.position.set(
                data.position.x,
                data.position.y,
                data.position.z
            );
            node3D.rotation.set(
                data.rotation.x,
                data.rotation.y,
                data.rotation.z
            );
            node3D.scale.set(data.scale.x, data.scale.y, data.scale.z);
            if (data.positionOffset) {
                node3D.positionOffset.set(
                    data.positionOffset.x,
                    data.positionOffset.y,
                    data.positionOffset.z
                );
            }
            if (data.rotationOffset) {
                node3D.rotationOffset.set(
                    data.rotationOffset.x,
                    data.rotationOffset.y,
                    data.rotationOffset.z
                );
            }
        }

        if (obj instanceof Types.BPart) {
            const part = obj as Types.BPart;
            if (data.meshSource !== undefined)
                part.meshSource = data.meshSource;
            if (data.color !== undefined) part.color = data.color;
            if (data.material !== undefined) part.material = data.material;
            if (data.transparency !== undefined)
                part.transparency = data.transparency;
            if (data.castShadows !== undefined)
                part.castShadows = data.castShadows;
            if (data.receiveShadows !== undefined)
                part.receiveShadows = data.receiveShadows;
            if (data.visible !== undefined) part.visible = data.visible;
            if (data.positionLocked !== undefined)
                part.positionLocked = data.positionLocked;
            if (data.rotationLocked !== undefined)
                part.rotationLocked = data.rotationLocked;
            if (data.canTouch !== undefined) part.canTouch = data.canTouch;
            if (data.canCollide !== undefined)
                part.canCollide = data.canCollide;
            if (data.canQuery !== undefined) part.canQuery = data.canQuery;
        }

        if (obj instanceof Types.BPlayerController) {
            const controller = obj as Types.BPlayerController;
            if (data.moveSpeed !== undefined)
                controller.moveSpeed = data.moveSpeed;
            if (data.jumpForce !== undefined)
                controller.jumpForce = data.jumpForce;
            if (data.mouseSensitivity !== undefined)
                controller.mouseSensitivity = data.mouseSensitivity;
            if (data.maxLookAngle !== undefined)
                controller.maxLookAngle = data.maxLookAngle;
        }

        if (obj instanceof Types.BCamera) {
            const camera = obj as Types.BCamera;
            if (data.fieldOfView !== undefined)
                camera.fieldOfView = data.fieldOfView;
            if (data.nearClipPlane !== undefined)
                camera.nearClipPlane = data.nearClipPlane;
            if (data.farClipPlane !== undefined)
                camera.farClipPlane = data.farClipPlane;
            if (data.projectionType !== undefined)
                camera.projectionType = data.projectionType;
            if (data.orthographicSize !== undefined)
                camera.orthographicSize = data.orthographicSize;
            if (data.aspectRatio !== undefined)
                camera.aspectRatio = data.aspectRatio;
            if (data.isActive !== undefined) camera.isActive = data.isActive;
            if (data.clearColor !== undefined)
                camera.clearColor = data.clearColor;
            if (data.clearFlags !== undefined)
                camera.clearFlags = data.clearFlags;
        }

        if (obj instanceof Types.BLight) {
            const light = obj as Types.BLight;
            if (data.color !== undefined) light.color = data.color;
            if (data.intensity !== undefined) light.intensity = data.intensity;
        }

        if (obj instanceof Types.BScript) {
            const script = obj as Types.BScript;
            if (data.code !== undefined) script.code = data.code;
        }

        return obj;
    }
}

function createSceneStore() {
    // Create an instance of the manager
    const manager = new SceneManager();

    // Create a writable store with the manager instance
    const { subscribe, update } = writable(manager);

    // Return the store's `subscribe` method along with custom methods
    // that trigger updates.
    return {
        subscribe,

        // Generic object creation method
        createObject: (
            objectType: string,
            parentId: string | number,
            options?: {
                position?: Types.BVector3;
                name?: string;
                [key: string]: any;
            }
        ) => {
            update((currentManager) => {
                currentManager.createObject(objectType, parentId, options);
                return currentManager;
            });
        },

        // Convenience methods for backward compatibility
        createPartInFrontOfCamera: (
            parentId: string | number,
            position?: Types.BVector3
        ) => {
            update((currentManager) => {
                currentManager.createPartInFrontOfCamera(parentId, position);
                return currentManager;
            });
        },

        createScript: (parentId: string | number) => {
            update((currentManager) => {
                currentManager.createScript(parentId);
                return currentManager;
            });
        },

        addObject: (object: Types.BObject) => {
            update((currentManager) => {
                currentManager.addObject(object);
                // Return the same manager - update() call triggers reactivity
                return currentManager;
            });
        },

        removeObject: (object: Types.BObject) => {
            update((currentManager) => {
                currentManager.removeObject(object);
                // Return the same manager - update() call triggers reactivity
                return currentManager;
            });
        },

        updateObject: (object: Types.BObject) => {
            update((currentManager) => {
            console.log("Updating object:", object);
                currentManager.updateObject(object);
                // Return the same manager - update() call triggers reactivity
                return currentManager;
            });
        },

        reparentObject: (objectId: string, newParentId: string | number) => {
            update((currentManager) => {
                currentManager.reparentObject(objectId, newParentId);
                // Return the same manager - update() call triggers reactivity
                return currentManager;
            });
        },

        triggerReactivity: () => {
            update((currentManager) => {
            console.log("Triggering reactivity");
                return currentManager;
            });
        },

        setVariables: (
            variables: Array<{ name: string; value: any; type: string }>
        ) => {
            update((currentManager) => {
                currentManager.setVariables(variables);
                return currentManager;
            });
        },

        updateVariable: (name: string, value: any) => {
            update((currentManager) => {
                currentManager.updateVariable(name, value);
                return currentManager;
            });
        },

        getScene: () => {
            return manager.getScene();
        },

        getPhysicsWorld: () => {
            return manager.getPhysicsWorld();
        },

        getPhysicsInitialized: () => {
            return manager.getPhysicsInitialized();
        },

        resetPhysicsWorld: () => {
            update((currentManager) => {
                currentManager.resetPhysicsWorld();
                return currentManager;
            });
        },

        waitForPhysicsInitialization: async () => {
            return manager.waitForPhysicsInitialization();
        },

        getVariables: () => {
            return manager.getVariables();
        },

        // Helper functions
        getObjectById: (id: string) => {
            return manager.getObjectById(id);
        },

        getObjectsByType: <T extends Types.BObject>(type: string): T[] => {
            return manager.getObjectsByType<T>(type);
        },

        getFirstObjectByType: <T extends Types.BObject>(
            type: string
        ): T | undefined => {
            return manager.getFirstObjectByType<T>(type);
        },

        getAllCameras: () => {
            return manager.getAllCameras();
        },

        getAllLights: () => {
            return manager.getAllLights();
        },

        getAllParts: () => {
            return manager.getAllParts();
        },

        getAllScripts: () => {
            return manager.getAllScripts();
        },

        getActiveCamera: () => {
            return manager.getActiveCamera();
        },

        setActiveCamera: (cameraId: string) => {
            update((currentManager) => {
                currentManager.setActiveCamera(cameraId);
                return currentManager;
            });
        },

        getChildrenOf: (parentId: string) => {
            return manager.getChildrenOf(parentId);
        },

        getRootObjects: () => {
            return manager.getRootObjects();
        },

        // Scene serialization methods
        clearScene: () => {
            manager.clearScene();
        },

        serialize: () => {
            return manager.serialize();
        },

        deserialize: (data: any) => {
            manager.deserialize(data);
        },
    };
}

// Export a single instance of the store
export const sceneStore = createSceneStore();
