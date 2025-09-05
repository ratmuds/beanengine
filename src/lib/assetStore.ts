// src/lib/assetStore.ts
import { writable } from 'svelte/store';
import { BAsset, BAssetCollection, type AssetType } from '$lib/types';

class AssetManager {
    public assets: Map<string, BAsset>;
    public collections: Map<string, BAssetCollection>;
    public searchQuery: string;
    public selectedAssetIds: Set<string>;
    public filterType: AssetType | 'all';

    constructor() {
        this.assets = new Map();
        this.collections = new Map();
        this.searchQuery = '';
        this.selectedAssetIds = new Set();
        this.filterType = 'all';
        
        // Create default collections
        this.createCollection('Meshes', '3D models and geometry');
        this.createCollection('Textures', 'Images and materials');
        this.createCollection('Audio', 'Sound effects and music');
    }

    // Asset management
    async addAsset(file: File, type?: AssetType): Promise<BAsset> {
        const asset = new BAsset(file, type);
        this.assets.set(asset.metadata.id, asset);
        
        // Auto-add to appropriate collection
        const collectionName = this.getDefaultCollectionName(asset.metadata.type);
        const collection = Array.from(this.collections.values())
            .find(c => c.name === collectionName);

        if (collection) {
            collection.addAsset(asset.metadata.id);
        } else {
            console.warn(`No collection found for asset type: ${asset.metadata.type}`);
        }
        
        return asset;
    }

    removeAsset(assetId: string): boolean {
        const asset = this.assets.get(assetId);
        if (!asset) return false;
        
        // Clean up object URL
        asset.dispose();
        
        // Remove from all collections
        this.collections.forEach(collection => {
            collection.removeAsset(assetId);
        });
        
        // Remove from assets
        this.assets.delete(assetId);
        
        // Remove from selection
        this.selectedAssetIds.delete(assetId);
        
        return true;
    }

    getAsset(assetId: string): BAsset | undefined {
        return this.assets.get(assetId);
    }

    getAllAssets(): BAsset[] {
        return Array.from(this.assets.values());
    }

    // Search and filtering
    getFilteredAssets(): BAsset[] {
        let assets = this.getAllAssets();
        
        // Apply type filter
        if (this.filterType !== 'all') {
            assets = assets.filter(asset => asset.metadata.type === this.filterType);
        }
        
        // Apply search query
        if (this.searchQuery.trim()) {
            assets = assets.filter(asset => asset.matchesSearch(this.searchQuery));
        }
        
        // Sort by upload date (newest first)
        assets.sort((a, b) => b.metadata.uploadedAt.getTime() - a.metadata.uploadedAt.getTime());
        
        return assets;
    }

    setSearchQuery(query: string) {
        this.searchQuery = query;
    }

    setFilterType(type: AssetType | 'all') {
        this.filterType = type;
    }

    // Selection management
    selectAsset(assetId: string, multiSelect = false) {
        if (!multiSelect) {
            this.selectedAssetIds.clear();
        }
        this.selectedAssetIds.add(assetId);
    }

    deselectAsset(assetId: string) {
        this.selectedAssetIds.delete(assetId);
    }

    clearSelection() {
        this.selectedAssetIds.clear();
    }

    getSelectedAssets(): BAsset[] {
        return Array.from(this.selectedAssetIds)
            .map(id => this.assets.get(id))
            .filter(asset => asset !== undefined) as BAsset[];
    }

    // Collection management
    createCollection(name: string, description = ''): BAssetCollection {
        const collection = new BAssetCollection(name, description);
        this.collections.set(collection.id, collection);
        return collection;
    }

    removeCollection(collectionId: string): boolean {
        return this.collections.delete(collectionId);
    }

    getCollection(collectionId: string): BAssetCollection | undefined {
        return this.collections.get(collectionId);
    }

    getAllCollections(): BAssetCollection[] {
        return Array.from(this.collections.values());
    }

    addAssetToCollection(assetId: string, collectionId: string) {
        const collection = this.collections.get(collectionId);
        if (collection && this.assets.has(assetId)) {
            collection.addAsset(assetId);
        }
    }

    // Utility methods
    private getDefaultCollectionName(type: AssetType): string {
        switch (type) {
            case 'mesh': return 'Meshes';
            case 'texture': return 'Textures';
            case 'audio': return 'Audio';
            default: return 'Other';
        }
    }

    // Get asset statistics
    getStats() {
        const stats = {
            total: this.assets.size,
            byType: {} as Record<AssetType | 'other', number>,
            totalSize: 0
        };
        
        this.assets.forEach(asset => {
            const type = asset.metadata.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.totalSize += asset.metadata.size;
        });
        
        return stats;
    }

    // Bulk operations
    async addMultipleAssets(files: FileList): Promise<BAsset[]> {
        const assets: BAsset[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const asset = await this.addAsset(file);
                assets.push(asset);
            } catch (error) {
                console.error(`Failed to add asset ${file.name}:`, error);
            }
        }
        
        return assets;
    }

    removeSelectedAssets(): number {
        const removedCount = this.selectedAssetIds.size;
        this.selectedAssetIds.forEach(assetId => {
            this.removeAsset(assetId);
        });
        this.selectedAssetIds.clear();
        return removedCount;
    }
}

// Create reactive store
function createAssetStore() {
    const manager = new AssetManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        // Asset operations
        addAsset: async (file: File, type?: AssetType) => {
            const asset = await manager.addAsset(file, type);
            update(m => m); // Trigger reactivity
            return asset;
        },

        addMultipleAssets: async (files: FileList) => {
            const assets = await manager.addMultipleAssets(files);
            update(m => m); // Trigger reactivity
            return assets;
        },

        removeAsset: (assetId: string) => {
            const success = manager.removeAsset(assetId);
            if (success) {
                update(m => m); // Trigger reactivity
            }
            return success;
        },

        removeSelectedAssets: () => {
            const count = manager.removeSelectedAssets();
            if (count > 0) {
                update(m => m); // Trigger reactivity
            }
            return count;
        },

        getAsset: (assetId: string) => {
            return manager.getAsset(assetId);
        },

        // Search and filtering
        setSearchQuery: (query: string) => {
            manager.setSearchQuery(query);
            update(m => m); // Trigger reactivity
        },

        setFilterType: (type: AssetType | 'all') => {
            manager.setFilterType(type);
            update(m => m); // Trigger reactivity
        },

        // Selection
        selectAsset: (assetId: string, multiSelect = false) => {
            manager.selectAsset(assetId, multiSelect);
            update(m => m); // Trigger reactivity
        },

        deselectAsset: (assetId: string) => {
            manager.deselectAsset(assetId);
            update(m => m); // Trigger reactivity
        },

        clearSelection: () => {
            manager.clearSelection();
            update(m => m); // Trigger reactivity
        },

        // Collection operations
        createCollection: (name: string, description = '') => {
            const collection = manager.createCollection(name, description);
            update(m => m); // Trigger reactivity
            return collection;
        },

        removeCollection: (collectionId: string) => {
            const success = manager.removeCollection(collectionId);
            if (success) {
                update(m => m); // Trigger reactivity
            }
            return success;
        },

        addAssetToCollection: (assetId: string, collectionId: string) => {
            manager.addAssetToCollection(assetId, collectionId);
            update(m => m); // Trigger reactivity
        }
    };
}

// Export the store instance
export const assetStore = createAssetStore();
export { AssetManager };