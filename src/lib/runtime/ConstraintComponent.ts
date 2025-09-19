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
    private intialized: boolean = false;
    private gameObject: GameObject;

    constructor(gameObject: GameObject) {
        super(gameObject);

        this.gameObject = gameObject;
        this.init();
    }

    private init() {
        if (this.intialized) return;

        try {
            // Get physics world
            const physicsWorld = sceneStore.getPhysicsWorld();
            if (!physicsWorld) {
                throw new Error("Physics world not initialized");
            }

            // Cast bObject to BConstraint to access partA and partB
            const constraintNode = this.gameObject
                .bObject as unknown as Types.BConstraint;
            const manager = runtimeStore.getGameObjectManager();
            const partA = constraintNode.partA;
            const partB = constraintNode.partB;
            const goA = manager?.getGameObject(partA.id);
            const goB = manager?.getGameObject(partB.id);
            if (!goA || !goB) {
                throw new Error(
                    "ConstraintComponent: Could not find GameObjects for partA or partB"
                );
            }

            const physA = goA.getComponent(
                PhysicsComponent
            ) as PhysicsComponent;
            const physB = goB.getComponent(
                PhysicsComponent
            ) as PhysicsComponent;
            if (!physA || !physB) {
                throw new Error(
                    "ConstraintComponent: PhysicsComponent missing on partA or partB GameObject"
                );
            }

            // We need to calculate the local frames for the joint, keeping both parts in the correct world position:
            // Choose body A's local frame as identity (anchor at its center, no rotation).
            // Compute body B's local frame so that: T_A = T_B * F2  =>  F2 = inv(T_B) * T_A
            // Therefore: rot2 = inv(rotB) * rotA,  anchor2 = inv(rotB) * (posA - posB)

            // Get current positions and rotations from the physics bodies
            const posA = physA.body.translation();
            const rotA = physA.body.rotation();
            const posB = physB.body.translation();
            const rotB = physB.body.rotation();

            // Convert to THREE for safer quaternion math
            const qA = new THREE.Quaternion(rotA.x, rotA.y, rotA.z, rotA.w);
            const qB = new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w);
            const qBInv = qB.clone().invert();

            // rot2 = inv(RB) * RA
            const rot2Three = qBInv.clone().multiply(qA).normalize();

            // anchor2 = inv(RB) * (pA - pB)
            const delta = new THREE.Vector3(
                posA.x - posB.x,
                posA.y - posB.y,
                posA.z - posB.z
            ).applyQuaternion(qBInv);

            // Create joint with calculated local frames
            const params = RAPIER.JointData.fixed(
                { x: 0.0, y: 0.0, z: 0.0 },
                { w: 1.0, x: 0.0, y: 0.0, z: 0.0 },
                { x: delta.x, y: delta.y, z: delta.z },
                {
                    w: rot2Three.w,
                    x: rot2Three.x,
                    y: rot2Three.y,
                    z: rot2Three.z,
                }
            );
            this.joint = physicsWorld.createImpulseJoint(
                params,
                physA.body,
                physB.body,
                true
            );

            runtimeStore.info(
                `Created joint between ${partA.id} and ${partB.id}`,
                "ConstraintComponent"
            );

            this.intialized = true;
        } catch {
            // prob retryable, usually because physics components on parts not ready yet
        }
    }

    public update(): void {
        if (!this.intialized) {
            this.init();
        }
    }
}
