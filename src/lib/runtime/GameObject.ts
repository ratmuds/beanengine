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

    // Store previous parent transform to calculate offsets
    private previousParentPosition: THREE.Vector3 = new THREE.Vector3();
    private previousParentRotation: THREE.Quaternion = new THREE.Quaternion();
    private relativePositionOffset: THREE.Vector3 = new THREE.Vector3();
    private relativeRotationOffset: THREE.Quaternion = new THREE.Quaternion();

    /**
     * When true, this GameObject’s worldTransform is set by the PhysicsComponent.
     * When false, this GameObject’s worldTransform is set by the parent GameObject.
     */
    public isPhysicsDriven = false;

    constructor(bNode: Types.BNode3D) {
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
    }

    /**
     * Updates the transform of this GameObject and all its children using offset-based calculation.
     * Instead of matrix multiplication, children maintain their relative offset from their parent
     * and apply changes based on the parent's movement.
     */
    updateWorldMatrix(): void {
        // If this object is driven directly by physics, it already has the correct transform
        // We still need to update children and recompose the world matrix
        if (this.isPhysicsDriven) {
            this.worldMatrix.compose(
                this.transform.position,
                this.transform.rotation,
                this.transform.scale
            );

            // Update children with our new transform
            for (const child of this.children) {
                child.updateFromParentTransform(
                    this.transform.position,
                    this.transform.rotation
                );
            }
            return;
        }

        // If we have a parent, update our transform based on parent's movement
        if (this.parent && !this.isPhysicsDriven) {
            this.updateFromParentTransform(
                this.parent.transform.position,
                this.parent.transform.rotation
            );
        }

        // Update our world matrix
        this.worldMatrix.compose(
            this.transform.position,
            this.transform.rotation,
            this.transform.scale
        );

        // Recursively update children
        for (const child of this.children) {
            child.updateWorldMatrix();
        }
    }

    /**
     * Updates this GameObject's transform based on parent movement using stored offsets
     */
    private updateFromParentTransform(parentPosition: THREE.Vector3, parentRotation: THREE.Quaternion): void {
        if (this.isPhysicsDriven) return;

        // Calculate how much the parent has moved/rotated
        const parentPositionDelta = new THREE.Vector3()
            .subVectors(parentPosition, this.previousParentPosition);
        
        const parentRotationDelta = new THREE.Quaternion()
            .multiplyQuaternions(parentRotation, this.previousParentRotation.clone().invert());

        // Update our position using the relative offset from parent plus the delta
        this.transform.position.copy(parentPosition).add(this.relativePositionOffset);

        // Apply parent's rotation delta to our relative rotation
        this.transform.rotation.copy(this.relativeRotationOffset);
        this.transform.rotation.multiplyQuaternions(parentRotation, this.relativeRotationOffset);
        this.transform.rotation.normalize();

        // Store the current parent transform for next update
        this.previousParentPosition.copy(parentPosition);
        this.previousParentRotation.copy(parentRotation);
    }

    /**
     * Runtime hierarchy helpers (do not rely on editor BNode tree)
     */
    setParent(parent: GameObject | null): void {
        this.parent = parent;
        
        if (parent) {
            // Calculate initial relative offsets from the parent
            this.relativePositionOffset.subVectors(this.transform.position, parent.transform.position);
            this.relativeRotationOffset.multiplyQuaternions(
                this.transform.rotation,
                parent.transform.rotation.clone().invert()
            );
            
            // Store initial parent transform
            this.previousParentPosition.copy(parent.transform.position);
            this.previousParentRotation.copy(parent.transform.rotation);
        } else {
            // No parent, reset offsets
            this.relativePositionOffset.set(0, 0, 0);
            this.relativeRotationOffset.set(0, 0, 0, 1);
            this.previousParentPosition.set(0, 0, 0);
            this.previousParentRotation.set(0, 0, 0, 1);
        }
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
