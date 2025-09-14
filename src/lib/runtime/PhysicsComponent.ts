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
                gameObject.worldTransform.scale.x / 2,
                gameObject.worldTransform.scale.y / 2,
                gameObject.worldTransform.scale.z / 2
            ),
            this.body
        );

        // Apply initial position and rotation from GameObject
        this.body.setTranslation(
            new RAPIER.Vector3(
                gameObject.worldTransform.position.x,
                gameObject.worldTransform.position.y,
                gameObject.worldTransform.position.z
            ),
            true // wake up
        );

        this.body.setRotation(
            new RAPIER.Quaternion(
                gameObject.worldTransform.rotation.x,
                gameObject.worldTransform.rotation.y,
                gameObject.worldTransform.rotation.z,
                gameObject.worldTransform.rotation.w
            ),
            true // wake up
        );

        // Set old position and rotation
        this.oldPosition = new THREE.Vector3(
            gameObject.worldTransform.position.x,
            gameObject.worldTransform.position.y,
            gameObject.worldTransform.position.z
        );
        this.oldRotation = new THREE.Quaternion(
            gameObject.worldTransform.rotation.x,
            gameObject.worldTransform.rotation.y,
            gameObject.worldTransform.rotation.z,
            gameObject.worldTransform.rotation.w
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
        // Update GameObject's world transform from the physics body
        if (this.oldPosition === this.gameObject.worldTransform.position) {
            const position = this.body.translation();
            this.gameObject.worldTransform.position.set(
                position.x,
                position.y,
                position.z
            );
            this.oldPosition = this.gameObject.worldTransform.position;

            if (!this.gameObject.bNode.positionLocked) {
                console.log(this.oldPosition);
            }
        } else {
            // Moved externally
            console.warn(
                "external moved",
                this.oldPosition,
                this.gameObject.worldTransform.position
            );

            this.body.setTranslation(
                new RAPIER.Vector3(
                    this.gameObject.worldTransform.position.x,
                    this.gameObject.worldTransform.position.y,
                    this.gameObject.worldTransform.position.z
                ),
                true // wake up
            );

            this.oldPosition = this.gameObject.worldTransform.position;
        }

        if (this.oldRotation === this.gameObject.worldTransform.rotation) {
            const rotation = this.body.rotation();
            this.gameObject.worldTransform.rotation.set(
                rotation.x,
                rotation.y,
                rotation.z,
                rotation.w
            );
            this.oldRotation = this.gameObject.worldTransform.rotation;
        } else {
            // Rotated externally
            console.warn("external rotated");
            this.body.setRotation(
                new RAPIER.Quaternion(
                    this.gameObject.worldTransform.rotation.x,
                    this.gameObject.worldTransform.rotation.y,
                    this.gameObject.worldTransform.rotation.z,
                    this.gameObject.worldTransform.rotation.w
                ),
                true // wake up
            );
            this.oldRotation = this.gameObject.worldTransform.rotation;
        }

        // The scale is not changed by physics, so we keep the initial world scale.
        // We need to recompose the world matrix from the physics-updated transform.
        this.gameObject.worldMatrix.compose(
            this.gameObject.worldTransform.position,
            this.gameObject.worldTransform.rotation,
            this.gameObject.worldTransform.scale
        );

        // Since the physics simulation directly controls the world transform,
        // we need to calculate the new local transform relative to the parent.
        const parent = this.gameObject.getParent();
        if (parent) {
            const parentInverse = new THREE.Matrix4()
                .copy(parent.worldMatrix)
                .invert();
            const localMatrix = new THREE.Matrix4().multiplyMatrices(
                parentInverse,
                this.gameObject.worldMatrix
            );
            localMatrix.decompose(
                this.gameObject.localTransform.position,
                this.gameObject.localTransform.rotation,
                this.gameObject.localTransform.scale
            );
        } else {
            // No parent, so world transform is the local transform
            this.gameObject.localTransform.position.copy(
                this.gameObject.worldTransform.position
            );
            this.gameObject.localTransform.rotation.copy(
                this.gameObject.worldTransform.rotation
            );
            this.gameObject.localTransform.scale.copy(
                this.gameObject.worldTransform.scale
            );
        }
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
