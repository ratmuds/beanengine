import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import { PhysicsComponent } from "./PhysicsComponent";
import { runtimeStore } from "$lib/runtimeStore";
import { GameObjectManager } from "./GameObjectManager";

/**
 * PlayerControllerComponent handles player input for movement and camera control
 */
export class PlayerControllerComponent extends Component {
    private physicsComponent: PhysicsComponent | null = null;
    private playerController: Types.BPlayerController;
    private cameraGO: GameObject | null = null;
    private cameraRotationX: number = 0; // Vertical rotation (pitch)
    private cameraRotationY: number = 0; // Horizontal rotation (yaw)

    constructor(gameObject: GameObject) {
        super(gameObject);

        // Ensure the gameObject has a BPlayerController
        if (!(gameObject.bNode instanceof Types.BPlayerController)) {
            throw new Error(
                "PlayerControllerComponent can only be attached to BPlayerController objects"
            );
        }

        this.playerController = gameObject.bNode as Types.BPlayerController;

        // Find physics component
        this.physicsComponent = gameObject.getComponent(PhysicsComponent);
        if (!this.physicsComponent) {
            console.warn(
                "PlayerControllerComponent: No PhysicsComponent found on GameObject"
            );
        }

        // Find parented camera GameObject
        console.log("START finding camera...", this.gameObject);
        this.findParentedCameraGO();
    }

    private findParentedCameraGO(): void {
        // Walk runtime GameObject hierarchy instead of Types
        const children = this.gameObject.getChildren();
        for (const child of children) {
            if (child.bNode instanceof Types.BCamera) {
                this.cameraGO = child;
                break;
            }
        }
    }

    update(delta: number): void {
        if (!this.enabled) return;

        this.handleMovement(delta);
        this.handleMouseLook(delta);
    }

    private handleMovement(delta: number): void {
        if (!this.physicsComponent) return;

        const movementVector = new Types.BVector3(0, 0, 0);
        const speed = this.playerController.moveSpeed;

        // WASD movement
        if (runtimeStore.getKey("w") || runtimeStore.getKey("W")) {
            movementVector.z -= speed;
        }
        if (runtimeStore.getKey("s") || runtimeStore.getKey("S")) {
            movementVector.z += speed;
        }
        if (runtimeStore.getKey("a") || runtimeStore.getKey("A")) {
            movementVector.x -= speed;
        }
        if (runtimeStore.getKey("d") || runtimeStore.getKey("D")) {
            movementVector.x += speed;
        }

        // Space for jump/up movement
        if (runtimeStore.getKey(" ")) {
            movementVector.y += speed;
        }

        // Apply movement relative to player rotation
        if (
            movementVector.x !== 0 ||
            movementVector.y !== 0 ||
            movementVector.z !== 0
        ) {
            // Create rotation matrix from current Y rotation (yaw)
            const rotationMatrix = new THREE.Matrix4().makeRotationY(
                this.cameraRotationY
            );
            const worldMovement = new THREE.Vector3(
                movementVector.x,
                movementVector.y,
                movementVector.z
            ).applyMatrix4(rotationMatrix);

            // Apply force through physics component
            this.physicsComponent.setDirectionalForce(
                new Types.BVector3(
                    worldMovement.x,
                    worldMovement.y,
                    worldMovement.z
                )
            );
        }
    }

    private handleMouseLook(delta: number): void {
        const mouseDelta = runtimeStore.getMouseDelta();

        if (mouseDelta.x === 0 && mouseDelta.y === 0) return;

        const sensitivity = this.playerController.mouseSensitivity;

        // Update rotation based on mouse movement
        this.cameraRotationY -= mouseDelta.x * sensitivity * delta; // Horizontal (yaw)
        this.cameraRotationX -= mouseDelta.y * sensitivity * delta; // Vertical (pitch)

        // Clamp vertical rotation if camera is present
        if (this.cameraGO) {
            const clampAngle = this.playerController.maxLookAngle;
            this.cameraRotationX = Math.max(
                (-clampAngle * Math.PI) / 180,
                Math.min((clampAngle * Math.PI) / 180, this.cameraRotationX)
            );
        }

        // Apply rotation to player controller GameObject (Y-axis only)
        const playerRotation = new THREE.Euler(0, this.cameraRotationY, 0);
        this.gameObject.localTransform.rotation.setFromEuler(playerRotation);
        this.gameObject.localTransform.rotation.normalize();

        // Apply rotation to camera child GameObject if present (X-axis only for pitch)
        if (this.cameraGO) {
            const cameraRotation = new THREE.Euler(
                this.cameraRotationX,
                0,
                0
            );
            this.cameraGO.localTransform.rotation.setFromEuler(cameraRotation);
            this.cameraGO.localTransform.rotation.normalize();
        }
    }

    onEnable(): void {
        // Re-find camera GO in case hierarchy changed
        this.findParentedCameraGO();
    }

    onDisable(): void {
        // Nothing specific to clean up
    }

    destroy(): void {
        this.physicsComponent = null;
        this.cameraGO = null;
    }
}
