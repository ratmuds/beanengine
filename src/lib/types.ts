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
        
        // Create default BStorage container
        const defaultStorage = new BStorage("Storage", null, null);
        this.addObject(defaultStorage);
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

// Storage container for inactive objects (similar to Roblox ReplicatedStorage)
class BStorage extends BObject {
    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "storage";
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

    // Add method to add two vectors
    add(vector: BVector3) {
        this.x = this.x + vector.x;
        this.y = this.y + vector.y;
        this.z = this.z + vector.z;
    }

    // Subtract method to subtract two vectors
    sub(vector: BVector3) {
        this.x = this.x - vector.x;
        this.y = this.y - vector.y;
        this.z = this.z - vector.z;
    }

    // Multiply method to multiply two vectors
    mul(vector: BVector3) {
        this.x = this.x * vector.x;
        this.y = this.y * vector.y;
        this.z = this.z * vector.z;
    }

    // Divide method to divide two vectors
    div(vector: BVector3) {
        this.x = this.x / vector.x;
        this.y = this.y / vector.y;
        this.z = this.z / vector.z;
    }

    // Equals method to check if two vectors are equal
    equals(vector: BVector3): boolean {
        return (
            this.x === vector.x && this.y === vector.y && this.z === vector.z
        );
    }

    // Copy method to copy the vector
    copy(vector: BVector3): BVector3 {
        return new BVector3(vector.x, vector.y, vector.z);
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

    positionLocked: boolean;
    rotationLocked: boolean;

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
        this.positionLocked = false;
        this.rotationLocked = false;
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

// Represents a player controller that extends BPart with movement capabilities
class BPlayerController extends BPart {
    // Movement settings
    moveSpeed: number;
    jumpForce: number;
    mouseSensitivity: number;

    // Camera control settings
    maxLookAngle: number; // Maximum up/down look angle in degrees

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name ? name : "PlayerController", id, parent);
        this.type = "playercontroller";

        // Default movement settings
        this.moveSpeed = 10;
        this.jumpForce = 15;
        this.mouseSensitivity = 0.2; //0.002;
        this.maxLookAngle = 80; // degrees
    }

    clone(): BPlayerController {
        const cloned = new BPlayerController(this.name, null, null);

        // Copy all BPart properties
        Object.assign(cloned, this);

        // Deep-clone transform-related value objects
        cloned.position = this.position.clone();
        cloned.rotation = this.rotation.clone();
        cloned.scale = this.scale.clone();
        cloned.positionOffset = this.positionOffset.clone();
        cloned.rotationOffset = this.rotationOffset.clone();

        // Clone meshSource
        cloned.meshSource = { ...this.meshSource };

        return cloned;
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
    threeTexture: any; // THREE.js texture reference

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

// Range (for particles - min, max)
class BRange {
    min: any;
    max: any;

    constructor(min: any, max: any) {
        this.min = min;
        this.max = max;
    }
}

// Range squared (for particles - min, max on the start and end)
class BRange2 {
    minStart: any;
    maxStart: any;
    minEnd: any;
    maxEnd: any;

    constructor(minStart: any, maxStart: any, minEnd: any, maxEnd: any) {
        this.minStart = minStart;
        this.maxStart = maxStart;
        this.minEnd = minEnd;
        this.maxEnd = maxEnd;
    }
}

class BParticle {
    id: string;
    name: string;

    // Particle properties
    rotation: BVector3;
    scale: BVector3;
    lifetime: BRange; // Lifetime in seconds
    duration: number; // Duration in seconds
    looping: boolean; // Whether the particles should loop
    speed: BRange2; // Particle speed
    color: BRange2; // Particle color
    size: BRange2; // Particle size
    opacity: BRange2; // Particle opacity (0-1)
    gravity: number; // Gravity effect on particles
    rate: BRange2; // Particle emission rate
    emitter: "sphere" | "cone" | "circle"; //

    constructor(name: string) {
        this.id = nanoid();
        this.name = name;

        this.rotation = new BVector3(0, 0, 0);
        this.scale = new BVector3(1, 1, 1);
        this.lifetime = new BRange(1, 1);
        this.duration = 1;
        this.looping = false;
        this.speed = new BRange2(1, 1, 1, 1);
        this.color = new BRange2("#ffffff", "#ffffff", "#ffffff", "#ffffff");
        this.size = new BRange2(1, 1, 1, 1);
        this.opacity = new BRange2(1, 1, 1, 1);
        this.gravity = 0;
        this.rate = new BRange2(1, 1, 1, 1);
        this.emitter = "sphere";
    }
}

// Error for the user's code causing an error in the interpreter
class InterpreterScriptError extends Error {
    constructor(message: string) {
        // Call the parent Error constructor
        super(message);

        // Set the name of the custom error
        this.name = "InterpreterScriptError";
    }
}

// Export all classes
export {
    BScene,
    BObject,
    BVector3,
    BNode3D,
    BPart,
    BPlayerController,
    BCamera,
    BLight,
    BConstraint,
    BScript,
    BStorage,
    BAsset,
    BAssetCollection,
    BMaterial,
    BParticle,
    InterpreterScriptError,
    type AssetType,
    type BAssetMetadata,
    type PrimitiveMeshType,
    type MeshSource,
};
