// src/lib/sceneStore.ts
import { writable } from "svelte/store";
import * as Types from "$lib/types";

class SceneManager {
    public scene: Types.BScene;
    public variables: Array<{ name: string; value: any; type: string }>;

    constructor(scene?: Types.BScene) {
        this.scene = scene || new Types.BScene();
        this.variables = [];
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
            case 'part':
                newObject = new Types.BPart(name, null, null);
                if (newObject instanceof Types.BPart) {
                    newObject.position = options?.position || new Types.BVector3(0, 0, 0);
                    newObject.scale = new Types.BVector3(1, 1, 1);
                }
                break;
            case 'mesh':
                newObject = new Types.BPart(name, null, null);
                if (newObject instanceof Types.BPart) {
                    newObject.position = options?.position || new Types.BVector3(0, 0, 0);
                    newObject.scale = new Types.BVector3(1, 1, 1);
                    // Set mesh from asset if provided
                    if (options?.assetId) {
                        newObject.setAssetMesh(options.assetId);
                    }
                }
                break;
            case 'camera':
                newObject = new Types.BCamera(name, null, null);
                if (newObject instanceof Types.BCamera) {
                    newObject.position = options?.position || new Types.BVector3(0, 5, 10);
                    if (options?.fieldOfView) newObject.fieldOfView = options.fieldOfView;
                    if (options?.isActive) newObject.isActive = options.isActive;
                }
                break;
            case 'light':
                newObject = new Types.BLight(name, null, null);
                if (newObject instanceof Types.BLight) {
                    newObject.position = options?.position || new Types.BVector3(0, 10, 0);
                    if (options?.color) newObject.color = options.color;
                    if (options?.intensity) newObject.intensity = options.intensity;
                }
                break;
            case 'script':
                newObject = new Types.BScript(name, null, null);
                break;
            default:
                console.warn(`Unknown object type: ${objectType}`);
                newObject = new Types.BObject(name, null, null);
                break;
        }

        // Set parent if provided
        if (parentId) {
            newObject.parent = parentId;
        }

        this.scene.addObject(newObject);
        return newObject;
    }

    private generateObjectName(objectType: string): string {
        const typeCount = this.scene.objects.filter((obj) =>
            obj.type === objectType.toLowerCase()
        ).length;
        const capitalizedType = objectType.charAt(0).toUpperCase() + objectType.slice(1);
        return `${capitalizedType}${typeCount + 1}`;
    }

    // Convenience methods for backward compatibility and common use cases
    createPartInFrontOfCamera(
        parentId: string | number,
        position?: Types.BVector3
    ): Types.BPart {
        return this.createObject('part', parentId, { position }) as Types.BPart;
    }

    createScript(parentId: string | number): Types.BScript {
        return this.createObject('script', parentId) as Types.BScript;
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
        const objectToReparent = this.scene.objects.find(obj => obj.id === objectId);
        if (!objectToReparent) {
            console.warn("Object to reparent not found:", objectId);
            return;
        }

        // If newParentId is -1, set parent to null (make it root)
        if (newParentId === -1) {
            objectToReparent.parent = null;
        } else {
            // Find the new parent object
            const newParent = this.scene.objects.find(obj => obj.id === newParentId);
            if (!newParent) {
                console.warn("New parent object not found:", newParentId);
                return;
            }
            objectToReparent.parent = newParentId;
        }

        // Trigger reactivity by creating a new array
        this.scene.objects = [...this.scene.objects];
    }

    getScene(): Types.BScene {
        return this.scene;
    }

    setVariables(variables: Array<{ name: string; value: any; type: string }>) {
        console.log('[SceneStore] Setting variables:', variables);
        this.variables = variables;
    }

    updateVariable(name: string, value: any) {
        const variable = this.variables.find(v => v.name === name);
        if (variable) {
            console.log(`[SceneStore] Updating variable '${name}':`, variable.value, '->', value);
            variable.value = value;
        } else {
            console.log(`[SceneStore] Adding new variable '${name}':`, value);
            this.variables.push({ name, value, type: typeof value });
        }
    }

    getVariables(): Array<{ name: string; value: any; type: string }> {
        console.log('[SceneStore] Getting variables:', this.variables);
        return this.variables;
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

        setVariables: (variables: Array<{ name: string; value: any; type: string }>) => {
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

        getVariables: () => {
            return manager.getVariables();
        },
    };
}

// Export a single instance of the store
export const sceneStore = createSceneStore();
