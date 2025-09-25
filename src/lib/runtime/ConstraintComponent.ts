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
    public joint: RAPIER.ImpulseJoint | null = null;
    private intialized: boolean = false;

    constructor(gameObject: GameObject) {
        super(gameObject);
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
            if (!partA || !partB) {
                throw new Error("ConstraintComponent: partA or partB is not set on BConstraint");
            }
            const goA = manager?.getGameObject(partA.id);
            const goB = manager?.getGameObject(partB.id);
            if (!goA || !goB) {
                throw new Error(
                    "ConstraintComponent: Could not find GameObjects for partA or partB"
                );
            }

            const physA = goA.getComponent(
                PhysicsComponent
            ) as PhysicsComponent | null;
            const physB = goB.getComponent(
                PhysicsComponent
            ) as PhysicsComponent | null;
            if (!physA || !physB || !physA.body || !physB.body) {
                throw new Error(
                    "ConstraintComponent: PhysicsComponent or bodies missing on partA or partB GameObject"
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

            // We'll build the appropriate joint descriptor based on the selected type.
            let params: RAPIER.JointData | undefined;

            // Common anchors: keep body A's anchor at its local origin, and place body B's
            // anchor so both coincide in world space at creation time.
            const anchorA = { x: 0.0, y: 0.0, z: 0.0 } as const;
            const anchorB = { x: delta.x, y: delta.y, z: delta.z } as const;

            // Compute a couple of default axes we may use for joints.
            // World X as a robust default.
            const worldXAxis = new THREE.Vector3(1, 0, 0);
            // World direction from A to B (fallback to X if degenerate).
            const dirABWorld = new THREE.Vector3(
                posB.x - posA.x,
                posB.y - posA.y,
                posB.z - posA.z
            );
            if (dirABWorld.lengthSq() < 1e-6) dirABWorld.copy(worldXAxis);
            dirABWorld.normalize();

            if (constraintNode.constraintType === "fixed") {
                params = RAPIER.JointData.fixed(
                    anchorA,
                    { w: 1.0, x: 0.0, y: 0.0, z: 0.0 },
                    anchorB,
                    {
                        w: rot2Three.w,
                        x: rot2Three.x,
                        y: rot2Three.y,
                        z: rot2Three.z,
                    }
                );
            } else if (constraintNode.constraintType === "spherical") {
                params = RAPIER.JointData.spherical(
                    anchorA,
                    anchorB,
                );
            } else if (constraintNode.constraintType === "revolute") {
                // Revolute axis: default to world X.
                const axis = { x: worldXAxis.x, y: worldXAxis.y, z: worldXAxis.z } as const;
                params = RAPIER.JointData.revolute(
                    anchorA,
                    anchorB,
                    axis
                );
            } else if (constraintNode.constraintType === "prismatic") {
                // Prismatic axis: along the line from A to B.
                const axis = { x: dirABWorld.x, y: dirABWorld.y, z: dirABWorld.z } as const;
                params = RAPIER.JointData.prismatic(
                    anchorA,
                    anchorB,
                    axis
                );
                // Apply limits if enabled
                if (constraintNode.prismaticLimitsEnabled) {
                    // The signed distance is (anchor2 - anchor1) dot axis1 per Rapier docs.
                    // Here we just pass the configured limits.
                    // Types are permissive on JointData so we can mutate flags/limits directly.
                    (params as any).limitsEnabled = true;
                    (params as any).limits = [
                        constraintNode.prismaticLimitsMin,
                        constraintNode.prismaticLimitsMax,
                    ];
                }
            } else if (constraintNode.constraintType === "spring") {
                // Calculate distance between the two bodies to use as rest length for a spring joint
                const restLength = delta.length();
                params = RAPIER.JointData.spring(
                    restLength,
                    constraintNode.stiffness ?? 100.0,
                    constraintNode.damping ?? 0.3,
                    anchorA,
                    anchorB
                );
            } else {
                // Fallback to fixed if type is unknown or unsupported.
                params = RAPIER.JointData.fixed(
                    anchorA,
                    { w: 1.0, x: 0.0, y: 0.0, z: 0.0 },
                    anchorB,
                    {
                        w: rot2Three.w,
                        x: rot2Three.x,
                        y: rot2Three.y,
                        z: rot2Three.z,
                    }
                );
            }

            if (!params) return; // nothing to create
            this.joint = physicsWorld.createImpulseJoint(
                params,
                physA.body,
                physB.body,
                true
            );

            runtimeStore.info(
                `Created ${constraintNode.constraintType} joint between ${partA.id} and ${partB.id}`,
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

    onDisable(): void {
        if (this.joint) {
            const physicsWorld = sceneStore.getPhysicsWorld();
            try {
                physicsWorld?.removeImpulseJoint(this.joint, true);
            } catch {
                // ignore
            }
            this.joint = null;
        }
        this.intialized = false;
    }

    onEnable(): void {
        this.init();
    }
}
