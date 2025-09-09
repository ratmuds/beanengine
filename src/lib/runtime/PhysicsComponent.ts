import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import RAPIER from "@dimforge/rapier3d-compat";
import { sceneStore } from "$lib/sceneStore";

/**
 * PhysicsComponent handles physics simulation for GameObjects
 */
export class PhysicsComponent extends Component {
    public body: RAPIER.RigidBody;
    public collider: RAPIER.Collider;

    private oldPosition: THREE.Vector3;
    private oldRotation: THREE.Quaternion;
    private oldScale: THREE.Vector3;

    constructor(gameObject: GameObject) {
        super(gameObject);

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
        console.warn(
            "[PhysicsComponent] Creating collider. It's a cube. Please fix later. The collision shape will always be a cube."
        );
        console.warn(
            "also any changes to the physical stuff to the object after this is ignored so that should also be fixed"
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
        console.log(gameObject.transform);
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

        // Apply locks based on object properties
        this.applyLocks();
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
        // Update position from physics body
        const position = this.body.translation();
        this.gameObject.transform.position.set(
            position.x,
            position.y,
            position.z
        );

        // Update rotation from physics body - direct quaternion assignment
        const rotation = this.body.rotation();
        this.gameObject.transform.rotation.set(
            rotation.x,
            rotation.y,
            rotation.z,
            rotation.w
        );
        this.gameObject.transform.rotation.normalize();
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
