// src/lib/assetStore.ts
import { writable } from "svelte/store";
import { BAsset, type AssetType } from "$lib/types";
import { supabase, auth } from "$lib/supabase";
import { runtimeStore } from "./runtimeStore";

class AssetManager {
    public assets: Map<string, BAsset>;

    constructor() {
        this.assets = new Map();
    }

    async addAsset(file: File, type?: AssetType): Promise<BAsset> {
        const asset = new BAsset(file, type);
        // Attempt upload to Supabase Storage and store public URL
        try {
            const { user } = (await auth.getUser()) as unknown as {
                user: { id: string } | null;
            };
            const userId = user?.id || "public";
            const bucket = "assets";
            const ext = asset.metadata.fileType || "bin";
            const path = `${userId}/${asset.metadata.id}.${ext}`;

            console.log(`[AssetStore] Uploading asset to Supabase: ${path}`);
            console.log(user, userId);

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                });
            if (uploadError) {
                // Fall back to object URL, but keep working locally
                runtimeStore.warn(
                    `[AssetStore] Upload failed, using local URL: ${
                        uploadError.message ?? uploadError
                    }`
                );
            } else {
                const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(path);
                if (data?.publicUrl) {
                    asset.url = data.publicUrl;
                }
            }
        } catch {
            runtimeStore.warn(
                "[AssetStore] Unexpected error uploading to Supabase"
            );
        }

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

    // Remove all assets (disposes object URLs)
    clearAll(): void {
        for (const asset of this.assets.values()) {
            asset.dispose();
        }
        this.assets.clear();
    }

    // Import asset metadata (no file data). Creates placeholder files and preserves IDs.
    importAssets(
        serialized: Array<{
            id: string;
            name: string;
            type: AssetType;
            fileType: string;
            size: number;
            uploadedAt: string | Date;
            tags: string[];
            description?: string;
            thumbnailUrl?: string;
            url?: string;
        }>
    ): void {
        for (const meta of serialized) {
            const asset = Object.create(BAsset.prototype) as BAsset;
            asset.data = "" as unknown as File;
            asset.url = meta.url;
            asset.metadata = {
                id: meta.id,
                name: meta.name,
                type: meta.type,
                fileType: meta.fileType,
                size: meta.size,
                uploadedAt: new Date(meta.uploadedAt),
                tags: meta.tags || [],
                description: meta.description || "",
                thumbnailUrl: meta.thumbnailUrl,
            };
            this.assets.set(asset.metadata.id, asset);
        }
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
            update((m) => m);
            return asset;
        },

        removeAsset: (assetId: string) => {
            const success = manager.removeAsset(assetId);
            if (success) {
                update((m) => m);
            }
            return success;
        },

        getAsset: (assetId: string) => {
            return manager.getAsset(assetId);
        },

        getAllAssets: () => {
            return manager.getAllAssets();
        },

        // Wipes all assets
        clearAll: () => {
            manager.clearAll();
            update((m) => m);
        },

        // Import a list of asset metadata entries
        importAssets: (
            serialized: Array<{
                id: string;
                name: string;
                type: AssetType;
                fileType: string;
                size: number;
                uploadedAt: string | Date;
                tags: string[];
                description?: string;
                thumbnailUrl?: string;
            }>
        ) => {
            manager.importAssets(serialized);
            update((m) => m);
        },
    };
}

export const assetStore = createAssetStore();
export { AssetManager };
