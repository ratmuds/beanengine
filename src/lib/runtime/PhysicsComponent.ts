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

    constructor(gameObject: GameObject) {
        super(gameObject);

        // Get physics world
        const physicsWorld = sceneStore.getPhysicsWorld();

        // Create rigid body
        this.body = physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
        );

        // Create collider
        this.collider = physicsWorld.createCollider(
            RAPIER.ColliderDesc.cuboid(1, 1, 1),
            this.body
        );
    }

    update(delta: number): void {
        let position = this.body.translation();
        this.gameObject.transform.position.set(
            position.x,
            position.y,
            position.z
        );
    }
}
