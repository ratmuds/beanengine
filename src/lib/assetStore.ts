// src/lib/assetStore.ts
import { writable } from 'svelte/store';
import { BAsset, type AssetType } from '$lib/types';

class AssetManager {
    public assets: Map<string, BAsset>;

    constructor() {
        this.assets = new Map();
    }

    async addAsset(file: File, type?: AssetType): Promise<BAsset> {
        const asset = new BAsset(file, type);
        this.assets.set(asset.metadata.id, asset);
        return asset;
    }

    removeAsset(assetId: string): boolean {
        const asset = this.assets.get(assetId);
        if (!asset) return false;
        
        asset.dispose();
        this.assets.delete(assetId);
        return true;
    }

    getAsset(assetId: string): BAsset | undefined {
        return this.assets.get(assetId);
    }

    getAllAssets(): BAsset[] {
        return Array.from(this.assets.values());
    }
}

// Create reactive store
function createAssetStore() {
    const manager = new AssetManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        addAsset: async (file: File, type?: AssetType) => {
            const asset = await manager.addAsset(file, type);
            update(m => m);
            return asset;
        },

        removeAsset: (assetId: string) => {
            const success = manager.removeAsset(assetId);
            if (success) {
                update(m => m);
            }
            return success;
        },

        getAsset: (assetId: string) => {
            return manager.getAsset(assetId);
        },

        getAllAssets: () => {
            return manager.getAllAssets();
        }
    };
}

export const assetStore = createAssetStore();
export { AssetManager };