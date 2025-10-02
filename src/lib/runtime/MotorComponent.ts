// @ts-nocheck
import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import RAPIER from "@dimforge/rapier3d-compat";
import { sceneStore } from "$lib/sceneStore";
import { runtimeStore } from "$lib/runtimeStore";
import { PhysicsComponent } from "./PhysicsComponent";

/**
 * MotorComponent handles revolute motors between a host BPart and a wheel BPart.
 * The motor connects at the host's center with Y-axis as the rotation axis.
 *
 * Setup:
 * - Place a BMotor as a child of a BPart (the host/knuckle)
 * - Select the wheel BPart in the properties panel
 * - The motor will rotate the wheel around the world Y-axis at the host's position
 */
export class MotorComponent extends Component {
    public joint: RAPIER.ImpulseJoint | null = null;
    private initialized: boolean = false;
    private currentMotorVelocity: number | null = null;
    private currentMotorMaxForce: number | null = null;
    private motorEnabled: boolean | null = null;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.init();
    }

    private init() {
        if (this.initialized) return;

        try {
            // Get physics world
            const physicsWorld = sceneStore.getPhysicsWorld();
            if (!physicsWorld) {
                throw new Error("Physics world not initialized");
            }

            // Cast bObject to BMotor
            const motorNode = this.gameObject.bObject as Types.BMotor;
            const manager = runtimeStore.getGameObjectManager();

            // Find the host part (parent of the motor)
            const hostGameObject = this.gameObject.getParent();
            if (
                !hostGameObject ||
                !(hostGameObject.bObject instanceof Types.BPart)
            ) {
                throw new Error(
                    "MotorComponent: BMotor must be a child of a BPart (host)"
                );
            }

            // Get the wheel part from the wheelPart reference
            if (!motorNode.wheelPart) {
                throw new Error(
                    "MotorComponent: BMotor must have a wheelPart selected"
                );
            }

            const wheelGameObject = manager?.getGameObject(
                motorNode.wheelPart.id
            );
            if (
                !wheelGameObject ||
                !(wheelGameObject.bObject instanceof Types.BPart)
            ) {
                throw new Error(
                    "MotorComponent: Could not find GameObject for wheelPart"
                );
            }

            // Get physics components
            const hostPhysics = hostGameObject.getComponent(
                PhysicsComponent
            ) as PhysicsComponent | null;
            const wheelPhysics = wheelGameObject.getComponent(
                PhysicsComponent
            ) as PhysicsComponent | null;

            if (
                !hostPhysics ||
                !wheelPhysics ||
                !hostPhysics.body ||
                !wheelPhysics.body
            ) {
                throw new Error(
                    "MotorComponent: PhysicsComponent or bodies missing on host or wheel"
                );
            }

            // Get current positions and rotations from the physics bodies
            const hostPos = hostPhysics.body.translation();
            const hostRot = hostPhysics.body.rotation();
            const wheelPos = wheelPhysics.body.translation();

            // Convert to THREE quaternions
            const qHost = new THREE.Quaternion(
                hostRot.x,
                hostRot.y,
                hostRot.z,
                hostRot.w
            );
            const qHostInv = qHost.clone().invert();

            // The anchor on the wheel is its own center.
            const anchorWheel = { x: 0.0, y: 0.0, z: 0.0 };

            // The anchor on the host is the wheel's position in the host's local space.
            const worldVecFromHostToWheel = new THREE.Vector3(
                wheelPos.x - hostPos.x,
                wheelPos.y - hostPos.y,
                wheelPos.z - hostPos.z
            );
            const anchorHost =
                worldVecFromHostToWheel.applyQuaternion(qHostInv);

            // Rotation axis: perpendicular to the line from host to wheel
            // This makes the wheel spin like a car wheel around the axle
            const hostToWheel = new THREE.Vector3(
                wheelPos.x - hostPos.x,
                wheelPos.y - hostPos.y,
                wheelPos.z - hostPos.z
            ).normalize();

            // Use the right vector (cross product with world up) as the rotation axis
            // This creates an axis perpendicular to both the connection direction and world up
            const worldUp = new THREE.Vector3(0, 1, 0);
            const motorAxisWorld = new THREE.Vector3()
                .crossVectors(worldUp, hostToWheel)
                .normalize();

            // If the axis is near zero (wheel is directly above/below), use world X as fallback
            if (motorAxisWorld.lengthSq() < 0.01) {
                motorAxisWorld.set(1, 0, 0);
            }

            // Transform the world axis to host's local space
            const motorAxisLocalHost = motorAxisWorld
                .clone()
                .applyQuaternion(qHostInv)
                .normalize();

            // Create revolute joint with the calculated axis
            const params = RAPIER.JointData.revolute(
                { x: anchorHost.x, y: anchorHost.y, z: anchorHost.z },
                anchorWheel,
                {
                    x: motorAxisLocalHost.x,
                    y: motorAxisLocalHost.y,
                    z: motorAxisLocalHost.z,
                }
            );

            this.joint = physicsWorld.createImpulseJoint(
                params,
                hostPhysics.body,
                wheelPhysics.body,
                true
            );

            // Configure the motor
            this.configureMotor(motorNode);

            runtimeStore.info(
                `Created motor joint between ${hostGameObject.bObject.name} and ${wheelGameObject.bObject.name}`,
                "MotorComponent"
            );

            this.initialized = true;
        } catch {
            // Probably retryable, usually because physics components on parts not ready yet
            // Silently fail and retry on next update
        }
    }

    public update(): void {
        if (!this.initialized) {
            this.init();
        }

        if (
            this.initialized &&
            this.joint &&
            this.gameObject.bObject instanceof Types.BMotor
        ) {
            this.applyMotorOverrides(this.gameObject.bObject);
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
        this.initialized = false;
        this.currentMotorVelocity = null;
        this.currentMotorMaxForce = null;
        this.motorEnabled = null;
    }

    onEnable(): void {
        this.init();
    }

    private configureMotor(motorNode: Types.BMotor): void {
        if (!this.joint) return;

        const velocity = motorNode.enabled ? motorNode.speed : 0;
        const maxForce = motorNode.maxForce;

        this.joint.configureMotorVelocity(velocity, maxForce);
        this.currentMotorVelocity = velocity;
        this.currentMotorMaxForce = maxForce;
        this.motorEnabled = motorNode.enabled;
    }

    private applyMotorOverrides(motorNode: Types.BMotor): void {
        if (!this.joint) return;

        const id = motorNode.id;
        const velocityOverride = runtimeStore.getPropertyOverride<number>(
            id,
            "speed"
        );
        const maxForceOverride = runtimeStore.getPropertyOverride<number>(
            id,
            "maxForce"
        );
        const enabledOverride = runtimeStore.getPropertyOverride<boolean>(
            id,
            "enabled"
        );

        const enabled = enabledOverride ?? motorNode.enabled;
        const velocity = enabled ? velocityOverride ?? motorNode.speed : 0;
        const maxForce = maxForceOverride ?? motorNode.maxForce;

        if (
            this.motorEnabled !== enabled ||
            this.currentMotorVelocity !== velocity ||
            this.currentMotorMaxForce !== maxForce
        ) {
            this.joint.configureMotorVelocity(velocity, maxForce);
            this.currentMotorVelocity = velocity;
            this.currentMotorMaxForce = maxForce;
            this.motorEnabled = enabled;
        }
    }
}
