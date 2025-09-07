import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";

/**
 * Transform data that can be shared between components
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
        this.transform = {
            position: new THREE.Vector3().copy(bNode.position),
            rotation: new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    bNode.rotation.x,
                    bNode.rotation.y,
                    bNode.rotation.z
                )
            ),
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
     * Sync transform back to BNode3D (useful for editor integration)
     */
    syncToBNode(): void {
        this.bNode.position.copy(this.transform.position);

        // Convert quaternion back to Euler for BNode3D
        const euler = new THREE.Euler().setFromQuaternion(
            this.transform.rotation
        );
        this.bNode.rotation.set(euler.x, euler.y, euler.z);

        this.bNode.scale.copy(this.transform.scale);
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
