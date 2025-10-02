// @ts-nocheck
import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import { materialStore } from "$lib/materialStore";
import { assetStore } from "$lib/assetStore";
import { runtimeStore } from "$lib/runtimeStore";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * VisualComponent handles THREE.js mesh creation and rendering for GameObjects
 */
export class VisualComponent extends Component {
    public mesh: THREE.Object3D | null = null;
    public light: THREE.Light | null = null;
    private scene: THREE.Scene;

    constructor(gameObject: GameObject, scene: THREE.Scene) {
        super(gameObject);
        this.scene = scene;
        this.createVisualRepresentation();
    }

    /**
     * Create the appropriate THREE.js object based on the BNode3D type
     */
    private createVisualRepresentation(): void {
        const bNode = this.gameObject.bObject;

        if (bNode instanceof Types.BPart) {
            this.createPartMesh(bNode);
        } else if (bNode instanceof Types.BCamera) {
            this.createCameraVisual(bNode);
        } else if (bNode instanceof Types.BLight) {
            this.createLightVisual(bNode);
        } else if (bNode instanceof Types.BNode3D) {
            this.createDefaultVisual(bNode);
        }

        // Add to scene if we created a mesh
        if (this.mesh) {
            this.scene.add(this.mesh);
            this.updateMeshTransform();
        }

        // Add light to scene if we created one
        if (this.light) {
            this.scene.add(this.light);
            this.updateLightTransform();
        }
    }

    /**
     * Create mesh for BPart objects
     */
    private createPartMesh(part: Types.BPart): void {
        // If primitive, create simple geometry and apply runtime material
        if (part.meshSource?.type === "primitive") {
            let geometry: THREE.BufferGeometry;
            switch (part.meshSource.value) {
                case "block":
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
                case "sphere":
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case "cylinder":
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case "cone":
                    geometry = new THREE.ConeGeometry(0.5, 1, 32);
                    break;
                case "plane":
                    geometry = new THREE.PlaneGeometry(1, 1);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }

            const fallbackMaterial = new THREE.MeshStandardMaterial({
                color: "#ffffff",
            });
            const mat =
                materialStore.getMaterial(part.material || "")?.threeMaterial ||
                fallbackMaterial;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.name = part.id;
            mesh.castShadow = !!part.castShadows;
            mesh.receiveShadow = !!part.receiveShadows;
            mesh.visible = !!part.visible;
            this.mesh = mesh;
            return;
        }

        // Asset-based mesh: create a container and load GLTF/GLB into it
        const container = new THREE.Group();
        container.name = part.id;
        container.visible = !!part.visible;
        this.mesh = container;

        const assetId = part.meshSource?.value;
        const asset = assetId ? assetStore.getAsset(assetId) : undefined;
        const url = asset?.url;

        if (!url) {
            runtimeStore.warn(
                `Asset mesh missing url for part ${part.name} (${assetId})`,
                "VisualComponent"
            );
            return;
        }

        const fileType = asset?.metadata.fileType?.toLowerCase();
        if (fileType !== "gltf" && fileType !== "glb") {
            runtimeStore.warn(
                `Unsupported mesh format '${fileType}' for part ${part.name}. Only glTF/glb supported in runtime visuals.`,
                "VisualComponent"
            );
            return;
        }

        const loadModel = async () => {
            try {
                // Create a LoadingManager that can remap relative resource URLs (textures/bin)
                const manager = new THREE.LoadingManager();

                // Build a quick lookup from filename -> asset URL
                const assetByFilename = new Map<string, string>();
                try {
                    const all = assetStore.getAllAssets?.() || [];
                    for (const a of all) {
                        const name = a?.metadata?.name || "";
                        const aUrl = a?.url;
                        if (name && aUrl) {
                            assetByFilename.set(name.toLowerCase(), aUrl);
                        }
                    }
                } catch {
                    // ignore: building filename map is best-effort
                }

                // Base URL for relative resolution fallback
                let baseURL: string | undefined;
                try {
                    const u = new URL(url, window.location.href);
                    u.pathname = u.pathname.substring(
                        0,
                        u.pathname.lastIndexOf("/") + 1
                    );
                    baseURL = u.toString();
                } catch {
                    baseURL = undefined;
                }

                manager.setURLModifier((resource, path) => {
                    // Absolute URLs/blobs pass through
                    if (
                        /^(https?:)?\/\//i.test(resource) ||
                        resource.startsWith("blob:")
                    ) {
                        return resource;
                    }

                    // Try filename match from asset store
                    const file = resource.split("/").pop() || resource;
                    const mapped = assetByFilename.get(file.toLowerCase());
                    if (mapped) return mapped;

                    // Fallback: resolve relative to the GLTF URL base, if we have it
                    try {
                        if (baseURL) {
                            return new URL(resource, baseURL).toString();
                        }
                        if (path) {
                            return new URL(resource, path).toString();
                        }
                    } catch {
                        // ignore: fall back to raw resource string
                    }
                    return resource;
                });

                const loader = new GLTFLoader(manager);
                // Allow fetching from public CDNs/storage with CORS
                // Note: GLTFLoader forwards crossOrigin to underlying loaders
                // @ts-ignore
                loader.setCrossOrigin?.("anonymous");
                loader.load(
                    url,
                    (gltf: { scene: THREE.Object3D }) => {
                        gltf.scene.traverse((obj: THREE.Object3D) => {
                            if (obj instanceof THREE.Mesh) {
                                const m = obj as THREE.Mesh;
                                m.castShadow = !!part.castShadows;
                                m.receiveShadow = !!part.receiveShadows;
                            }
                        });
                        container.add(gltf.scene);
                    },
                    undefined,
                    (err: unknown) => {
                        runtimeStore.warn(
                            `Failed to load GLTF asset for part ${
                                part.name
                            }: ${String(err)}`,
                            "VisualComponent",
                            err
                        );
                    }
                );
            } catch (e) {
                runtimeStore.warn(
                    `GLTFLoader module failed to import: ${String(e)}`,
                    "VisualComponent",
                    e
                );
            }
        };

        // Fire and forget; mesh container already added/synced
        void loadModel();
    }

    /**
     * Create visual representation for camera (wireframe cone)
     */
    private createCameraVisual(camera: Types.BCamera): void {
        const geometry = new THREE.ConeGeometry(0.5, 1, 4);
        const material = new THREE.MeshBasicMaterial({
            color: "#ffff00",
            wireframe: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = camera.id;
    }

    /**
     * Create visual representation and actual light for BLight
     */
    private createLightVisual(lightNode: Types.BLight): void {
        // Create visual representation (sphere)
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: lightNode.color || "#ffffff",
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = lightNode.id;

        // Create actual light
        this.light = new THREE.PointLight(lightNode.color || "#ffffff", 1, 100);
        this.light.name = lightNode.id + "_light";
    }

    /**
     * Create default visual representation for other BNode3D objects
     */
    private createDefaultVisual(bNode: Types.BNode3D): void {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            color: "#888888",
            wireframe: true,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.name = bNode.id;
    }

    /**
     * Update mesh transform from GameObject transform
     */
    private updateMeshTransform(): void {
        if (this.mesh) {
            const transform = this.gameObject.transform;
            this.mesh.position.set(
                transform.position.x,
                transform.position.y,
                transform.position.z
            );
            this.mesh.quaternion.copy(transform.rotation);
            this.mesh.scale.copy(transform.scale);

            // Force THREE.js to update the transformation matrices
            this.mesh.updateMatrix();
            this.mesh.updateMatrixWorld(true);
        }
    }

    /**
     * Update light transform from GameObject transform
     */
    private updateLightTransform(): void {
        if (this.light) {
            const transform = this.gameObject.transform;
            this.light.position.copy(transform.position);

            // Force THREE.js to update the transformation matrices
            this.light.updateMatrix();
            this.light.updateMatrixWorld(true);
        }
    }

    /**
     * Update component - sync visual representation with transform
     */
    update(delta: number): void {
        void delta;
        this.updateMeshTransform();
        this.updateLightTransform();

        // Apply runtime property overrides without mutating editor BObjects
        const getOv = (key: string) =>
            runtimeStore.getPropertyOverride?.(this.gameObject.bObject.id, key);

        // Visibility override for meshes
        const vis = getOv("visible");
        if (this.mesh && typeof vis === "boolean") {
            this.mesh.visible = vis;
        }

        // Shadow flags overrides
        const cast = getOv("castShadows");
        const recv = getOv("receiveShadows");
        if (this.mesh && (cast !== undefined || recv !== undefined)) {
            this.mesh.traverse((obj: THREE.Object3D) => {
                const m = obj as THREE.Mesh;
                if (m.isMesh) {
                    if (typeof cast === "boolean") m.castShadow = cast;
                    if (typeof recv === "boolean") m.receiveShadow = recv;
                }
            });
        }

        // Light overrides: color, intensity, visibility
        if (this.light) {
            const lvis = getOv("visible");
            if (typeof lvis === "boolean") this.light.visible = lvis;
            const color = getOv("color");
            if (typeof color === "string") this.light.color.set(color);
            const intensity = getOv("intensity");
            if (typeof intensity === "number") this.light.intensity = intensity;
        }
    }

    onEnable(): void {
        if (this.mesh && !this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        if (this.light && !this.scene.children.includes(this.light)) {
            this.scene.add(this.light);
        }
    }

    onDisable(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.light) {
            this.scene.remove(this.light);
        }
    }

    /**
     * Get the THREE.js mesh for external access
     */
    getMesh(): THREE.Object3D | null {
        return this.mesh;
    }

    /**
     * Get the THREE.js light for external access
     */
    getLight(): THREE.Light | null {
        return this.light;
    }

    /**
     * Clean up when component is destroyed
     */
    destroy(): void {
        this.onDisable();
        if (this.mesh) {
            // Dispose all geometries/materials under this object
            this.mesh.traverse((obj: THREE.Object3D) => {
                const m = obj as THREE.Mesh;
                if (m.isMesh) {
                    m.geometry?.dispose?.();
                    const mat = m.material as
                        | THREE.Material
                        | THREE.Material[]
                        | undefined;
                    if (Array.isArray(mat)) {
                        mat.forEach((mm) => mm.dispose?.());
                    } else {
                        mat?.dispose?.();
                    }
                }
            });
            this.mesh = null;
        }
        if (this.light) {
            this.light = null;
        }

        super.destroy();
    }
}
