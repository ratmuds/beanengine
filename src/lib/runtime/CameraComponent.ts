import * as THREE from "three";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import * as Types from "$lib/types";

/**
 * CameraComponent owns a THREE.PerspectiveCamera and keeps it in sync
 * with its GameObject's transform each frame.
 */
export class CameraComponent extends Component {
    private camera: THREE.PerspectiveCamera;

    constructor(gameObject: GameObject) {
        super(gameObject);

        const bNode = gameObject.bNode;
        const fov =
            bNode instanceof Types.BCamera ? bNode.fieldOfView ?? 75 : 75;
        this.camera = new THREE.PerspectiveCamera(
            fov,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Initialize from current transform
        this.syncFromTransform();
    }

    update(delta: number): void {
        // consume delta to satisfy eslint no-unused-vars
        void delta;
        this.syncFromTransform();
    }

    private syncFromTransform(): void {
        const t = this.gameObject.transform;
        this.camera.position.set(t.position.x, t.position.y, t.position.z);
        this.camera.quaternion.copy(t.rotation);
        this.camera.updateMatrix();
        this.camera.updateMatrixWorld(true);
    }

    // Update the camera's aspect ratio and projection
    setAspect(aspect: number): void {
        if (this.camera.aspect !== aspect && Number.isFinite(aspect) && aspect > 0) {
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();
        }
    }

    getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    destroy(): void {
        // Nothing to explicitly dispose on camera for now
        super.destroy();
    }
}
