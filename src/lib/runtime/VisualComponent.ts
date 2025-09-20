import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";

/**
 * VisualComponent handles THREE.js mesh creation and rendering for GameObjects
 */
export class VisualComponent extends Component {
    public mesh: THREE.Mesh | null = null;
    public light: THREE.Light | null = null;
    private scene: THREE.Scene;

    constructor(gameObject: GameObject, scene: THREE.Scene) {
        super(gameObject);
        this.scene = scene;
        this.createVisualRepresentation();
    }

    /**
     * Create the appropriate THREE.js object based on the BNode3D type
     */
    private createVisualRepresentation(): void {
        const bNode = this.gameObject.bObject;

        if (bNode instanceof Types.BPart) {
            this.createPartMesh(bNode);
        } else if (bNode instanceof Types.BCamera) {
            this.createCameraVisual(bNode);
        } else if (bNode instanceof Types.BLight) {
            this.createLightVisual(bNode);
        } else if (bNode instanceof Types.BNode3D) {
            this.createDefaultVisual(bNode);
        }

        // Add to scene if we created a mesh
        if (this.mesh) {
            this.scene.add(this.mesh);
            this.updateMeshTransform();
        }

        // Add light to scene if we created one
        if (this.light) {
            this.scene.add(this.light);
            this.updateLightTransform();
        }
    }

    /**
     * Create mesh for BPart objects
     */
    private createPartMesh(part: Types.BPart): void {
        let geometry: THREE.BufferGeometry;

        if (part.meshSource?.type === "primitive") {
            switch (part.meshSource.value) {
                case "block":
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
                case "sphere":
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case "cylinder":
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case "cone":
                    geometry = new THREE.ConeGeometry(0.5, 1, 32);
                    break;
                case "plane":
                    geometry = new THREE.PlaneGeometry(1, 1);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }
        } else {
            // Default to box for non-primitive meshes
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        const material = new THREE.MeshStandardMaterial({
            color: part.color || "#ffffff",
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = part.id;
    }

    /**
     * Create visual representation for camera (wireframe cone)
     */
    private createCameraVisual(camera: Types.BCamera): void {
        const geometry = new THREE.ConeGeometry(0.5, 1, 4);
        const material = new THREE.MeshBasicMaterial({
            color: "#ffff00",
            wireframe: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = camera.id;
    }

    /**
     * Create visual representation and actual light for BLight
     */
    private createLightVisual(lightNode: Types.BLight): void {
        // Create visual representation (sphere)
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: lightNode.color || "#ffffff",
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = lightNode.id;

        // Create actual light
        this.light = new THREE.PointLight(lightNode.color || "#ffffff", 1, 100);
        this.light.name = lightNode.id + "_light";
    }

    /**
     * Create default visual representation for other BNode3D objects
     */
    private createDefaultVisual(bNode: Types.BNode3D): void {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            color: "#888888",
            wireframe: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = bNode.id;
    }

    /**
     * Update mesh transform from GameObject transform
     */
    private updateMeshTransform(): void {
        if (this.mesh) {
            const transform = this.gameObject.transform;
            this.mesh.position.set(
                transform.position.x,
                transform.position.y,
                transform.position.z
            );
            this.mesh.quaternion.copy(transform.rotation);
            this.mesh.scale.copy(transform.scale);

            // Force THREE.js to update the transformation matrices
            this.mesh.updateMatrix();
            this.mesh.updateMatrixWorld(true);
        }
    }

    /**
     * Update light transform from GameObject transform
     */
    private updateLightTransform(): void {
        if (this.light) {
            const transform = this.gameObject.transform;
            this.light.position.copy(transform.position);

            // Force THREE.js to update the transformation matrices
            this.light.updateMatrix();
            this.light.updateMatrixWorld(true);
        }
    }

    /**
     * Update component - sync visual representation with transform
     */
    update(_delta: number): void {
        this.updateMeshTransform();
        this.updateLightTransform();
    }

    onEnable(): void {
        if (this.mesh && !this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        if (this.light && !this.scene.children.includes(this.light)) {
            this.scene.add(this.light);
        }
    }

    onDisable(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.light) {
            this.scene.remove(this.light);
        }
    }

    /**
     * Get the THREE.js mesh for external access
     */
    getMesh(): THREE.Mesh | null {
        return this.mesh;
    }

    /**
     * Get the THREE.js light for external access
     */
    getLight(): THREE.Light | null {
        return this.light;
    }

    /**
     * Clean up when component is destroyed
     */
    destroy(): void {
        this.onDisable();
        if (this.mesh) {
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            }
            this.mesh = null;
        }
        if (this.light) {
            this.light = null;
        }

        super.destroy();
    }
}
