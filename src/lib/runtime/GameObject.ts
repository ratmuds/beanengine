import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import { VisualComponent } from "./VisualComponent";
import { ScriptComponent } from "./ScriptComponent";
import { PhysicsComponent } from "./PhysicsComponent";
import { ConstraintComponent } from "./ConstraintComponent";
import { CameraComponent } from "./CameraComponent";
import { PlayerControllerComponent } from "./PlayerControllerComponent";
import { sceneStore } from "$lib/sceneStore";
import { runtimeStore } from "$lib/runtimeStore";

/**
 * Utility functions for converting between Euler angles and quaternions
 */
export class RotationUtils {
    /**
     * Convert Euler angles (BVector3) to THREE.Quaternion
     */
    static eulerToQuaternion(euler: Types.BVector3): THREE.Quaternion {
        const threeEuler = new THREE.Euler(euler.x, euler.y, euler.z);
        return new THREE.Quaternion().setFromEuler(threeEuler);
    }

    /**
     * Convert THREE.Quaternion to Euler angles (BVector3)
     */
    static quaternionToEuler(quaternion: THREE.Quaternion): Types.BVector3 {
        const threeEuler = new THREE.Euler().setFromQuaternion(quaternion);
        return new Types.BVector3(threeEuler.x, threeEuler.y, threeEuler.z);
    }

    /**
     * Convert BVector3 Euler to normalized THREE.Quaternion
     */
    static eulerToNormalizedQuaternion(
        euler: Types.BVector3
    ): THREE.Quaternion {
        const quaternion = this.eulerToQuaternion(euler);
        quaternion.normalize();
        return quaternion;
    }
}

/**
 * Transform data that can be shared between components
 * Uses quaternions for rotation to avoid gimbal lock and work better with physics
 */
export interface Transform {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
}

/**
 * GameObject wraps a BNode3D and manages its components
 * Basically the runtime representation of a BNode3D
 * Some values changed will be detected and updated automatically
 */
export class GameObject {
    public readonly id: string;
    public readonly bObject: Types.BObject;
    public readonly name: string;
    /**
     * Type name derived from the source BNode (e.g. BPart, BCamera, BLight)
     */
    public readonly nodeType: string;

    /**
     * World transform (used by rendering and most components)
     */
    public transform: Transform;

    public worldMatrix: THREE.Matrix4;

    private components: Component[] = [];
    private componentMap: Map<string, Component> = new Map();

    private parent: GameObject | null = null;
    private children: GameObject[] = [];

    /**
     * When true, this GameObject's transform is set by the PhysicsComponent.
     * When false, this GameObject's transform is derived from parent * localTransform.
     */
    public isPhysicsDriven = false;

    /**
     * Cached offset from parent when parented (automatically managed)
     */
    private offsetFromParent: Transform | null = null;

    constructor(bObject: Types.BObject, children?: GameObject[]) {
        this.id = bObject.id;
        this.bObject = bObject;
        this.name = bObject.name ?? "";
        this.nodeType = bObject.constructor?.name ?? "BObject";

        // Initialize transform
        if (bObject instanceof Types.BNode3D) {
            // from BNode3D (editor values are in world space at Play start)
            this.transform = {
                position: new THREE.Vector3().copy(bObject.position),
                rotation: RotationUtils.eulerToNormalizedQuaternion(
                    bObject.rotation
                ),
                scale: new THREE.Vector3().copy(bObject.scale),
            };
        } else {
            // Default transform for non-spatial objects
            this.transform = {
                position: new THREE.Vector3(),
                rotation: new THREE.Quaternion(),
                scale: new THREE.Vector3(1, 1, 1),
            };
        }

        this.worldMatrix = new THREE.Matrix4();
        // Compose initial world matrix
        this.worldMatrix.compose(
            this.transform.position,
            this.transform.rotation,
            this.transform.scale
        );

        // Set up children if provided
        if (children) {
            for (const child of children) {
                this.addChild(child);
            }
        }
    }

    /**
     * Updates the world matrix of this GameObject and all its children.
     */
    updateWorldMatrix(): void {
        if (this.isPhysicsDriven) {
            // Physics-driven objects: transform is authoritative from physics
            this.worldMatrix.compose(
                this.transform.position,
                this.transform.rotation,
                this.transform.scale
            );
        } else if (this.parent && this.offsetFromParent) {
            // Non-physics child: calculate transform from parent + offset
            const parentPos = this.parent.transform.position;
            const parentRot = this.parent.transform.rotation;

            // Apply parent transform to offset
            // position = parentPos + parentRot * (parentScale * offsetPos)
            const scaledOffset = this.offsetFromParent.position.clone();
            const rotatedOffset = scaledOffset.applyQuaternion(parentRot);
            this.transform.position.copy(parentPos).add(rotatedOffset);

            // rotation = parentRot * offsetRot
            this.transform.rotation.multiplyQuaternions(
                parentRot,
                this.offsetFromParent.rotation
            );

            // Update world matrix
            this.worldMatrix.compose(
                this.transform.position,
                this.transform.rotation,
                this.transform.scale
            );
        } else {
            // Root object or no offset: transform is already correct
            this.worldMatrix.compose(
                this.transform.position,
                this.transform.rotation,
                this.transform.scale
            );
        }

        // Recursively update children
        for (const child of this.children) {
            child.updateWorldMatrix();
        }
    }

    /**
     * Runtime hierarchy helpers (do not rely on editor BNode tree)
     */
    setParent(parent: GameObject | null): void {
        const wasUnderStorage = this.isUnderStorage();
        this.parent = parent;
        this.calculateOffsetFromParent();

        const isNowUnderStorage = this.isUnderStorage();
        if (wasUnderStorage !== isNowUnderStorage) {
            // Toggle components enabled state for this subtree
            const enable = !isNowUnderStorage;
            const toggle = (go: GameObject) => {
                for (const c of go.getComponents()) c.setEnabled(enable);
                for (const child of go.getChildren()) toggle(child);
            };
            toggle(this);
        }
    }

    /**
     * Calculate and store the offset from parent based on current world positions
     * This preserves the current visual relationship when parenting
     */
    private calculateOffsetFromParent(): void {
        if (!this.parent) {
            this.offsetFromParent = null;
            return;
        }

        // Calculate offset in parent's local space
        const parentPos = this.parent.transform.position;
        const parentRot = this.parent.transform.rotation;
        const parentScale = this.parent.transform.scale;

        const invParentRot = parentRot.clone().invert();

        // offset position = inv(parentRot) * (worldPos - parentPos) / parentScale
        const relPos = this.transform.position
            .clone()
            .sub(parentPos)
            .applyQuaternion(invParentRot);
        const offsetPos = new THREE.Vector3(
            relPos.x / (parentScale.x !== 0 ? parentScale.x : 1),
            relPos.y / (parentScale.y !== 0 ? parentScale.y : 1),
            relPos.z / (parentScale.z !== 0 ? parentScale.z : 1)
        );

        // offset rotation = inv(parentRot) * worldRot
        const offsetRot = new THREE.Quaternion().multiplyQuaternions(
            invParentRot,
            this.transform.rotation
        );

        // offset scale = worldScale / parentScale
        const offsetScale = new THREE.Vector3(
            this.transform.scale.x / (parentScale.x !== 0 ? parentScale.x : 1),
            this.transform.scale.y / (parentScale.y !== 0 ? parentScale.y : 1),
            this.transform.scale.z / (parentScale.z !== 0 ? parentScale.z : 1)
        );

        this.offsetFromParent = {
            position: offsetPos,
            rotation: offsetRot,
            scale: offsetScale,
        };
    }

    getParent(): GameObject | null {
        return this.parent;
    }

    /**
     * Returns true if this GameObject is the Storage container or is parented under it
     */
    public isUnderStorage(): boolean {
        let current: GameObject | null = this;
        while (current) {
            // If any ancestor is a BStorage, treat as under storage
            if (current.bObject instanceof Types.BStorage) return true;
            current = current.parent;
        }
        return false;
    }

    addChild(child: GameObject): void {
        // Remove from previous parent if any
        if (child.getParent() && child.getParent() !== this) {
            child.getParent()?.removeChild(child);
        }

        if (!this.children.includes(child)) {
            this.children.push(child);
            child.setParent(this);
        }
    }

    removeChild(child: GameObject): void {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            if (child.getParent() === this) {
                child.setParent(null);
            }
        }
    }

    getChildren(): GameObject[] {
        return [...this.children];
    }

    findChildByName(name: string): GameObject | null {
        return this.children.find((c) => c.name === name) ?? null;
    }

    clone(): GameObject {
        // 1) Clone the underlying editor object with a fresh ID, preserving its class
        const clonedBObject = GameObject.cloneBObjectWithNewId(this.bObject);

        // 2) Create the cloned GameObject (no components yet)
        const cloneGO = new GameObject(clonedBObject);

        // 3) Copy world-space transform (position/quaternion/scale)
        cloneGO.transform.position.copy(this.transform.position);
        cloneGO.transform.rotation.copy(this.transform.rotation);
        cloneGO.transform.scale.copy(this.transform.scale);
        cloneGO.worldMatrix.copy(this.worldMatrix);

        // 4) Clone children first so hierarchy exists before components initialize
        for (const child of this.getChildren()) {
            const childClone = child.clone();
            cloneGO.addChild(childClone);
        }

        // 5) Clone components after hierarchy is set and attach to clone
        const scene = runtimeStore.getThreeScene();
        for (const comp of this.getComponents()) {
            if (comp instanceof VisualComponent) {
                if (scene) {
                    cloneGO.addComponent(new VisualComponent(cloneGO, scene));
                } else {
                    runtimeStore.warn(
                        "THREE.Scene not available while cloning VisualComponent",
                        "GameObject"
                    );
                }
            } else if (comp instanceof ScriptComponent) {
                const originalScript = (comp as ScriptComponent).script;
                if (scene) {
                    cloneGO.addComponent(
                        new ScriptComponent(cloneGO, originalScript, scene)
                    );
                } else {
                    runtimeStore.warn(
                        "THREE.Scene not available while cloning ScriptComponent",
                        "GameObject"
                    );
                }
            } else if (comp instanceof PhysicsComponent) {
                cloneGO.addComponent(new PhysicsComponent(cloneGO));
            } else if (comp instanceof ConstraintComponent) {
                cloneGO.addComponent(new ConstraintComponent(cloneGO));
            } else if (comp instanceof CameraComponent) {
                cloneGO.addComponent(new CameraComponent(cloneGO));
            } else {
                runtimeStore.warn(
                    `Unrecognized component type: ${comp.constructor.name}`,
                    "GameObject"
                );
            }
        }

        return cloneGO;
    }

    /**
     * Clone a Types.BObject while preserving its prototype and issuing a fresh id.
     */
    private static cloneBObjectWithNewId(source: Types.BObject): Types.BObject {
        // BPlayerController has a custom deep clone that issues a new id
        if (source instanceof Types.BPlayerController) {
            const cloned = source.clone();
            cloned.parent = null;
            cloned.children = [];
            return cloned;
        }

        // BPart: create a fresh instance and copy fields (ensures new id)
        if (source instanceof Types.BPart) {
            const s = source as Types.BPart;
            const cloned = new Types.BPart(s.name, null, null);
            // copy simple fields
            cloned.color = s.color;
            cloned.material = s.material;
            cloned.transparency = s.transparency;
            cloned.castShadows = s.castShadows;
            cloned.receiveShadows = s.receiveShadows;
            cloned.visible = s.visible;
            cloned.positionLocked = s.positionLocked;
            cloned.rotationLocked = s.rotationLocked;
            cloned.canTouch = s.canTouch;
            cloned.canCollide = s.canCollide;
            cloned.canQuery = s.canQuery;
            cloned.meshSource = { ...s.meshSource };
            // transform
            cloned.position = s.position.clone();
            cloned.rotation = s.rotation.clone();
            cloned.scale = s.scale.clone();
            cloned.positionOffset = s.positionOffset.clone();
            cloned.rotationOffset = s.rotationOffset.clone();
            // detach
            cloned.parent = null;
            cloned.children = [];
            return cloned;
        }

        // BCamera manual clone
        if (source instanceof Types.BCamera) {
            const s = source as Types.BCamera;
            const cloned = new Types.BCamera(s.name, null, null);
            cloned.fieldOfView = s.fieldOfView;
            cloned.nearClipPlane = s.nearClipPlane;
            cloned.farClipPlane = s.farClipPlane;
            cloned.projectionType = s.projectionType;
            cloned.orthographicSize = s.orthographicSize;
            cloned.aspectRatio = s.aspectRatio;
            cloned.isActive = s.isActive;
            cloned.clearColor = s.clearColor;
            cloned.clearFlags = s.clearFlags;
            // Transform
            cloned.position = s.position.clone();
            cloned.rotation = s.rotation.clone();
            cloned.scale = s.scale.clone();
            cloned.positionOffset = s.positionOffset.clone();
            cloned.rotationOffset = s.rotationOffset.clone();
            return cloned;
        }

        // BLight manual clone
        if (source instanceof Types.BLight) {
            const s = source as Types.BLight;
            const cloned = new Types.BLight(s.name, null, null);
            cloned.color = s.color;
            cloned.intensity = s.intensity;
            cloned.position = s.position.clone();
            cloned.rotation = s.rotation.clone();
            cloned.scale = s.scale.clone();
            cloned.positionOffset = s.positionOffset.clone();
            cloned.rotationOffset = s.rotationOffset.clone();
            return cloned;
        }

        // Generic BNode3D clone path
        if (source instanceof Types.BNode3D) {
            const cloned = source.clone();
            cloned.parent = null;
            cloned.children = [];
            return cloned;
        }

        // BScript – simple re-instantiation with deep-copied code array
        if (source instanceof Types.BScript) {
            const s = source as Types.BScript;
            const cloned = new Types.BScript(s.name, null, null);
            cloned.code =
                typeof structuredClone === "function"
                    ? structuredClone(s.code)
                    : JSON.parse(JSON.stringify(s.code ?? []));
            return cloned;
        }

        // Fallback: construct a plain BObject with a new id
        const cloned = new Types.BObject(source.name ?? "Object", null, null);
        return cloned;
    }

    /**
     * Add a component to this GameObject
     */
    addComponent<T extends Component>(component: T): T {
        this.components.push(component);
        this.componentMap.set(component.constructor.name, component);
        component.onEnable();
        return component;
    }

    /**
     * Remove a component from this GameObject
     */
    removeComponent(component: Component): void {
        const index = this.components.indexOf(component);
        if (index !== -1) {
            this.components.splice(index, 1);
            this.componentMap.delete(component.constructor.name);
            component.destroy();
        }
    }

    /**
     * Get a component by its class type
     */
    getComponent<T extends Component>(componentClass: {
        name: string;
    }): T | null {
        return (this.componentMap.get(componentClass.name) as T) || null;
    }

    /**
     * Get all components of this GameObject
     */
    getComponents(): Component[] {
        return [...this.components];
    }

    /**
     * Check if this GameObject has a specific component type
     */
    hasComponent(componentClass: { name: string }): boolean {
        return this.componentMap.has(componentClass.name);
    }

    /**
     * Update all components
     */
    update(delta: number): void {
        for (const component of this.components) {
            if (component.isEnabled()) {
                try {
                    component.update(delta);
                } catch (error) {
                    runtimeStore.error(
                        `Error updating component ${component.constructor.name} on GameObject ${this.id}:`,
                        "GameObject",
                        error
                    );
                }
            }
        }
    }

    /**
     * Destroy this GameObject and all its components
     */
    destroy(): void {
        for (const component of this.components) {
            component.destroy();
        }
        this.components.length = 0;
        this.componentMap.clear();
        // detach children
        for (const child of this.children) {
            child.setParent(null);
        }
        this.children.length = 0;
        this.parent = null;
    }

    /**
     * Set the local rotation (relative to parent if present).
     * If there is a parent, this updates the cached offsetFromParent rotation.
     * If there is no parent, it writes directly to transform.rotation.
     */
    public setLocalRotation(q: THREE.Quaternion): void {
        if (this.parent) {
            if (!this.offsetFromParent) {
                this.calculateOffsetFromParent();
            }
            if (this.offsetFromParent) {
                this.offsetFromParent.rotation.copy(q);
                // Recompute this subtree now so dependents (e.g., camera visuals) see the change this frame
                this.updateWorldMatrix();
                return;
            }
        }
        this.transform.rotation.copy(q);
        // Recompute this subtree now so dependents see the change this frame
        this.updateWorldMatrix();
    }

    /**
     * Get the forward vector (negative Z axis) in world space.
     * This is the direction the object is "looking" towards.
     */
    public getLookVector(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.transform.rotation);
        return forward;
    }

    /**
     * Alias for getLookVector() - returns the forward direction vector.
     */
    public getForwardVector(): THREE.Vector3 {
        return this.getLookVector();
    }

    /**
     * Get the right vector (positive X axis) in world space.
     */
    public getRightVector(): THREE.Vector3 {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.transform.rotation);
        return right;
    }

    /**
     * Get the up vector (positive Y axis) in world space.
     */
    public getUpVector(): THREE.Vector3 {
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.transform.rotation);
        return up;
    }

    /**
     * Get the backward vector (positive Z axis) in world space.
     * Opposite of the look/forward vector.
     */
    public getBackVector(): THREE.Vector3 {
        const back = new THREE.Vector3(0, 0, 1);
        back.applyQuaternion(this.transform.rotation);
        return back;
    }

    /**
     * Get the left vector (negative X axis) in world space.
     * Opposite of the right vector.
     */
    public getLeftVector(): THREE.Vector3 {
        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(this.transform.rotation);
        return left;
    }

    /**
     * Get the down vector (negative Y axis) in world space.
     * Opposite of the up vector.
     */
    public getDownVector(): THREE.Vector3 {
        const down = new THREE.Vector3(0, -1, 0);
        down.applyQuaternion(this.transform.rotation);
        return down;
    }

    /**
     * Make this GameObject look at a target position in world space.
     * Updates the rotation to face the target.
     */
    public lookAt(target: THREE.Vector3): void {
        // Create a quaternion that rotates from the default forward direction to the target direction
        const quaternion = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();
        matrix.lookAt(
            this.transform.position,
            target,
            new THREE.Vector3(0, 1, 0)
        );
        quaternion.setFromRotationMatrix(matrix);

        this.setLocalRotation(quaternion);
    }

    /**
     * Rotate this GameObject to face another GameObject.
     */
    public lookAtGameObject(target: GameObject): void {
        this.lookAt(target.transform.position);
    }

    /**
     * Get the distance to another GameObject.
     */
    public getDistanceTo(other: GameObject): number {
        return this.transform.position.distanceTo(other.transform.position);
    }

    /**
     * Get the direction vector from this GameObject to another GameObject (normalized).
     */
    public getDirectionTo(other: GameObject): THREE.Vector3 {
        return other.transform.position
            .clone()
            .sub(this.transform.position)
            .normalize();
    }
}
