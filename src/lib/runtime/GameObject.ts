import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";

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
 * Provides a unified interface for visual, physics, and script components
 * Works like Roblox Studio - modify transform directly and parent-child relationships work automatically
 */
export class GameObject {
    public readonly id: string;
    public readonly bNode: Types.BNode3D;
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

    constructor(bNode: Types.BNode3D, children?: GameObject[]) {
        this.id = bNode.id;
        this.bNode = bNode;
        this.name = (bNode as any)?.name ?? "";
        this.nodeType = (bNode as any)?.constructor?.name ?? "BNode3D";

        // Initialize transform from BNode3D (editor values are in world space at Play start)
        this.transform = {
            position: new THREE.Vector3().copy(bNode.position),
            rotation: RotationUtils.eulerToNormalizedQuaternion(bNode.rotation),
            scale: new THREE.Vector3().copy(bNode.scale),
        };

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

            let oldRotation = this.transform.rotation.clone();

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
        this.parent = parent;
        this.calculateOffsetFromParent();
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

    addChild(child: GameObject): void {
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
    getComponent<T extends Component>(
        componentClass: new (...args: any[]) => T
    ): T | null {
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
    hasComponent<T extends Component>(
        componentClass: new (...args: any[]) => T
    ): boolean {
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
                    console.error(
                        `Error updating component ${component.constructor.name} on GameObject ${this.id}:`,
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
