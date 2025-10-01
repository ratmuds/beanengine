// @ts-nocheck
import * as THREE from "three";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import * as Types from "$lib/types";

/**
 * CameraComponent owns a THREE.PerspectiveCamera and keeps it in sync
 * with its GameObject's transform each frame.
 */
export class CameraComponent extends Component {
    private camera: THREE.Camera;

    constructor(gameObject: GameObject) {
        super(gameObject);

        const bNode = gameObject.bObject;
        const aspect = window.innerWidth / window.innerHeight || 16 / 9;

        if (bNode instanceof Types.BCamera) {
            // Initialize from BCamera properties
            if (bNode.projectionType === "orthographic") {
                const halfHeight = bNode.orthographicSize ?? 5;
                const halfWidth = halfHeight * (bNode.aspectRatio || aspect);
                this.camera = new THREE.OrthographicCamera(
                    -halfWidth,
                    halfWidth,
                    halfHeight,
                    -halfHeight,
                    bNode.nearClipPlane ?? 0.1,
                    bNode.farClipPlane ?? 1000
                );
            } else {
                // default to perspective
                const fov = bNode.fieldOfView ?? 75;
                const near = bNode.nearClipPlane ?? 0.1;
                const far = bNode.farClipPlane ?? 1000;
                const a = bNode.aspectRatio || aspect;
                const persp = new THREE.PerspectiveCamera(fov, a, near, far);
                this.camera = persp;
            }
        } else {
            // Fallback camera
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        }

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
        if (!Number.isFinite(aspect) || aspect <= 0) return;

        if ((this.camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            const cam = this.camera as THREE.PerspectiveCamera;
            if (cam.aspect !== aspect) {
                cam.aspect = aspect;
                cam.updateProjectionMatrix();
            }
        } else if (
            (this.camera as THREE.OrthographicCamera).isOrthographicCamera
        ) {
            const cam = this.camera as THREE.OrthographicCamera;
            // Keep vertical size (top/bottom) constant, adjust left/right by aspect
            const height = cam.top - cam.bottom;
            const halfHeight = height / 2;
            const halfWidth = halfHeight * aspect;
            cam.left = -halfWidth;
            cam.right = halfWidth;
            cam.updateProjectionMatrix();
        }
    }

    getCamera(): THREE.Camera {
        return this.camera;
    }

    destroy(): void {
        // Nothing to explicitly dispose on camera for now
        super.destroy();
    }
}
