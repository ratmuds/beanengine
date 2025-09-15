import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import RAPIER from "@dimforge/rapier3d-compat";
import { sceneStore } from "$lib/sceneStore";
import { runtimeStore } from "$lib/runtimeStore";

/**
 * PhysicsComponent handles physics simulation for GameObjects
 */
export class PhysicsComponent extends Component {
    public body: RAPIER.RigidBody;
    public collider: RAPIER.Collider;

    private oldPosition: THREE.Vector3;
    private oldRotation: THREE.Quaternion;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.gameObject.isPhysicsDriven = true;

        // Get physics world
        const physicsWorld = sceneStore.getPhysicsWorld();
        if (!physicsWorld) {
            throw new Error("Physics world not initialized");
        }

        // Create rigid body
        this.body = physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
        );

        // Create collider
        // TODO: fix
        runtimeStore.warn(
            "Creating collider. It's a cube. Please fix later. The collision shape will always be a cube.",
            "PhysicsComponent"
        );
        runtimeStore.warn(
            "also any changes to the physical stuff to the object after this is ignored so that should also be fixed",
            "PhysicsComponent"
        );

        this.collider = physicsWorld.createCollider(
            // Divide by two because Rapier expects half-extents
            RAPIER.ColliderDesc.cuboid(
                gameObject.transform.scale.x / 2,
                gameObject.transform.scale.y / 2,
                gameObject.transform.scale.z / 2
            ),
            this.body
        );

        // Apply initial position and rotation from GameObject
        this.body.setTranslation(
            new RAPIER.Vector3(
                gameObject.transform.position.x,
                gameObject.transform.position.y,
                gameObject.transform.position.z
            ),
            true // wake up
        );

        this.body.setRotation(
            new RAPIER.Quaternion(
                gameObject.transform.rotation.x,
                gameObject.transform.rotation.y,
                gameObject.transform.rotation.z,
                gameObject.transform.rotation.w
            ),
            true // wake up
        );

        // Set old position and rotation
        this.oldPosition = new THREE.Vector3(
            gameObject.transform.position.x,
            gameObject.transform.position.y,
            gameObject.transform.position.z
        );
        this.oldRotation = new THREE.Quaternion(
            gameObject.transform.rotation.x,
            gameObject.transform.rotation.y,
            gameObject.transform.rotation.z,
            gameObject.transform.rotation.w
        );

        // Apply locks based on object properties
        this.applyLocks();
    }

    public setDirectionalForce(direction: Types.BVector3) {
        this.body.addForce(
            new RAPIER.Vector3(direction.x, direction.y, direction.z),
            true // wake up
        );
    }

    public addDirectionalImpulse(direction: Types.BVector3) {
        this.body.applyImpulse(
            new RAPIER.Vector3(direction.x, direction.y, direction.z),
            true // wake up
        );
    }

    private applyLocks(): void {
        // Check if the gameObject's data is a BPart with lock properties
        if (this.gameObject.bNode instanceof Types.BPart) {
            const part = this.gameObject.bNode as Types.BPart;

            // Apply position lock if enabled
            if (part.positionLocked) {
                this.body.lockTranslations(true, true); // lock translation, wake up
            } else {
                this.body.lockTranslations(false, true); // unlock translation, wake up
            }

            // Apply rotation lock if enabled
            if (part.rotationLocked) {
                this.body.lockRotations(true, true); // lock rotation, wake up
            } else {
                this.body.lockRotations(false, true); // unlock rotation, wake up
            }
        }
    }

    update(_delta: number): void {
        // Update GameObject's transform from the physics body
        if (
            this.oldPosition.x === this.gameObject.transform.position.x &&
            this.oldPosition.y === this.gameObject.transform.position.y &&
            this.oldPosition.z === this.gameObject.transform.position.z
        ) {
            const position = this.body.translation();
            this.gameObject.transform.position.set(
                position.x,
                position.y,
                position.z
            );
            this.oldPosition.copy(this.gameObject.transform.position);
        } else {
            // Moved externally
            this.body.setTranslation(
                new RAPIER.Vector3(
                    this.gameObject.transform.position.x,
                    this.gameObject.transform.position.y,
                    this.gameObject.transform.position.z
                ),
                true // wake up
            );

            this.oldPosition.copy(this.gameObject.transform.position);
        }

        if (
            this.oldRotation.x === this.gameObject.transform.rotation.x &&
            this.oldRotation.y === this.gameObject.transform.rotation.y &&
            this.oldRotation.z === this.gameObject.transform.rotation.z &&
            this.oldRotation.w === this.gameObject.transform.rotation.w
        ) {
            const rotation = this.body.rotation();
            this.gameObject.transform.rotation.set(
                rotation.x,
                rotation.y,
                rotation.z,
                rotation.w
            );
            this.oldRotation.copy(this.gameObject.transform.rotation);
        } else {
            // Rotated externally
            this.body.setRotation(
                new RAPIER.Quaternion(
                    this.gameObject.transform.rotation.x,
                    this.gameObject.transform.rotation.y,
                    this.gameObject.transform.rotation.z,
                    this.gameObject.transform.rotation.w
                ),
                true // wake up
            );
            this.oldRotation.copy(this.gameObject.transform.rotation);
        }

        // The scale is not changed by physics, so we keep the initial scale.
        // We need to recompose the world matrix from the physics-updated transform.
        this.gameObject.worldMatrix.compose(
            this.gameObject.transform.position,
            this.gameObject.transform.rotation,
            this.gameObject.transform.scale
        );
    }

    /**
     * Clean up physics resources when component is destroyed
     */
    onDisable(): void {
        this.cleanup();
    }

    destroy(): void {
        this.cleanup();
        super.destroy();
    }

    private cleanup(): void {
        const physicsWorld = sceneStore.getPhysicsWorld();
        if (
            physicsWorld &&
            this.collider &&
            physicsWorld.colliders.contains(this.collider.handle)
        ) {
            physicsWorld.removeCollider(this.collider, true);
        }
        if (
            physicsWorld &&
            this.body &&
            physicsWorld.bodies.contains(this.body.handle)
        ) {
            physicsWorld.removeRigidBody(this.body);
        }

        // Clear references
        this.collider = null;
        this.body = null;
    }
}
