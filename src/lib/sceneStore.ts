// src/lib/sceneStore.ts
import { writable } from "svelte/store";
import * as Types from "$lib/types";

class SceneManager {
    public scene: Types.BScene;

    constructor(scene?: Types.BScene) {
        this.scene = scene || new Types.BScene();
    }

    createPartInFrontOfCamera(
        parentId: string | number,
        position?: Types.BVector3
    ): Types.BPart {
        const partCount = this.scene.objects.filter((obj) =>
            obj.name.startsWith("Part")
        ).length;
        const partName = `Part${partCount + 1}`;

        const newPart = new Types.BPart(partName, null, null);
        newPart.position = position ? position : new Types.BVector3(0, 0, 0);
        newPart.scale = new Types.BVector3(1, 1, 1);

        // Set parent if provided
        if (parentId) {
            newPart.parent = parentId;
        }

        this.scene.addObject(newPart);

        return newPart;
    }

    createScript(parentId: string | number) {
        const newScript = new Types.BScript(null, null);

        // Set parent if provided
        if (parentId) {
            newScript.parent = parentId;
        }

        this.scene.addObject(newScript);

        return newScript;
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

        // This method will now update the store, making it reactive
        createPartInFrontOfCamera: (
            parentId: string | number,
            position?: Types.BVector3
        ) => {
            update((currentManager) => {
                currentManager.createPartInFrontOfCamera(parentId, position);
                // Return the same manager - update() call triggers reactivity
                return currentManager;
            });
        },

        createScript: (parentId: string | number) => {
            update((currentManager) => {
                currentManager.createScript(parentId);
                // Return the same manager - update() call triggers reactivity
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

        getScene: () => {
            return manager.getScene();
        },
    };
}

// Export a single instance of the store
export const sceneStore = createSceneStore();
