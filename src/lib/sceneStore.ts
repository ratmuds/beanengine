// src/lib/sceneStore.ts
import { writable } from "svelte/store";
import * as Types from "$lib/types";
import RAPIER from "@dimforge/rapier3d-compat";

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
            default:
                console.warn(`Unknown object type: ${objectType}`);
                newObject = new Types.BObject(name, null, null);
                break;
        }

        // Set parent if provided
        if (parentId) {
            const parentObject = this.getObjectById(parentId.toString());
            if (parentObject) {
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
    };
}

// Export a single instance of the store
export const sceneStore = createSceneStore();
