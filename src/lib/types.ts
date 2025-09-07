// src/lib/types.ts
// This file defines the types used in Bean Engine.

import { nanoid } from "nanoid";

// Scene class to manage objects in the scene
class BScene {
    objects: BObject[]; // All objects in the scene
    children: BObject[]; // Direct children of the scene

    constructor() {
        this.objects = [];
        this.children = [];
    }

    addObject(object: BObject) {
        this.objects = [...this.objects, object];
        this.children = [...this.children, object];
    }

    removeObject(object: BObject) {
        this.objects = this.objects.filter((obj) => obj !== object);
        this.children = this.children.filter((child) => child !== object);
    }
}

// Base class for objects
class BObject {
    name: string;
    id: string;
    type: string;
    parent: BObject | null;
    children: BObject[];

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        this.name = name ? name : "Object";
        this.id = id ? id : nanoid();
        this.type = "object";
        this.parent = parent;
        this.children = [];
    }

    addChild(child: BObject) {
        if (this.children.includes(child)) {
            console.warn("Child already exists in this object.");
            return;
        }

        if (child.parent) {
            child.parent.removeChild(child); // Remove from old parent
        }

        this.children.push(child);
        child.parent = this;
    }

    removeChild(child: BObject) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    getSiblings() {
        if (!this.parent) return [];
        return this.parent.children.filter((child) => child !== this);
    }

    getDescendants() {
        let descendants: BObject[] = [];
        for (const child of this.children) {
            descendants.push(child);
            descendants = descendants.concat(child.getDescendants());
        }
        return descendants;
    }

    isDescendantOf(ancestor: BObject): boolean {
        let current: BObject | null = this.parent;
        while (current) {
            if (current === ancestor) return true;
            current = current.parent;
        }
        return false;
    }
}

// --- Core 3D Types ---

// Represents a 3D vector
class BVector3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Clone method to create a new instance with the same values
    clone(): BVector3 {
        return new BVector3(this.x, this.y, this.z);
    }
}

// Represents a rotation in 3D space
class BQuaternion {
    x: number;
    y: number;
    z: number;
    w: number;

    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    // Clone method to create a new instance with the same values
    clone(): BQuaternion {
        return new BQuaternion(this.x, this.y, this.z, this.w);
    }
}

// --- Scene Object Hierarchy ---

// Base class for any object with a 3D transform
class BNode3D extends BObject {
    // Local transform (relative to parent)
    position: BVector3;
    rotation: BVector3;
    scale: BVector3;

    positionOffset: BVector3;
    rotationOffset: BVector3;

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "node3d";
        this.position = new BVector3();
        this.rotation = new BVector3();
        this.scale = new BVector3(1, 1, 1);
        this.positionOffset = new BVector3();
        this.rotationOffset = new BVector3();
    }

    // Get world position (absolute position in scene)
    getWorldPosition(): BVector3 {
        if (!this.parent || !(this.parent instanceof BNode3D)) {
            return new BVector3(
                this.position.x,
                this.position.y,
                this.position.z
            );
        }

        const parentWorldPos = this.parent.getWorldPosition();
        // Simplified - in a real engine you'd apply rotation/scale transforms too
        return new BVector3(
            parentWorldPos.x + this.position.x,
            parentWorldPos.y + this.position.y,
            parentWorldPos.z + this.position.z
        );
    }

    // Set world position (converts to local position automatically)
    setWorldPosition(worldPos: BVector3): void {
        if (!this.parent || !(this.parent instanceof BNode3D)) {
            this.position = new BVector3(worldPos.x, worldPos.y, worldPos.z);
            return;
        }

        const parentWorldPos = this.parent.getWorldPosition();
        this.position = new BVector3(
            worldPos.x - parentWorldPos.x,
            worldPos.y - parentWorldPos.y,
            worldPos.z - parentWorldPos.z
        );
    }

    // Get all descendants that are also BNode3D (have transforms)
    getNode3DChildren(): BNode3D[] {
        return this.children.filter(
            (child) => child instanceof BNode3D
        ) as BNode3D[];
    }

    clone(): BNode3D {
        const cloned = new BNode3D(this.name, null, null);
        cloned.position = this.position.clone();
        cloned.rotation = this.rotation.clone();
        cloned.scale = this.scale.clone();
        cloned.positionOffset = this.positionOffset.clone();
        cloned.rotationOffset = this.rotationOffset.clone();
        return cloned;
    }
}

// Available primitive mesh types
type PrimitiveMeshType =
    | "block"
    | "sphere"
    | "cylinder"
    | "cone"
    | "plane"
    | "wedge";

// Mesh source configuration
interface MeshSource {
    type: "primitive" | "asset";
    value: string; // primitive name or asset ID
}

// Represents a physical part in the scene
class BPart extends BNode3D {
    meshSource: MeshSource; // Mesh selection (primitive or asset)
    color: string;
    material: string;
    transparency: number;
    castShadows: boolean;
    receiveShadows: boolean;
    visible: boolean;

    axisLockPosX: boolean;
    axisLockPosY: boolean;
    axisLockPosZ: boolean;
    axisLockRotX: boolean;
    axisLockRotY: boolean;
    axisLockRotZ: boolean;

    canTouch: boolean;
    canCollide: boolean;
    canQuery: boolean;

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "part";

        this.meshSource = { type: "primitive", value: "block" };
        this.color = "#ffffff";
        this.material = "plastic";
        this.transparency = 0;
        this.castShadows = true;
        this.receiveShadows = true;
        this.visible = true;
        this.axisLockPosX = false;
        this.axisLockPosY = false;
        this.axisLockPosZ = false;
        this.axisLockRotX = false;
        this.axisLockRotY = false;
        this.axisLockRotZ = false;
        this.canTouch = true;
        this.canCollide = true;
        this.canQuery = true;
    }

    // Set mesh to a primitive type
    setPrimitiveMesh(primitive: PrimitiveMeshType) {
        this.meshSource = { type: "primitive", value: primitive };
    }

    // Set mesh to an asset from the asset store
    setAssetMesh(assetId: string) {
        this.meshSource = { type: "asset", value: assetId };
    }

    // Get the effective mesh source as a string for display
    getEffectiveMeshSource(): string {
        if (this.meshSource.type === "primitive") {
            return `Primitive: ${this.meshSource.value}`;
        }
        return `Asset: ${this.meshSource.value}`;
    }

    // Check if using a primitive mesh
    isPrimitiveMesh(): boolean {
        return this.meshSource.type === "primitive";
    }

    // Check if using an asset mesh
    isAssetMesh(): boolean {
        return this.meshSource.type === "asset";
    }

    clone(): BPart {
        // Create a fresh instance so we keep the prototype (and therefore all methods)
        const cloned = new BPart(this.name, this.id, this.parent);

        // Shallow-copy all enumerable own properties (cheap and covers new fields automatically)
        Object.assign(cloned, this);

        // Deep-clone transform-related value objects to avoid shared references
        cloned.position = this.position.clone();
        cloned.rotation = this.rotation.clone();
        cloned.scale = this.scale.clone();
        cloned.positionOffset = this.positionOffset.clone();
        cloned.rotationOffset = this.rotationOffset.clone();

        // Clone meshSource so modifications on the clone don’t mutate original
        cloned.meshSource = { ...this.meshSource };

        return cloned;
    }
}

// Represents a light source in the scene
class BLight extends BNode3D {
    color: string; // e.g., '#ffffff'
    intensity: number;

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "light";
        this.color = "#ffffff";
        this.intensity = 1.0;
    }
}

// Represents a constraint between two physical objects
class BConstraint extends BObject {
    partA: BPart;
    partB: BPart;

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null,
        partA: BPart,
        partB: BPart
    ) {
        super(name, id, parent);
        this.type = "constraint";
        this.partA = partA;
        this.partB = partB;
    }
}

// Represents a camera in the scene
class BCamera extends BNode3D {
    fieldOfView: number; // Field of view in degrees
    nearClipPlane: number; // Near clipping plane distance
    farClipPlane: number; // Far clipping plane distance
    projectionType: "perspective" | "orthographic";
    orthographicSize: number; // Size for orthographic projection
    aspectRatio: number; // Aspect ratio (width/height)

    // Camera-specific settings
    isActive: boolean; // Whether this camera is currently active
    clearColor: string; // Background clear color
    clearFlags: "skybox" | "solid_color" | "depth_only";

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name ? name : "Camera", id, parent);
        this.type = "camera";

        // Default camera settings
        this.fieldOfView = 90;
        this.nearClipPlane = 0.1;
        this.farClipPlane = 1000;
        this.projectionType = "perspective";
        this.orthographicSize = 5;
        this.aspectRatio = 16 / 9;

        this.isActive = false;
        this.clearColor = "#87CEEB"; // Sky blue
        this.clearFlags = "solid_color";
    }

    // Set as perspective camera
    setPerspective(fov: number, near: number, far: number) {
        this.projectionType = "perspective";
        this.fieldOfView = fov;
        this.nearClipPlane = near;
        this.farClipPlane = far;
    }

    // Set as orthographic camera
    setOrthographic(size: number, near: number, far: number) {
        this.projectionType = "orthographic";
        this.orthographicSize = size;
        this.nearClipPlane = near;
        this.farClipPlane = far;
    }
}

// Script (contains code omg no way)
class BScript extends BObject {
    code: any[];

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name ? name : "Script", id, parent);
        this.type = "script";
        this.code = [];
    }
}

// --- Asset Management System ---

// Supported asset types
type AssetType = "mesh" | "texture" | "audio" | "material" | "script" | "other";

// Asset metadata interface
interface BAssetMetadata {
    id: string;
    name: string;
    type: AssetType;
    fileType: string; // e.g., 'gltf', 'png', 'mp3'
    size: number; // file size in bytes
    uploadedAt: Date;
    tags: string[];
    description?: string;
    thumbnailUrl?: string; // for preview images
}

// Asset data container
class BAsset {
    metadata: BAssetMetadata;
    data: File | ArrayBuffer | string; // The actual asset data
    url?: string; // Object URL for browser access

    constructor(file: File, type?: AssetType) {
        this.data = file;
        this.metadata = {
            id: nanoid(),
            name: file.name,
            type: type || this.inferAssetType(file),
            fileType: this.getFileExtension(file.name),
            size: file.size,
            uploadedAt: new Date(),
            tags: [],
            description: "",
        };

        // Create object URL for browser access
        this.url = URL.createObjectURL(file);
    }

    private inferAssetType(file: File): AssetType {
        const extension = this.getFileExtension(file.name).toLowerCase();

        // 3D Mesh formats
        if (["gltf", "glb", "obj", "fbx", "dae", "ply"].includes(extension)) {
            return "mesh";
        }

        // Texture formats
        if (
            ["png", "jpg", "jpeg", "gif", "bmp", "tga", "webp"].includes(
                extension
            )
        ) {
            return "texture";
        }

        // Audio formats
        if (["mp3", "wav", "ogg", "flac", "m4a"].includes(extension)) {
            return "audio";
        }

        // Material files
        if (["mtl", "mat"].includes(extension)) {
            return "material";
        }

        // Script files
        if (["js", "ts", "lua", "py"].includes(extension)) {
            return "script";
        }

        return "other";
    }

    private getFileExtension(filename: string): string {
        return filename.split(".").pop() || "";
    }

    // Clean up object URL when asset is removed
    dispose() {
        if (this.url) {
            URL.revokeObjectURL(this.url);
            this.url = undefined;
        }
    }

    // Update metadata
    updateMetadata(updates: Partial<BAssetMetadata>) {
        this.metadata = { ...this.metadata, ...updates };
    }

    // Check if asset matches search query
    matchesSearch(query: string): boolean {
        const searchLower = query.toLowerCase();
        return (
            this.metadata.name.toLowerCase().includes(searchLower) ||
            this.metadata.type.toLowerCase().includes(searchLower) ||
            this.metadata.fileType.toLowerCase().includes(searchLower) ||
            this.metadata.tags.some((tag) =>
                tag.toLowerCase().includes(searchLower)
            ) ||
            (this.metadata.description?.toLowerCase().includes(searchLower) ??
                false)
        );
    }
}

// Asset collection for organizing assets
class BAssetCollection {
    id: string;
    name: string;
    description: string;
    assetIds: string[];
    createdAt: Date;

    constructor(name: string, description = "") {
        this.id = nanoid();
        this.name = name;
        this.description = description;
        this.assetIds = [];
        this.createdAt = new Date();
    }

    addAsset(assetId: string) {
        if (!this.assetIds.includes(assetId)) {
            this.assetIds.push(assetId);
        }
    }

    removeAsset(assetId: string) {
        this.assetIds = this.assetIds.filter((id) => id !== assetId);
    }
}

class BMaterial {
    id: string;
    name: string;
    type: "basic" | "pbr";
    color: string; // Color (default white)
    builtin: boolean; // If this material is provided by the engine
    textures: {
        // Asset ids (some optional)
        albedo: string; // Albedo texture (required)
        normal: string; // Normal map
        metallic: string; // Metallic texture
        roughness: string; // Roughness texture
        ao: string; // Ambient occlusion texture
        emission: string; // Emission texture
    };

    constructor(name: string, type: "basic" | "pbr") {
        this.id = nanoid();
        this.name = name;
        this.type = type;
        this.color = "#ffffff";
        this.builtin = false;
        this.textures = {
            albedo: "",
            normal: "",
            metallic: "",
            roughness: "",
            ao: "",
            emission: "",
        };
        this.threeTexture = null;
    }
}

// Export all classes
export {
    BScene,
    BObject,
    BVector3,
    BNode3D,
    BPart,
    BCamera,
    BLight,
    BConstraint,
    BScript,
    BAsset,
    BAssetCollection,
    BMaterial,
    type AssetType,
    type BAssetMetadata,
    type PrimitiveMeshType,
    type MeshSource,
};
