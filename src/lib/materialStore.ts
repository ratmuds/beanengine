// src/lib/materialStore.ts
import { writable } from "svelte/store";
import { BMaterial } from "$lib/types";
import { runtimeStore } from "./runtimeStore";
import * as THREE from 'three';

class MaterialManager {
    public materials: Map<string, BMaterial>;
    private threeTextureLoader: THREE.TextureLoader = new THREE.TextureLoader();

    constructor() {
        this.materials = new Map();

        // Initialize built-in materials
        this.initializeBuiltInMaterials();

        setTimeout(() => {
            console.log(this.getAllMaterials());
        }, 1000);
    }

    async initializeBuiltInMaterials() {
        const plastic = await this.addMaterial("Plastic", true);
        this.updateMaterialProperty(plastic.id, {
            textures: {
                color: "/materials/prototype/albedo.png",
                displacement: "",
                normal: "",
                roughness: "",
                metallic: "",
            },
        });
    }

    async addMaterial(name: string, builtin: boolean, type: string = "basic"): Promise<BMaterial> {
        const material = new BMaterial(name, type);

        if (builtin) {
            material.builtin = true;
            material.id = "builtin_" + name.toLowerCase();

            console.log("ADDED BUILTIN MATERIAL", material.id);
        }

        this.materials.set(material.id, material);

        return material;
    }

    async loadAllMaterials(): Promise<void> {
        runtimeStore.info("Loading all materials...");
        for (const material of this.materials.values()) {
            runtimeStore.info(`Loading material: ${material.name}`);
            await this.loadMaterial(material);
        }
    }

    private async loadMaterial(material: BMaterial): Promise<THREE.Material> {
        // Intialize material
        const threeMaterial = new THREE.MeshStandardMaterial({});

        if (material.textures.color) {
            try {
                const texture = await this.threeTextureLoader.load(
                    material.textures.color
                );
                threeMaterial.map = texture;
            } catch {
                console.warn(
                    `Failed to load color texture for material ${material.name}`,
                    "MaterialManager"
                );
            }
        } else {
            threeMaterial.color = new THREE.Color(material.color);
        }

        if (material.textures.displacement) {
            try {
                const texture = await this.threeTextureLoader.load(
                    material.textures.displacement
                );
                threeMaterial.displacementMap = texture;
            } catch {
                console.warn(
                    `Failed to load displacement texture for material ${material.name}`,
                    "MaterialManager"
                );
            }
        }

        if (material.textures.normal) {
            try {
                const texture = await this.threeTextureLoader.load(
                    material.textures.normal
                );
                threeMaterial.normalMap = texture;
            } catch {
                console.warn(
                    `Failed to load normal texture for material ${material.name}`,
                    "MaterialManager"
                );
            }
        }

        if (material.textures.roughness) {
            try {
                const texture = await this.threeTextureLoader.load(
                    material.textures.roughness
                );
                threeMaterial.roughnessMap = texture;
            } catch {
                console.warn(
                    `Failed to load roughness texture for material ${material.name}`,
                    "MaterialManager"
                );
            }
        }

        if (material.textures.metallic) {
            try {
                const texture = await this.threeTextureLoader.load(
                    material.textures.metallic
                );
                threeMaterial.metallicMap = texture;
            } catch {
                console.warn(
                    `Failed to load metallic texture for material ${material.name}`,
                    "MaterialManager"
                );
            }
        }

        // Pass the material reference to the BMaterial
        material.threeMaterial = threeMaterial;

        // Now load the Threlte texture (just the color map as this is for viewport and doesn't need everything)
        try {
            const threlteTexture = this.threeTextureLoader.load(
                material.textures.color
            );
            material.threlteTexture = threlteTexture;
        } catch (error) {
            console.warn(
                `Failed to load Threlte texture for material ${material.name}: ${error}`,
                "MaterialManager"
            );
        }
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

    getMaterialByName(name: string): BMaterial | undefined {
        for (const material of this.materials.values()) {
            if (material.name === name) {
                return material;
            }
        }
        return undefined;
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

    // Remove all non-builtin materials
    clearUserMaterials(): void {
        for (const [id, mat] of this.materials) {
            if (!mat.builtin) {
                this.materials.delete(id);
            }
        }
    }

    // Import a list of non-builtin materials
    importMaterials(
        serialized: Array<{
            id: string;
            name: string;
            color: string;
            textures: {
                color: string;
                displacement?: string;
                normal?: string;
                roughness?: string;
                metallic?: string;
            };
        }>
    ): void {
        for (const s of serialized) {
            const mat = new BMaterial(s.name, s.type || "basic");
            mat.id = s.id; // preserve id
            mat.color = s.color || "#ffffff";
            mat.textures = {
                color: s.textures?.color || "",
                displacement: s.textures?.displacement || "",
                normal: s.textures?.normal || "",
                roughness: s.textures?.roughness || "",
                metallic: s.textures?.metallic || "",
            };
            mat.builtin = false;
            this.materials.set(mat.id, mat);
        }
    }
}

// Create reactive store
function createMaterialStore() {
    const manager = new MaterialManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        addMaterial: async (name: string) => {
            const material = await manager.addMaterial(name, false);
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

        loadAllMaterials: async () => {
            await manager.loadAllMaterials();
        },

        getMaterial: (materialId: string) => {
            return manager.getMaterial(materialId);
        },

        getMaterialByName: (name: string) => {
            return manager.getMaterialByName(name);
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

        // Remove all non-builtin materials
        clearUserMaterials: () => {
            manager.clearUserMaterials();
            update((m) => m);
        },

        // Import non-builtin materials
        importMaterials: (
            serialized: Array<{
                id: string;
                name: string;
                color: string;
                textures: {
                    color: string;
                    displacement?: string;
                    normal?: string;
                    roughness?: string;
                    metallic?: string;
                };
            }>
        ) => {
            manager.importMaterials(serialized);
            update((m) => m);
        },
    };
}

export const materialStore = createMaterialStore();
export { MaterialManager };
