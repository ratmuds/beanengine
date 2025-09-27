// @ts-nocheck
import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import { runtimeStore } from "$lib/runtimeStore";
import { sceneStore } from "$lib/sceneStore";
import type { Vector3 } from "three";

/**
 * WaypointNavigatorComponent
 * Moves an attached Part (or its parent Part) along a sequence of BWaypoint children
 * under a referenced BWaypointPath. Uses linear tweening with optional wait time
 * at each waypoint and looping.
 */
export class WaypointNavigatorComponent extends Component {
    private navigator: Types.BWaypointNavigator | null = null;
    private targetPartGO: GameObject | null = null;
    private waypoints: Vector3[] = [];

    private currentIndex = 0;
    private t = 0; // interpolation factor between waypoints
    private waiting = 0; // remaining wait time at current waypoint

    constructor(gameObject: GameObject, navigator: Types.BWaypointNavigator) {
        super(gameObject);
        this.navigator = navigator;
    }

    onEnable(): void {
        // The navigator is already correctly set in the constructor, no need to search for it again
        // this.navigator should already be the correct BWaypointNavigator instance

        // Target Part is the nearest ancestor GameObject whose bObject is a BPart
        this.targetPartGO = this.findNearestPartGO(this.gameObject);

        this.buildWaypointList();

        this.currentIndex = 0;
        this.t = 0;
        this.waiting = 0;
    }

    onDisable(): void {
        // no-op
    }

    update(delta: number): void {
        if (
            !this.navigator ||
            !this.targetPartGO ||
            this.waypoints.length === 0
        )
            return;

        // Handle wait time at discrete points
        if (this.waiting > 0) {
            this.waiting -= delta;
            if (this.waiting > 0) return;
            // finished waiting, proceed
        }

        const speed = Math.max(0.0001, this.navigator.speed || 1);

        const from = this.waypoints[this.currentIndex];
        const to =
            this.waypoints[(this.currentIndex + 1) % this.waypoints.length];

        // If single waypoint, just ensure we are at it
        if (!to || (this.waypoints.length === 1 && this.currentIndex === 0)) {
            this.setTargetPosition(from);
            return;
        }

        // Advance interpolation based on distance and speed
        // Convert speed to fraction per second relative to segment length
        const segLen = from.distanceTo(to);
        if (segLen <= 1e-6) {
            // Degenerate segment, skip to next
            this.advanceToNext();
            return;
        }

        // t increases by (speed / segLen) * delta (units/sec over units => fraction/sec)
        this.t += (speed / segLen) * delta;

        if (this.t >= 1) {
            // Snap to target, then move to next segment
            this.setTargetPosition(to);
            this.t = 0;
            this.currentIndex++;

            if (this.currentIndex >= this.waypoints.length - 1) {
                if (this.navigator.loop) {
                    this.currentIndex = 0;
                } else {
                    // stay at last point
                    this.currentIndex = Math.max(0, this.waypoints.length - 1);
                }
            }

            // Apply wait time if configured
            const wait = Math.max(0, this.navigator.waitTime || 0);
            if (wait > 0) this.waiting = wait;
        } else {
            // Lerp position
            const pos = new THREE.Vector3().lerpVectors(from, to, this.t);
            this.setTargetPosition(pos);
        }
    }

    private setTargetPosition(worldPos: Vector3) {
        if (!this.targetPartGO) return;

        // Move without changing Y if desired? For now: move in full 3D.
        this.targetPartGO.transform.position.set(
            worldPos.x,
            worldPos.y,
            worldPos.z
        );
        // PhysicsComponent will detect external transform change and sync body on its next update
    }

    private advanceToNext() {
        if (!this.navigator) return;
        this.currentIndex++;
        if (this.currentIndex >= this.waypoints.length - 1) {
            if (this.navigator.loop) this.currentIndex = 0;
            else this.currentIndex = Math.max(0, this.waypoints.length - 1);
        }
        this.t = 0;
        const wait = Math.max(0, this.navigator.waitTime || 0);
        if (wait > 0) this.waiting = wait;
    }

    private buildWaypointList() {
        this.waypoints = [];
        if (!this.navigator) return;

        // Resolve the waypoint path BObject by ID, then collect its children that are BWaypoint, in declared order
        const pathId = this.navigator.waypointPath[0];
        if (!pathId) return;

        try {
            const obj = sceneStore.getObjectById(pathId);
            if (!(obj instanceof Types.BWaypointPath)) return;

            // Prefer querying the scene for children by parentId to be robust
            // even if parent.children wasn't populated correctly.
            const waypointChildren = (sceneStore
                .getChildrenOf(obj.id)
                .filter(Boolean) || [])
                .filter(
                (c): c is Types.BWaypoint => c instanceof Types.BWaypoint
            );

            // Use their world positions (editor-space at play start) as waypoint positions
            for (const w of waypointChildren) {
                const p = w.getWorldPosition();
                this.waypoints.push(new THREE.Vector3(p.x, p.y, p.z));
            }
        } catch (e) {
            runtimeStore.warn(
                "Failed to build waypoint list",
                "WaypointNavigatorComponent",
                e
            );
        }
    }

    private findNearestPartGO(go: GameObject): GameObject | null {
        // If this GO is a Part, return it
        if (
            go.bObject instanceof Types.BPart ||
            go.bObject instanceof Types.BPlayerController
        )
            return go;
        // Otherwise, check parent chain
        let current: GameObject | null = go.getParent();
        while (current) {
            if (
                current.bObject instanceof Types.BPart ||
                current.bObject instanceof Types.BPlayerController
            )
                return current;
            current = current.getParent();
        }
        return null;
    }
}

export default WaypointNavigatorComponent;
