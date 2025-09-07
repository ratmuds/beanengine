// src/lib/materialStore.ts
import { writable } from "svelte/store";
import { BMaterial } from "$lib/types";

class MaterialManager {
    public materials: Map<string, BMaterial>;

    constructor() {
        this.materials = new Map();

        // Initialize built-in materials
        this.initializeBuiltInMaterials();
    }

    async initializeBuiltInMaterials() {
        let plastic = await this.addMaterial("Plastic", "basic");
        this.updateMaterialProperty(plastic.id, {
            builtin: true,
            textures: {
                albedo: "/materials/prototype/albedo.png",
                normal: "",
                metallic: "",
                roughness: "",
                ao: "",
            },
        });

        this.addMaterial("Test", "basic");
    }

    async addMaterial(name: string, type: "basic" | "pbr"): Promise<BMaterial> {
        const material = new BMaterial(name, type);
        this.materials.set(material.id, material);
        return material;
    }

    removeMaterial(materialId: string): boolean {
        const material = this.materials.get(materialId);
        if (!material) return false;

        this.materials.delete(materialId);
        return true;
    }

    getMaterial(materialId: string): BMaterial | undefined {
        return this.materials.get(materialId);
    }

    getAllMaterials(): BMaterial[] {
        return Array.from(this.materials.values());
    }

    updateMaterial(material: BMaterial): boolean {
        if (!this.materials.has(material.id)) {
            return false;
        }
        this.materials.set(material.id, material);
        return true;
    }

    updateMaterialProperty(
        materialId: string,
        updates: Partial<BMaterial>
    ): boolean {
        const material = this.getMaterial(materialId);
        if (!material) return false;

        // Apply updates to the material
        Object.assign(material, updates);

        const success = this.updateMaterial(material);

        return success;
    }
}

// Create reactive store
function createMaterialStore() {
    const manager = new MaterialManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        addMaterial: async (name: string, type: "basic" | "pbr") => {
            const material = await manager.addMaterial(name, type);
            update((m) => m);
            return material;
        },

        removeMaterial: (materialId: string) => {
            const success = manager.removeMaterial(materialId);
            if (success) {
                update((m) => m);
            }
            return success;
        },

        getMaterial: (materialId: string) => {
            return manager.getMaterial(materialId);
        },

        getAllMaterials: () => {
            return manager.getAllMaterials();
        },

        updateMaterial: (material: BMaterial) => {
            const success = manager.updateMaterial(material);
            if (success) {
                update((m) => m);
            }
            return success;
        },

        updateMaterialProperty: (
            materialId: string,
            updates: Partial<BMaterial>
        ) => {
            const material = manager.getMaterial(materialId);
            if (!material) return false;

            // Apply updates to the material
            Object.assign(material, updates);

            const success = manager.updateMaterial(material);
            if (success) {
                update((m) => m);
            }
            return success;
        },
    };
}

export const materialStore = createMaterialStore();
export { MaterialManager };
