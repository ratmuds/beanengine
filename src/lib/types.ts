// src/lib/types.ts
// This file defines the types used in Bean Engine.

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
    parent: BObject | null;
    children: BObject[];

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        this.name = name ? name : "Object";
        this.id = id ? id : Math.random().toString(36).substring(2, 15);
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
}

// --- Scene Object Hierarchy ---

// Base class for any object with a 3D transform
class BNode3D extends BObject {
    // Local transform (relative to parent)
    position: BVector3;
    rotation: BQuaternion;
    scale: BVector3;

    positionOffset: BVector3;
    rotationOffset: BQuaternion;

    constructor(
        name: string | null,
        id: string | null,
        parent: BObject | null
    ) {
        super(name, id, parent);
        this.position = new BVector3();
        this.rotation = new BQuaternion();
        this.scale = new BVector3(1, 1, 1);
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

// Represents a physical part in the scene
class BPart extends BNode3D {
    mesh: string; // Reference to a mesh resource or base mesh ('block', 'sphere', etc.)
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

        this.mesh = "block";
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
        this.partA = partA;
        this.partB = partB;
    }
}

// Export all classes
export {
    BScene,
    BObject,
    BVector3,
    BQuaternion,
    BNode3D,
    BPart,
    BLight,
    BConstraint,
};
