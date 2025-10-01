// @ts-nocheck
import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import RAPIER from "@dimforge/rapier3d-compat";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sceneStore } from "$lib/sceneStore";
import { runtimeStore } from "$lib/runtimeStore";
import { assetStore } from "$lib/assetStore";

/**
 * PhysicsComponent handles physics simulation for GameObjects
 */
export class PhysicsComponent extends Component {
    public body: RAPIER.RigidBody | null;
    public collider: RAPIER.Collider | null;

    private previousPosition: THREE.Vector3;
    private previousRotation: THREE.Quaternion;
    private previousScale: THREE.Vector3;
    private hasConvexHullCollider = false;
    // Guards to prevent spamming convex hull generation every frame
    private isBuildingConvexHull = false;
    private pendingConvexHullRebuild = false;
    private lastConvexHullAttemptMs = 0;
    private convexHullAttemptCooldownMs = 1000; // ms between attempts when not yet possible
    private previousCanCollide: boolean | null = null;
    private currentCollisionGroups: number | null = null;
    private currentSolverGroups: number | null = null;
    private currentActiveCollisionTypes: number | null = null;
    private currentActiveEvents: number | null = null;
    private currentActiveHooks: number | null = null;

    // Deduplicate mesh processing across instances by asset id
    private static pendingHullByAsset: Map<
        string,
        Promise<{
            centeredPoints: Float32Array;
            originalCenter: THREE.Vector3;
        }>
    > = new Map();

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

        // Create initial collider based on primitive type or a box fallback
        this.collider = physicsWorld.createCollider(
            this.createInitialColliderDesc(),
            this.body
        );

        this.registerHandles();
        this.enableCollisionEvents();

        this.applyCollisionSettings();

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

        // Store initial transform values for change detection
        this.previousPosition = new THREE.Vector3(
            gameObject.transform.position.x,
            gameObject.transform.position.y,
            gameObject.transform.position.z
        );
        this.previousRotation = new THREE.Quaternion(
            gameObject.transform.rotation.x,
            gameObject.transform.rotation.y,
            gameObject.transform.rotation.z,
            gameObject.transform.rotation.w
        );
        this.previousScale = new THREE.Vector3(
            gameObject.transform.scale.x,
            gameObject.transform.scale.y,
            gameObject.transform.scale.z
        );

        // Apply locks based on object properties
        this.applyLocks();

        // Attempt to build a convex-hull collider (async if needed)
        void this.tryBuildConvexHullCollider();
    }

    private createInitialColliderDesc(): RAPIER.ColliderDesc {
        const scale = this.gameObject.transform.scale;
        const partObject = this.gameObject.bObject;

        if (
            partObject instanceof Types.BPart &&
            partObject.meshSource?.type === "primitive"
        ) {
            switch (partObject.meshSource.value) {
                case "sphere": {
                    const radius = 0.5 * Math.max(scale.x, scale.y, scale.z);
                    return RAPIER.ColliderDesc.ball(radius);
                }
                case "cylinder": {
                    const halfHeight = scale.y / 2;
                    const radius = 0.5 * Math.max(scale.x, scale.z);
                    return RAPIER.ColliderDesc.cylinder(halfHeight, radius);
                }
                case "cone": {
                    const halfHeight = scale.y / 2;
                    const radius = 0.5 * Math.max(scale.x, scale.z);
                    return RAPIER.ColliderDesc.cone(halfHeight, radius);
                }
                default: {
                    return RAPIER.ColliderDesc.cuboid(
                        scale.x / 2,
                        scale.y / 2,
                        scale.z / 2
                    );
                }
            }
        }

        // Default to box collider
        return RAPIER.ColliderDesc.cuboid(
            scale.x / 2,
            scale.y / 2,
            scale.z / 2
        );
    }

    private replaceCollider(desc: RAPIER.ColliderDesc) {
        const physicsWorld = sceneStore.getPhysicsWorld();
        if (!physicsWorld || !this.body) return;
        if (
            this.collider &&
            physicsWorld.colliders.contains(this.collider.handle)
        ) {
            this.unregisterColliderHandle();
            physicsWorld.removeCollider(this.collider, true);
        }
        this.collider = physicsWorld.createCollider(desc, this.body);
        this.registerColliderHandle();
        this.enableCollisionEvents();
        this.applyCollisionSettings();
        this.applyRuntimeColliderOverrides();
    }

    private applyCollisionSettings(): void {
        if (!(this.gameObject.bObject instanceof Types.BPart)) return;
        if (!this.collider) return;

        const partObject = this.gameObject.bObject as Types.BPart;
        this.previousCanCollide = partObject.canCollide;

        this.collider.setSensor(!partObject.canCollide);
    }

    private ensureCollisionSettingsSynced(): void {
        if (!(this.gameObject.bObject instanceof Types.BPart)) return;
        const partObject = this.gameObject.bObject as Types.BPart;

        if (this.previousCanCollide === null) {
            this.applyCollisionSettings();
            return;
        }

        if (partObject.canCollide !== this.previousCanCollide) {
            this.applyCollisionSettings();
        }
    }

    // Build a convex-hull collider from the asset mesh for more accurate physics
    private async tryBuildConvexHullCollider(
        forceRebuild = false
    ): Promise<void> {
        const partObject = this.gameObject.bObject;
        if (!(partObject instanceof Types.BPart)) return;

        const meshSource = partObject.meshSource;
        if (!meshSource || meshSource.type !== "asset") return;

        // If we already have a hull and we're not forcing, skip
        if (this.hasConvexHullCollider && !forceRebuild) return;

        // Cooldown attempts when asset isn't ready yet
        const now = Date.now();
        if (!forceRebuild && this.isBuildingConvexHull) return;
        if (
            !forceRebuild &&
            now - this.lastConvexHullAttemptMs <
                this.convexHullAttemptCooldownMs
        )
            return;
        this.lastConvexHullAttemptMs = now;
        this.isBuildingConvexHull = true;

        const assetId = meshSource.value;
        let cachedMeshData = runtimeStore.getConvexHullCache(assetId);

        if (!cachedMeshData) {
            // Deduplicate processing across instances
            const existing = PhysicsComponent.pendingHullByAsset.get(assetId);
            try {
                if (existing) {
                    cachedMeshData = await existing;
                } else {
                    const promise = this.processMeshForConvexHull(assetId);
                    PhysicsComponent.pendingHullByAsset.set(
                        assetId,
                        promise as Promise<{
                            centeredPoints: Float32Array;
                            originalCenter: THREE.Vector3;
                        }>
                    );
                    cachedMeshData = await promise;
                }
            } finally {
                // Clear pending entry regardless of success/failure
                PhysicsComponent.pendingHullByAsset.delete(assetId);
            }

            if (!cachedMeshData) {
                // Failed to process; set a cooldown and exit
                this.isBuildingConvexHull = false;
                return;
            }
        }

        // Apply current object scale to the cached mesh data
        const currentScale = this.gameObject.transform.scale;
        const scaledPoints = this.applyScaleToMeshPoints(
            cachedMeshData.centeredPoints,
            currentScale
        );

        // Create physics collider from scaled points
        const colliderDesc = RAPIER.ColliderDesc.convexHull(scaledPoints);
        if (!colliderDesc) {
            runtimeStore.warn(
                `Failed to create convex hull collider for asset ${assetId}`,
                "PhysicsComponent"
            );
            this.isBuildingConvexHull = false;
            return;
        }

        // Position the collider to align with the visual mesh
        const scaledCenter = {
            x: cachedMeshData.originalCenter.x * currentScale.x,
            y: cachedMeshData.originalCenter.y * currentScale.y,
            z: cachedMeshData.originalCenter.z * currentScale.z,
        };
        colliderDesc.setTranslation(
            scaledCenter.x,
            scaledCenter.y,
            scaledCenter.z
        );

        this.replaceCollider(colliderDesc);
        this.hasConvexHullCollider = true;

        runtimeStore.info(
            `Applied convex hull collider with ${
                scaledPoints.length / 3
            } points`,
            "PhysicsComponent"
        );

        // If a rebuild was requested during build (e.g., scale kept changing), schedule one more rebuild
        if (this.pendingConvexHullRebuild) {
            this.pendingConvexHullRebuild = false;
            // Force rebuild using cached points with updated scale; avoid tight loop by yielding
            setTimeout(() => void this.tryBuildConvexHullCollider(true), 0);
        }

        this.isBuildingConvexHull = false;
    }

    // Process a 3D model file and extract mesh data for convex hull generation
    private async processMeshForConvexHull(assetId: string): Promise<{
        centeredPoints: Float32Array;
        originalCenter: THREE.Vector3;
    } | null> {
        runtimeStore.info(
            `Processing mesh for convex hull: ${assetId}`,
            "PhysicsComponent"
        );

        const asset = assetStore.getAsset(assetId);
        const modelUrl = asset?.url;
        if (!modelUrl) return null;

        try {
            // Load the 3D model file
            const loadedModel = await this.loadGLTFModel(modelUrl);

            // Extract all vertex positions from all meshes in the model
            const allVertexPositions = this.extractVertexPositionsFromModel(
                loadedModel.scene
            );

            if (allVertexPositions.length < 9) {
                // Need at least 3 points (9 numbers)
                runtimeStore.warn(
                    `Not enough vertices for convex hull in asset ${assetId}`,
                    "PhysicsComponent"
                );
                return null;
            }

            // Find the center point of all vertices
            const meshCenter = this.calculateMeshCenter(allVertexPositions);

            // Center all points around origin for better physics performance
            const centeredPoints = this.centerPointsAroundOrigin(
                allVertexPositions,
                meshCenter
            );

            const meshData = {
                centeredPoints,
                originalCenter: meshCenter,
            };

            // Cache for future use
            runtimeStore.setConvexHullCache(assetId, meshData);

            // Clean up temporary resources
            this.disposeTempModelResources(loadedModel.scene);

            return meshData;
        } catch (error) {
            runtimeStore.warn(
                `Failed to load 3D model for asset ${assetId}: ${String(
                    error
                )}`,
                "PhysicsComponent",
                error
            );
            return null;
        }
    }

    // Load a GLTF 3D model from URL
    private async loadGLTFModel(
        url: string
    ): Promise<{ scene: THREE.Object3D }> {
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (gltf: unknown) => resolve(gltf as { scene: THREE.Object3D }),
                undefined,
                (error: unknown) => reject(error)
            );
        });
    }

    // Extract all vertex positions from a 3D model
    private extractVertexPositionsFromModel(
        modelScene: THREE.Object3D
    ): number[] {
        const allVertexPositions: number[] = [];
        const tempVertex = new THREE.Vector3();

        // Update world matrices to get correct transformations
        modelScene.updateMatrixWorld(true);

        modelScene.traverse((node: THREE.Object3D) => {
            if (!(node instanceof THREE.Mesh)) return;

            const mesh = node as THREE.Mesh;
            const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
            const positionAttribute = geometry?.getAttribute("position") as
                | THREE.BufferAttribute
                | undefined;

            if (!positionAttribute) return;

            const worldMatrix = mesh.matrixWorld;

            // Extract each vertex position and transform to world space
            for (let i = 0; i < positionAttribute.count; i++) {
                tempVertex
                    .set(
                        positionAttribute.getX(i),
                        positionAttribute.getY(i),
                        positionAttribute.getZ(i)
                    )
                    .applyMatrix4(worldMatrix);

                allVertexPositions.push(
                    tempVertex.x,
                    tempVertex.y,
                    tempVertex.z
                );
            }
        });

        return allVertexPositions;
    }

    // Calculate the center point of a set of vertices
    private calculateMeshCenter(vertexPositions: number[]): THREE.Vector3 {
        const boundingBox = new THREE.Box3();
        const tempPoint = new THREE.Vector3();

        // Expand bounding box to include all vertices
        for (let i = 0; i < vertexPositions.length; i += 3) {
            tempPoint.set(
                vertexPositions[i],
                vertexPositions[i + 1],
                vertexPositions[i + 2]
            );
            boundingBox.expandByPoint(tempPoint);
        }

        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        return center;
    }

    // Center all vertex positions around the origin
    private centerPointsAroundOrigin(
        vertexPositions: number[],
        center: THREE.Vector3
    ): Float32Array {
        const centeredPoints = new Float32Array(vertexPositions.length);

        for (let i = 0; i < vertexPositions.length; i += 3) {
            centeredPoints[i] = vertexPositions[i] - center.x;
            centeredPoints[i + 1] = vertexPositions[i + 1] - center.y;
            centeredPoints[i + 2] = vertexPositions[i + 2] - center.z;
        }

        return centeredPoints;
    }

    // Apply non-uniform scaling to mesh points
    private applyScaleToMeshPoints(
        centeredPoints: Float32Array,
        scale: THREE.Vector3
    ): Float32Array {
        const scaledPoints = new Float32Array(centeredPoints.length);

        for (let i = 0; i < centeredPoints.length; i += 3) {
            scaledPoints[i] = centeredPoints[i] * scale.x;
            scaledPoints[i + 1] = centeredPoints[i + 1] * scale.y;
            scaledPoints[i + 2] = centeredPoints[i + 2] * scale.z;
        }

        return scaledPoints;
    }

    // Clean up temporary 3D model resources to prevent memory leaks
    private disposeTempModelResources(modelScene: THREE.Object3D): void {
        modelScene.traverse((node: THREE.Object3D) => {
            if (!(node instanceof THREE.Mesh)) return;

            const mesh = node as THREE.Mesh;
            const geometry = mesh.geometry as THREE.BufferGeometry;
            geometry?.dispose?.();

            const material = mesh.material as
                | THREE.Material
                | THREE.Material[]
                | undefined;
            if (Array.isArray(material)) {
                material.forEach((mat) => mat.dispose?.());
            } else {
                material?.dispose?.();
            }
        });
    }

    public setDirectionalForce(direction: Types.BVector3) {
        if (!this.body) return;
        this.body.addForce(
            new RAPIER.Vector3(direction.x, direction.y, direction.z),
            true // wake up
        );
    }

    public addDirectionalImpulse(direction: Types.BVector3) {
        if (!this.body) return;
        this.body.applyImpulse(
            new RAPIER.Vector3(direction.x, direction.y, direction.z),
            true // wake up
        );
    }

    public setVelocity(velocity: Types.BVector3) {
        if (!this.body) return;
        this.body.setLinvel(
            new RAPIER.Vector3(velocity.x, velocity.y, velocity.z),
            true // wake up
        );
    }

    public getVelocity(): Types.BVector3 {
        if (!this.body) return new Types.BVector3(0, 0, 0);
        const vel = this.body.linvel();
        return new Types.BVector3(vel.x, vel.y, vel.z);
    }

    private applyLocks(): void {
        // Apply position and rotation locks based on object properties
        if (this.gameObject.bObject instanceof Types.BPart) {
            const partObject = this.gameObject.bObject as Types.BPart;

            // Apply position lock if enabled
            if (partObject.positionLocked) {
                this.body?.lockTranslations(true, true); // lock translation, wake up
            } else {
                this.body?.lockTranslations(false, true); // unlock translation, wake up
            }

            // Apply rotation lock if enabled
            if (partObject.rotationLocked) {
                this.body?.lockRotations(true, true); // lock rotation, wake up
            } else {
                this.body?.lockRotations(false, true); // unlock rotation, wake up
            }
        }
    }

    update(delta: number): void {
        void delta;

        this.ensureCollisionSettingsSynced();
        this.applyRuntimeColliderOverrides();

        this.syncPositionWithPhysics();
        this.syncRotationWithPhysics();
        this.updateWorldMatrix();
        this.tryBuildConvexHullIfNeeded();
        this.rebuildColliderIfScaleChanged();
    }

    // Sync position between GameObject and physics body
    private syncPositionWithPhysics(): void {
        const currentPosition = this.gameObject.transform.position;
        const wasPositionChangedExternally =
            this.previousPosition.x !== currentPosition.x ||
            this.previousPosition.y !== currentPosition.y ||
            this.previousPosition.z !== currentPosition.z;

        if (wasPositionChangedExternally) {
            // Position was changed externally (not by physics) - update physics body
            this.body?.setTranslation(
                new RAPIER.Vector3(
                    currentPosition.x,
                    currentPosition.y,
                    currentPosition.z
                ),
                true // wake up
            );
            this.previousPosition.copy(currentPosition);
        } else {
            // Position controlled by physics - update GameObject from physics body
            if (!this.body) return;
            const physicsPosition = this.body.translation();
            currentPosition.set(
                physicsPosition.x,
                physicsPosition.y,
                physicsPosition.z
            );
            this.previousPosition.copy(currentPosition);
        }
    }

    // Sync rotation between GameObject and physics body
    private syncRotationWithPhysics(): void {
        const currentRotation = this.gameObject.transform.rotation;
        const wasRotationChangedExternally =
            this.previousRotation.x !== currentRotation.x ||
            this.previousRotation.y !== currentRotation.y ||
            this.previousRotation.z !== currentRotation.z ||
            this.previousRotation.w !== currentRotation.w;

        if (wasRotationChangedExternally) {
            // Rotation was changed externally (not by physics) - update physics body
            this.body?.setRotation(
                new RAPIER.Quaternion(
                    currentRotation.x,
                    currentRotation.y,
                    currentRotation.z,
                    currentRotation.w
                ),
                true // wake up
            );
            this.previousRotation.copy(currentRotation);
        } else {
            // Rotation controlled by physics - update GameObject from physics body
            if (!this.body) return;
            const physicsRotation = this.body.rotation();
            currentRotation.set(
                physicsRotation.x,
                physicsRotation.y,
                physicsRotation.z,
                physicsRotation.w
            );
            this.previousRotation.copy(currentRotation);
        }
    }

    // Update the world matrix for rendering
    private updateWorldMatrix(): void {
        // Scale is not changed by physics, so we keep the initial scale
        // Recompose the world matrix from the physics-updated transform
        this.gameObject.worldMatrix.compose(
            this.gameObject.transform.position,
            this.gameObject.transform.rotation,
            this.gameObject.transform.scale
        );
    }

    // Try to build convex hull if it hasn't been built yet
    private tryBuildConvexHullIfNeeded(): void {
        if (!this.hasConvexHullCollider) {
            void this.tryBuildConvexHullCollider(false);
        }
    }

    // Rebuild collider when object scale changes
    private rebuildColliderIfScaleChanged(): void {
        const currentScale = this.gameObject.transform.scale;
        const hasScaleChanged =
            this.previousScale.x !== currentScale.x ||
            this.previousScale.y !== currentScale.y ||
            this.previousScale.z !== currentScale.z;

        if (hasScaleChanged) {
            this.previousScale.copy(currentScale);

            if (this.hasConvexHullCollider) {
                // Rebuild convex hull with new scale; if a build is in progress, queue a rebuild
                if (this.isBuildingConvexHull) {
                    this.pendingConvexHullRebuild = true;
                } else {
                    void this.tryBuildConvexHullCollider(true);
                }
            } else {
                // Rebuild primitive collider with new scale
                this.replaceCollider(this.createInitialColliderDesc());
            }
        }
    }

    private enableCollisionEvents(): void {
        if (!this.collider) return;
        const defaultEvents = RAPIER.ActiveEvents.COLLISION_EVENTS;
        const defaultTypes =
            RAPIER.ActiveCollisionTypes.DEFAULT |
            RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED |
            RAPIER.ActiveCollisionTypes.KINEMATIC_KINEMATIC;
        this.collider.setActiveEvents(defaultEvents);
        this.collider.setActiveCollisionTypes(defaultTypes);
        this.currentActiveEvents = defaultEvents;
        this.currentActiveCollisionTypes = defaultTypes;
    }

    private applyRuntimeColliderOverrides(): void {
        if (!this.collider) return;
        const objectId = this.gameObject.bObject.id;

        const collisionGroups = runtimeStore.getPropertyOverride<number>(
            objectId,
            "collisionGroups"
        );
        if (
            collisionGroups !== undefined &&
            collisionGroups !== this.currentCollisionGroups
        ) {
            this.collider.setCollisionGroups(collisionGroups);
            this.currentCollisionGroups = collisionGroups;
        }

        const solverGroups = runtimeStore.getPropertyOverride<number>(
            objectId,
            "solverGroups"
        );
        if (
            solverGroups !== undefined &&
            solverGroups !== this.currentSolverGroups
        ) {
            this.collider.setSolverGroups(solverGroups);
            this.currentSolverGroups = solverGroups;
        }

        const activeTypes = runtimeStore.getPropertyOverride<number>(
            objectId,
            "activeCollisionTypes"
        );
        if (
            activeTypes !== undefined &&
            activeTypes !== this.currentActiveCollisionTypes
        ) {
            this.collider.setActiveCollisionTypes(activeTypes);
            this.currentActiveCollisionTypes = activeTypes;
        }

        const activeEvents = runtimeStore.getPropertyOverride<number>(
            objectId,
            "activeEvents"
        );
        if (
            activeEvents !== undefined &&
            activeEvents !== this.currentActiveEvents
        ) {
            this.collider.setActiveEvents(activeEvents);
            this.currentActiveEvents = activeEvents;
        }

        const activeHooks = runtimeStore.getPropertyOverride<number>(
            objectId,
            "activeHooks"
        );
        if (
            activeHooks !== undefined &&
            activeHooks !== this.currentActiveHooks
        ) {
            this.collider.setActiveHooks(activeHooks);
            this.currentActiveHooks = activeHooks;
        }
    }

    private registerHandles(): void {
        this.registerBodyHandle();
        this.registerColliderHandle();
    }

    private registerBodyHandle(): void {
        if (!this.body) return;
        runtimeStore.registerBodyHandle?.(
            this.body.handle,
            this.gameObject.bObject.id
        );
    }

    private registerColliderHandle(): void {
        if (!this.collider) return;
        runtimeStore.registerColliderHandle?.(
            this.collider.handle,
            this.gameObject.bObject.id
        );
    }

    private unregisterHandles(): void {
        this.unregisterColliderHandle();
        this.unregisterBodyHandle();
    }

    private unregisterColliderHandle(): void {
        if (!this.collider) return;
        runtimeStore.unregisterColliderHandle?.(this.collider.handle);
    }

    private unregisterBodyHandle(): void {
        if (!this.body) return;
        runtimeStore.unregisterBodyHandle?.(this.body.handle);
    }

    /**
     * Clean up physics resources when component is destroyed
     */
    onDisable(): void {
        this.cleanup();
    }

    onEnable(): void {
        if (this.body || this.collider) return; // already active
        const physicsWorld = sceneStore.getPhysicsWorld();
        if (!physicsWorld) return;
        this.body = physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
        );
        this.collider = physicsWorld.createCollider(
            this.createInitialColliderDesc(),
            this.body
        );
        this.registerHandles();
        this.enableCollisionEvents();
        this.applyCollisionSettings();
        this.body.setTranslation(
            new RAPIER.Vector3(
                this.gameObject.transform.position.x,
                this.gameObject.transform.position.y,
                this.gameObject.transform.position.z
            ),
            true
        );
        this.body.setRotation(
            new RAPIER.Quaternion(
                this.gameObject.transform.rotation.x,
                this.gameObject.transform.rotation.y,
                this.gameObject.transform.rotation.z,
                this.gameObject.transform.rotation.w
            ),
            true
        );
        this.applyLocks();
        this.applyRuntimeColliderOverrides();
        void this.tryBuildConvexHullCollider();
    }

    destroy(): void {
        this.cleanup();
        super.destroy();
    }

    private cleanup(): void {
        const physicsWorld = sceneStore.getPhysicsWorld();
        this.unregisterHandles();
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
        this.currentCollisionGroups = null;
        this.currentSolverGroups = null;
        this.currentActiveCollisionTypes = null;
        this.currentActiveEvents = null;
        this.currentActiveHooks = null;
    }
}
