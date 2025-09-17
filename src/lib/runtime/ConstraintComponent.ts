import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import RAPIER from "@dimforge/rapier3d-compat";
import { sceneStore } from "$lib/sceneStore";
import { runtimeStore } from "$lib/runtimeStore";
import { PhysicsComponent } from "./PhysicsComponent";

/**
 * ConstraintComponent handles constraints between GameObjects
 */
export class ConstraintComponent extends Component {
    public joint: RAPIER.ImpulseJoint;

    constructor(gameObject: GameObject) {
        super(gameObject);

        // Get physics world
        const physicsWorld = sceneStore.getPhysicsWorld();
        if (!physicsWorld) {
            throw new Error("Physics world not initialized");
        }

        // Cast bNode to BConstraint to access partA and partB
        const constraintNode = gameObject.bNode as unknown as Types.BConstraint;
        const manager = runtimeStore.getGameObjectManager();
        const partA = constraintNode.partA;
        const partB = constraintNode.partB;
        const goA = manager?.getGameObject(partA.id);
        const goB = manager?.getGameObject(partB.id);
        if (!goA || !goB) {
            throw new Error("ConstraintComponent: Could not find GameObjects for partA or partB");
        }
        const physA = goA.getComponent(PhysicsComponent) as PhysicsComponent;
        const physB = goB.getComponent(PhysicsComponent) as PhysicsComponent;
        if (!physA || !physB) {
            throw new Error("ConstraintComponent: PhysicsComponent missing on partA or partB GameObject");
        }

        // Create joint between the two physics bodies
        let params = RAPIER.JointData.fixed(
            { x: 0.0, y: 0.0, z: 0.0 }, { w: 1.0, x: 0.0, y: 0.0, z: 0.0 },
            { x: 0.0, y: -2.0, z: 0.0 }, { w: 1.0, x: 0.0, y: 0.0, z: 0.0 }
        );
        this.joint = physicsWorld.createImpulseJoint(params, physA.body, physB.body, true);
    }

    public update(): void {
        // Nothing here right now...
        // Later maybe fetch the force applied by the joint for breakable constraints.
    }
}