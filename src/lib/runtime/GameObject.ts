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
    public transform: Transform;
    private components: Component[] = [];
    private componentMap: Map<string, Component> = new Map();

    constructor(bNode: Types.BNode3D) {
        this.id = bNode.id;
        this.bNode = bNode;

        // Initialize transform from BNode3D
        // Convert Euler angles from BNode3D to quaternions for runtime
        this.transform = {
            position: new THREE.Vector3().copy(bNode.position),
            rotation: RotationUtils.eulerToNormalizedQuaternion(bNode.rotation),
            scale: new THREE.Vector3().copy(bNode.scale),
        };
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
    }
}
