// src/lib/sceneStore.ts
import { writable } from "svelte/store";
import * as Types from "$lib/types";

class SceneManager {
    public scene: Types.BScene;

    constructor(scene?: Types.BScene) {
        this.scene = scene || new Types.BScene();
    }

    // This method now returns the new part for convenience
    createPartInFrontOfCamera(): Types.BPart {
        const partCount = this.scene.objects.filter((obj) =>
            obj.name.startsWith("Part")
        ).length;
        const partName = `Part${partCount + 1}`;

        const newPart = new Types.BPart(partName, null, null);
        newPart.position = new Types.BVector3(0, 0, 0);
        newPart.scale = new Types.BVector3(1, 1, 1);

        this.scene.addObject(newPart);

        return newPart;
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
            // Create a new array to trigger reactivity
            this.scene.objects = [
                ...this.scene.objects.slice(0, index),
                object,
                ...this.scene.objects.slice(index + 1),
            ];
        } else {
            console.warn("Object not found:", object.id);
        }
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
        createPartInFrontOfCamera: () => {
            update((currentManager) => {
                currentManager.createPartInFrontOfCamera();
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

        triggerReactivity: () => {
            update((currentManager) => {
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
