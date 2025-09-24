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

        // Create default BUIStorage container
        const defaultUIStorage = new BUIStorage("UIStorage", null, null);
        this.addObject(defaultUIStorage);
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

    isDescendantOfType(type: string): boolean {
        let current: BObject | null = this.parent;
        while (current) {
            if (current.type === type) return true;
            current = current.parent;
        }
        return false;
    }

    clone(): BObject {
        // Helper predicates
        const hasCloneMethod = (obj: unknown): obj is { clone(): unknown } =>
            typeof obj === "object" &&
            obj !== null &&
            "clone" in obj &&
            typeof (obj as Record<string, unknown>).clone === "function";
        const isPlainObject = (obj: unknown): obj is Record<string, unknown> =>
            typeof obj === "object" &&
            obj !== null &&
            (obj as object).constructor === Object;

        // 1) Collect original subtree (self + descendants)
        const originals: BObject[] = [this, ...this.getDescendants()];
        const originalsSet = new Set(originals);

        // 2) First pass: create structural clones preserving prototype, assign new ids, copy fields except parent/children
        const map = new Map<BObject, BObject>();
        for (const original of originals) {
            const clone = Object.create(
                Object.getPrototypeOf(original)
            ) as BObject;
            const cloneObj = clone as unknown as Record<string, unknown>;
            const entries = Object.entries(original) as Array<
                [string, unknown]
            >;
            for (const [key, value] of entries) {
                if (key === "parent" || key === "children") continue;
                if (key === "id") {
                    cloneObj.id = nanoid();
                    continue;
                }

                if (hasCloneMethod(value)) {
                    cloneObj[key] = (value as { clone: () => unknown }).clone();
                } else if (Array.isArray(value)) {
                    cloneObj[key] = [...(value as unknown[])];
                } else if (isPlainObject(value)) {
                    cloneObj[key] = { ...(value as Record<string, unknown>) };
                } else {
                    cloneObj[key] = value as unknown;
                }
            }

            // Ensure required base fields exist
            if ((cloneObj as { name?: string }).name == null) {
                (cloneObj as { name: string }).name = original.name;
            }
            (cloneObj as { type: string }).type = original.type;
            (cloneObj as { parent: BObject | null }).parent = null;
            (cloneObj as { children: BObject[] }).children = [];

            map.set(original, clone);
        }

        // 3) Second pass: remap any properties that reference BObjects within the cloned subtree
        for (const original of originals) {
            const clone = map.get(original);
            if (!clone) continue;

            for (const [key, value] of Object.entries(original) as Array<
                [string, unknown]
            >) {
                if (key === "parent" || key === "children" || key === "id")
                    continue;

                const cloneObj = clone as unknown as Record<string, unknown>;
                const current = cloneObj[key];
                if (value instanceof BObject) {
                    if (originalsSet.has(value)) {
                        const mapped = map.get(value);
                        if (mapped) cloneObj[key] = mapped;
                    } else {
                        cloneObj[key] = value as unknown;
                    }
                } else if (Array.isArray(value)) {
                    const mappedArr = (value as unknown[]).map((item) => {
                        if (item instanceof BObject && originalsSet.has(item)) {
                            const m = map.get(item);
                            return m ? m : item;
                        }
                        return item;
                    });
                    cloneObj[key] = mappedArr as unknown;
                } else if (isPlainObject(value)) {
                    // Shallow remap any direct BObject fields inside a plain object
                    const base = (current as Record<string, unknown>) || {};
                    const obj: Record<string, unknown> = { ...base };
                    for (const [subKey, subVal] of Object.entries(
                        value as Record<string, unknown>
                    )) {
                        if (
                            subVal instanceof BObject &&
                            originalsSet.has(subVal)
                        ) {
                            const mapped = map.get(subVal);
                            obj[subKey] = mapped ? mapped : subVal;
                        }
                    }
                    cloneObj[key] = obj;
                }
            }
        }

        // 4) Rebuild parent/child relationships
        for (const original of originals) {
            const clone = map.get(original);
            if (!clone) continue;
            for (const child of original.children) {
                const childClone = map.get(child);
                if (childClone) clone.addChild(childClone);
            }
        }

        // Return the clone corresponding to 'this'
        const rootClone = map.get(this);
        return rootClone ? rootClone : this; // Fallback should never happen
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

// UI Storage container for UI elements to be rendered
class BUIStorage extends BObject {
    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "uistorage";
    }
}

// UI classes
class BUI extends BObject {
    autoLayout: boolean; // If enabled, the position will be managed automatically, like for lists
    positionPercent: BVector2;
    positionOffset: BVector2;

    sizePercent: BVector2;
    sizeOffset: BVector2;

    rotation: number;

    positionXAnchor: "left" | "center" | "right";
    positionYAnchor: "top" | "center" | "bottom";
    visible: boolean;
    zIndex: number;

    padding: BVector2;
    margin: BVector2;

    transition:
        | "none"
        | "blur"
        | "crossfade"
        | "draw"
        | "fade"
        | "fly"
        | "scale"
        | "slide";
    transitionDuration: number; // in milliseconds

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "ui";

        this.autoLayout = false;
        this.positionPercent = new BVector2(0, 0);
        this.positionOffset = new BVector2(0, 0);
        this.sizePercent = new BVector2(0, 0);
        this.sizeOffset = new BVector2(200, 50);
        this.rotation = 0;
        this.positionXAnchor = "left";
        this.positionYAnchor = "top";
        this.visible = true;
        this.zIndex = 0;
        this.padding = new BVector2(0, 0);
        this.margin = new BVector2(0, 0);
        this.transition = "none";
        this.transitionDuration = 0;
    }
}

class BContainerUI extends BUI {
    scroll: "none" | "horizontal" | "vertical" | "both";

    backgroundColor: string; // rgba
    borderColor: string; // rgba
    borderSize: number; // in pixels
    borderRadius: number; // in pixels

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "containerui";

        this.scroll = "none";
        this.backgroundColor = "rgba(0, 0, 0, 0)";
        this.borderColor = "rgba(0, 0, 0, 0)";
        this.borderSize = 0;
        this.borderRadius = 0;
    }
}

class BTextUI extends BContainerUI {
    text: string;
    fontSize: number; // in pixels
    fontFamily: string;
    fontWeight: number;
    color: string; // rgba
    textAlign: "left" | "center" | "right";
    textVerticalAlign: "top" | "center" | "bottom";
    overflow: "none" | "wrap" | "ellipsis";

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "textui";

        this.text = "";
        this.fontSize = 16;
        this.fontFamily = "Arial";
        this.fontWeight = 400;
        this.color = "rgba(0, 0, 0, 1)";
        this.textAlign = "left";
        this.textVerticalAlign = "top";
        this.overflow = "none";
    }
}

class BButtonUI extends BTextUI {
    hoverColor: string; // rgba
    pressedColor: string; // rgba

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.type = "buttonui";

        this.hoverColor = "rgba(0, 0, 0, 0.5)";
        this.pressedColor = "rgba(0, 0, 0, 0.7)";
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

// Represents a 2D vector
class BVector2 {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Clone method to create a new instance with the same values
    clone(): BVector2 {
        return new BVector2(this.x, this.y);
    }

    // Add method to add two vectors
    add(vector: BVector2) {
        this.x = this.x + vector.x;
        this.y = this.y + vector.y;
    }

    // Subtract method to subtract two vectors
    sub(vector: BVector2) {
        this.x = this.x - vector.x;
        this.y = this.y - vector.y;
    }

    // Multiply method to multiply two vectors
    mul(vector: BVector2) {
        this.x = this.x * vector.x;
        this.y = this.y * vector.y;
    }

    // Divide method to divide two vectors
    div(vector: BVector2) {
        this.x = this.x / vector.x;
        this.y = this.y / vector.y;
    }

    // Equals method to check if two vectors are equal
    equals(vector: BVector2): boolean {
        return this.x === vector.x && this.y === vector.y;
    }

    // Copy method to copy the vector
    copy(vector: BVector2): BVector2 {
        return new BVector2(vector.x, vector.y);
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
        return super.clone() as BPart;
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
        this.moveSpeed = 5;
        this.jumpForce = 2;
        this.mouseSensitivity = 0.2; //0.002;
        this.maxLookAngle = 80; // degrees
    }

    clone(): BPlayerController {
        return super.clone() as BPlayerController;
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
    color: string; // Color (default white)
    builtin: boolean; // If this material is provided by the engine
    textures: {
        // Asset ids (some optional)
        color: string; // Color texture (required)
        displacement?: string; // Displacement map
        normal?: string; // Normal map
        roughness?: string; // Roughness map
        metallic?: string; // Metallic map
    };
    threeMaterial: any; // THREE.js material reference
    threlteTexture: any; // Threlte texture reference

    constructor(name: string) {
        this.id = nanoid();
        this.name = name;
        this.color = "#ffffff";
        this.builtin = false;
        this.textures = {
            color: "",
            displacement: "",
            normal: "",
            roughness: "",
            metallic: "",
        };
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
    BVector2,
    BNode3D,
    BPart,
    BPlayerController,
    BCamera,
    BLight,
    BConstraint,
    BScript,
    BStorage,
    BUIStorage,
    BUI,
    BContainerUI,
    BTextUI,
    BButtonUI,
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
