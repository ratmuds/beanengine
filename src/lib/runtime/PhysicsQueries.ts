// @ts-nocheck
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { runtimeStore } from "$lib/runtimeStore";
import { sceneStore } from "$lib/sceneStore";

export interface RaycastHit {
    hit: boolean;
    point: THREE.Vector3 | null;
    normal: THREE.Vector3 | null;
    objectId: string | null;
    distance: number;
}

function getPhysicsWorld() {
    return sceneStore.getPhysicsWorld();
}

export function raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 1000
): RaycastHit {
    const world = getPhysicsWorld();
    if (!world) {
        return {
            hit: false,
            point: null,
            normal: null,
            objectId: null,
            distance: 0,
        };
    }

    const dir = direction.clone().normalize();
    const ray = new RAPIER.Ray(
        new RAPIER.Vector3(origin.x, origin.y, origin.z),
        new RAPIER.Vector3(dir.x, dir.y, dir.z)
    );

    const intersection = world.castRayAndGetNormal(ray, maxDistance, true);
    if (!intersection) {
        return {
            hit: false,
            point: null,
            normal: null,
            objectId: null,
            distance: 0,
        };
    }

    const distance = intersection.toi;
    const point = origin.clone().add(dir.multiplyScalar(distance));
    const normal = new THREE.Vector3(
        intersection.normal.x,
        intersection.normal.y,
        intersection.normal.z
    );
    const objectId = runtimeStore.getObjectIdForColliderHandle(
        intersection.collider.handle
    );

    return {
        hit: true,
        point,
        normal,
        objectId,
        distance,
    };
}

export function rayFromCamera(
    mouseX?: number,
    mouseY?: number,
    maxDistance = 1000
): RaycastHit {
    const manager = runtimeStore.getGameObjectManager();
    const camera = manager?.getCamera();
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) {
        console.warn("rayFromCamera: No valid camera found");
        return {
            hit: false,
            point: null,
            normal: null,
            objectId: null,
            distance: 0,
        };
    }

    const canvas = runtimeStore.getCanvasElement();
    let { width, height } = runtimeStore.getCanvasSize();
    if (
        (!canvas || width <= 0 || height <= 0) &&
        typeof window !== "undefined"
    ) {
        // Fallback to window dimensions if canvas not yet measured
        width = Math.max(window.innerWidth, 1);
        height = Math.max(window.innerHeight, 1);
    }
    if (width <= 0 || height <= 0) {
        console.warn("rayFromCamera: No valid canvas found");
        return {
            hit: false,
            point: null,
            normal: null,
            objectId: null,
            distance: 0,
        };
    }

    const mouse = runtimeStore.getMousePosition();
    const x = mouseX ?? mouse.x;
    const y = mouseY ?? mouse.y;

    console.log("rayFromCamera", { x, y, width, height });

    const ndc = new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    return raycast(raycaster.ray.origin, raycaster.ray.direction, maxDistance);
}

export function overlapSphere(center: THREE.Vector3, radius: number): string[] {
    const world = getPhysicsWorld();
    if (!world || radius <= 0) {
        return [];
    }

    const shape = new RAPIER.Ball(radius);
    const position = new RAPIER.Vector3(center.x, center.y, center.z);
    const rotation = new RAPIER.Quaternion(0, 0, 0, 1);
    const results = new Set<string>();

    world.intersectionsWithShape(position, rotation, shape, (collider) => {
        const id = runtimeStore.getObjectIdForColliderHandle(collider.handle);
        if (id) {
            results.add(id);
        }
        return true;
    });

    return Array.from(results);
}
