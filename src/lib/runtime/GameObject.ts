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
 */
export class GameObject {
    public readonly id: string;
    public readonly bNode: Types.BNode3D;
    public readonly name: string;
    /**
     * Type name derived from the source BNode (e.g. BPart, BCamera, BLight)
     */
    public readonly nodeType: string;

    public transform: Transform;
    public worldMatrix: THREE.Matrix4;

    private components: Component[] = [];
    private componentMap: Map<string, Component> = new Map();

    private parent: GameObject | null = null;
    private children: GameObject[] = [];

    // Store the offset relative to parent when hierarchy is established
    private positionOffset: THREE.Vector3 = new THREE.Vector3();
    private rotationOffset: THREE.Quaternion = new THREE.Quaternion();

    /**
     * When true, this GameObject’s transform is set by the PhysicsComponent.
     * When false, this GameObject’s transform is set by the parent GameObject.
     */
    public isPhysicsDriven = false;

    constructor(bNode: Types.BNode3D, children?: GameObject[]) {
        this.id = bNode.id;
        this.bNode = bNode;
        this.name = (bNode as any)?.name ?? "";
        this.nodeType = (bNode as any)?.constructor?.name ?? "BNode3D";

        // Initialize transform from BNode3D
        // Convert Euler angles from BNode3D to quaternions for runtime
        this.transform = {
            position: new THREE.Vector3().copy(bNode.position),
            rotation: RotationUtils.eulerToNormalizedQuaternion(bNode.rotation),
            scale: new THREE.Vector3().copy(bNode.scale),
        };

        this.worldMatrix = new THREE.Matrix4();
        // Compose initial world matrix from the initial transform so visuals are valid before first update
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
     * Uses offset-based calculations instead of local-to-world matrix multiplication.
     */
    updateWorldMatrix(parentWorldMatrix?: THREE.Matrix4): void {
        // If this object is driven directly by physics we should *not* derive its
        // transform from parent/offset — the PhysicsComponent has already
        // written authoritative transform values this frame. We still need
        // to re-compose our worldMatrix from those values and propagate the
        // matrix down to children so they can build their world matrices.
        if (this.isPhysicsDriven) {
            this.worldMatrix.compose(
                this.transform.position,
                this.transform.rotation,
                this.transform.scale
            );

            for (const child of this.children) {
                child.updateWorldMatrix(this.worldMatrix);
            }
            return;
        }

        if (parentWorldMatrix && this.parent) {
            // Get parent's current position and rotation
            const parentPosition = new THREE.Vector3();
            const parentRotation = new THREE.Quaternion();
            const parentScale = new THREE.Vector3();
            parentWorldMatrix.decompose(parentPosition, parentRotation, parentScale);

            // Apply the offset relative to the parent
            // Position: parent position + (parent rotation * position offset)
            const rotatedPositionOffset = this.positionOffset.clone().applyQuaternion(parentRotation);
            this.transform.position.copy(parentPosition).add(rotatedPositionOffset);

            // Rotation: parent rotation * rotation offset
            this.transform.rotation.multiplyQuaternions(parentRotation, this.rotationOffset);
            
            // Scale: multiply with parent scale
            this.transform.scale.multiplyVectors(parentScale, new THREE.Vector3(1, 1, 1)); // Keep original scale for now
        }
        // If no parent, transform remains as-is (root object)

        // Compose world matrix from transform
        this.worldMatrix.compose(
            this.transform.position,
            this.transform.rotation,
            this.transform.scale
        );

        // Recursively update children
        for (const child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }

    /**
     * Runtime hierarchy helpers (do not rely on editor BNode tree)
     */
    setParent(parent: GameObject | null): void {
        this.parent = parent;
        this.calculateOffsets();
    }

    /**
     * Calculate the position and rotation offset relative to the parent
     * This is called when the parent-child relationship is established
     */
    private calculateOffsets(): void {
        if (!this.parent) {
            // No parent, reset offsets
            this.positionOffset.set(0, 0, 0);
            this.rotationOffset.set(0, 0, 0, 1);
            return;
        }

        // Calculate position offset: child position - parent position (in parent's local space)
        const parentInverseRotation = this.parent.transform.rotation.clone().invert();
        this.positionOffset.copy(this.transform.position)
            .sub(this.parent.transform.position)
            .applyQuaternion(parentInverseRotation);

        // Calculate rotation offset: parent rotation^-1 * child rotation
        this.rotationOffset.multiplyQuaternions(parentInverseRotation, this.transform.rotation);
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
}
