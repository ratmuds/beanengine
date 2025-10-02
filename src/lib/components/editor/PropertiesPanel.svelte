<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import Input from "$lib/components/ui/input/input.svelte";
    import Vector3Input from "$lib/components/properties/Vector3Input.svelte";
    import Vector2Input from "$lib/components/properties/Vector2Input.svelte";

    import * as Select from "$lib/components/ui/select/index.js";
    import {
        Navigation,
        Box,
        Search,
        Hexagon,
        Settings,
        MoreHorizontal,
        Hash,
        FileCode,
        RefreshCw,
        Camera,
    } from "lucide-svelte";
    import * as Types from "$lib/types";
    import { assetStore } from "$lib/assetStore";
    import { materialStore } from "$lib/materialStore";
    import AxisLockControls from "$lib/components/properties/AxisLockControls.svelte";
    import { sceneStore } from "$lib/sceneStore";
    import { Switch } from "$lib/components/ui/switch";

    let { selectedObject, onPropertyChange } = $props();

    const object = $derived(
        $sceneStore.getScene().objects.find((obj) => obj.id === selectedObject)
    );

    function updateObjectInfo() {
        console.log("Forcing refresh of object info...");

        let tempSelectedObject = selectedObject;

        selectedObject = -1;

        setTimeout(() => {
            selectedObject = tempSelectedObject;
        }, 100);
    }

    // Mesh selector reactive variables
    const meshOptions = $derived(() => {
        if (!object || !(object instanceof Types.BPart)) return [];

        const primitives = [
            {
                value: "primitive-block",
                label: "Block",
                data: { type: "primitive", value: "block" },
            },
            {
                value: "primitive-sphere",
                label: "Sphere",
                data: { type: "primitive", value: "sphere" },
            },
            {
                value: "primitive-cylinder",
                label: "Cylinder",
                data: { type: "primitive", value: "cylinder" },
            },
        ];

        const allAssets = $assetStore.getAllAssets();
        const assets =
            allAssets && Array.isArray(allAssets)
                ? allAssets
                      .filter((asset) => asset.metadata.type === "mesh")
                      .map((asset) => ({
                          value: `asset-${asset.metadata.id}`,
                          label: asset.metadata.name,
                          data: {
                              type: "asset",
                              value: asset.metadata.id,
                              size: asset.metadata.size,
                          },
                      }))
                : [];

        return [...primitives, ...assets];
    });

    let meshSelectorValue = $state("");

    $effect(() => {
        if (!object || !(object instanceof Types.BPart)) {
            meshSelectorValue = "";
            return;
        }

        if (object.meshSource.type === "primitive") {
            meshSelectorValue = `primitive-${object.meshSource.value}`;
        } else {
            meshSelectorValue = `asset-${object.meshSource.value}`;
        }
    });

    function handleMeshChange(value: string) {
        if (!object || !(object instanceof Types.BPart)) return;

        const selectedOption = meshOptions().find(
            (option: any) => option.value === value
        );
        if (!selectedOption) return;

        if (selectedOption.data.type === "primitive") {
            object.setPrimitiveMesh(selectedOption.data.value as any);
        } else {
            object.setAssetMesh(selectedOption.data.value);
        }

        onPropertyChange(object);
    }

    // Material selector reactive variables
    const materialOptions = $derived(() => {
        const materials = $materialStore.getAllMaterials();
        if (!materials || !Array.isArray(materials)) return [];
        return materials.map((material) => ({
            value: material.id,
            label: material.name,
            data: material,
        }));
    });

    let materialSelectorValue = $state("");

    $effect(() => {
        if (!object || !(object instanceof Types.BPart)) {
            materialSelectorValue = "";
            return;
        }
        materialSelectorValue = object.material || "";
    });

    function handleMaterialChange(value: string) {
        if (!object || !(object instanceof Types.BPart)) return;

        object.material = value;
        onPropertyChange(object);
    }

    function handleAxisLockChange(event: any) {
        if (!object || !(object instanceof Types.BPart)) return;

        onPropertyChange(event.detail.object);
    }

    // Get all BPart objects from the scene for constraint selection
    const partOptions = $derived(() => {
        if (!object || !(object instanceof Types.BConstraint)) return [];

        const allObjects = $sceneStore.getScene().objects;
        const parts = allObjects.filter(
            (obj) => obj instanceof Types.BPart
        ) as Types.BPart[];

        return parts.map((part) => ({
            value: part.id,
            label: part.name,
            data: { part },
        }));
    });

    let partASelectorValue: string = $state("");
    let partBSelectorValue: string = $state("");

    $effect(() => {
        if (!object || !(object instanceof Types.BConstraint)) {
            partASelectorValue = "";
            partBSelectorValue = "";
            return;
        }

        partASelectorValue = object.partA?.id || "";
        partBSelectorValue = object.partB?.id || "";
    });

    // UI property reactive variables
    let positionXAnchorValue: string = $state("left");
    let positionYAnchorValue: string = $state("top");
    let transitionValue: string = $state("none");
    let scrollValue: string = $state("none");
    let textAlignValue: string = $state("left");
    let textVerticalAlignValue: string = $state("top");
    let overflowValue: string = $state("none");
    let imageFitValue: string = $state("cover");
    let imageRepeatValue: string = $state("no-repeat");

    $effect(() => {
        if (!object || !(object instanceof Types.BUI)) {
            positionXAnchorValue = "left";
            positionYAnchorValue = "top";
            transitionValue = "none";
            return;
        }

        positionXAnchorValue = (object as any).positionXAnchor || "left";
        positionYAnchorValue = (object as any).positionYAnchor || "top";
        transitionValue = (object as any).transition || "none";

        if (object instanceof Types.BContainerUI) {
            scrollValue = (object as any).scroll || "none";
        }

        if (object instanceof Types.BTextUI) {
            textAlignValue = (object as any).textAlign || "left";
            textVerticalAlignValue = (object as any).textVerticalAlign || "top";
            overflowValue = (object as any).overflow || "none";
        }
    });

    function handlePartAChange(value: string) {
        if (!object || !(object instanceof Types.BConstraint)) return;

        const selectedPart = $sceneStore
            .getScene()
            .objects.find((obj) => obj.id === value);
        if (!selectedPart || !(selectedPart instanceof Types.BPart)) return;

        object.partA = selectedPart;
        onPropertyChange(object);
    }

    function handlePartBChange(value: string) {
        if (!object || !(object instanceof Types.BConstraint)) return;

        const selectedPart = $sceneStore
            .getScene()
            .objects.find((obj) => obj.id === value);
        if (!selectedPart || !(selectedPart instanceof Types.BPart)) return;

        object.partB = selectedPart;
        onPropertyChange(object);
    }

    // Waypoint Navigator: Path selector reactive variables
    const pathOptions = $derived(() => {
        if (!object || !(object instanceof Types.BWaypointNavigator)) return [];
        const allObjects = $sceneStore.getScene().objects;
        const paths = allObjects.filter(
            (obj) => obj instanceof Types.BWaypointPath
        ) as Types.BWaypointPath[];
        return paths.map((path) => ({
            value: path.id,
            label: path.name,
            data: { path },
        }));
    });

    let pathSelectorValue: string = $state("");

    $effect(() => {
        if (!object || !(object instanceof Types.BWaypointNavigator)) {
            pathSelectorValue = "";
            return;
        }
        pathSelectorValue = (object as any).waypointPath || "";
    });

    function handlePathChange(value: string) {
        if (!object || !(object instanceof Types.BWaypointNavigator)) return;
        (object as any).waypointPath = value || "";
        onPropertyChange(object);
    }

    // Motor: Wheel part selector reactive variables
    const motorWheelOptions = $derived(() => {
        if (!object || !(object instanceof Types.BMotor)) return [];

        const allObjects = $sceneStore.getScene().objects;
        const parts = allObjects.filter(
            (obj) => obj instanceof Types.BPart
        ) as Types.BPart[];

        return parts.map((part) => ({
            value: part.id,
            label: part.name,
            data: { part },
        }));
    });

    let motorWheelSelectorValue: string = $state("");

    $effect(() => {
        if (!object || !(object instanceof Types.BMotor)) {
            motorWheelSelectorValue = "";
            return;
        }
        motorWheelSelectorValue = object.wheelPart?.id || "";
    });

    function handleMotorWheelChange(value: string) {
        if (!object || !(object instanceof Types.BMotor)) return;

        const selectedPart = $sceneStore
            .getScene()
            .objects.find((obj) => obj.id === value);
        if (!selectedPart || !(selectedPart instanceof Types.BPart)) return;

        object.wheelPart = selectedPart;
        onPropertyChange(object);
    }

    // Camera properties helpers
    const isActiveCamera = $derived(() => {
        const active = $sceneStore.getActiveCamera();
        return !!(active && object && active.id === object.id);
    });
</script>

<div
    class="h-full bg-card/60 backdrop-blur-sm border-l border-border/30 flex flex-col relative overflow-hidden"
>
    <!-- Subtle gradient accent -->
    <div
        class="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-blue-500/3 pointer-events-none"
    ></div>

    <!-- Header -->
    <div class="p-5 border-b border-border/30 relative z-10 space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-purple-500/10 rounded-lg">
                    <Settings class="w-5 h-5 text-purple-400" />
                </div>
                <h2 class="text-foreground font-semibold text-lg">
                    Properties
                </h2>
            </div>
            <Button
                variant="ghost"
                size="sm"
                class="h-10 w-10 p-0 rounded-xl bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground shadow-sm transition-all duration-200"
                title="More options"
            >
                <MoreHorizontal class="w-5 h-5" />
            </Button>
        </div>

        <!-- Search -->
        <div class="relative">
            <div
                class="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
            >
                <Search class="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
                type="text"
                placeholder="Search properties..."
                class="pl-12 pr-4 py-3 bg-muted/40 border-border/40 text-foreground text-sm rounded-xl h-11 focus:border-blue-400/60 focus:bg-muted/60 focus:outline-none transition-all duration-200 shadow-sm"
            />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto relative z-10 p-3 space-y-4">
        {#if object}
            <!-- Object Name Section -->
            <div class="space-y-3">
                <div class="flex items-center gap-2 px-1">
                    <Hash class="w-4 h-4 text-muted-foreground" />
                    <h3 class="font-medium text-sm text-foreground">Object</h3>
                </div>

                <div class="space-y-2 px-1">
                    <Input
                        type="text"
                        value={object.name}
                        class="bg-muted/30 border-border/40 text-foreground h-9 px-3 rounded-lg focus:border-blue-400/60 focus:bg-muted/50 focus:outline-none transition-all duration-200"
                        onchange={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target && target.value !== undefined) {
                                object.name = target.value;
                                onPropertyChange(object);
                            }
                        }}
                    />
                    <div
                        class="text-xs text-muted-foreground font-mono flex items-center gap-1"
                    >
                        <span>ID:</span>
                        <span class="bg-muted/40 px-1.5 py-0.5 rounded text-xs"
                            >{object.id}</span
                        >
                    </div>
                </div>
            </div>
            <!-- Node3D Properties -->
            {#if object instanceof Types.BNode3D}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Hexagon class="w-4 h-4 text-blue-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Transform
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <Vector3Input
                            label="Position"
                            value={object.position}
                            on:change={(e) => {
                                object.position = e.detail.value;
                                onPropertyChange(object);
                            }}
                        />
                        <Vector3Input
                            label="Rotation"
                            value={object.rotation}
                            on:change={(e) => {
                                // Keep Euler angles for BNode3D (user-facing)
                                object.rotation = e.detail.value;
                                onPropertyChange(object);
                            }}
                        />
                        <Vector3Input
                            label="Scale"
                            value={object.scale}
                            on:change={(e) => {
                                object.scale = e.detail.value;
                                onPropertyChange(object);
                            }}
                        />

                        <Alert.Root class="mt-3">
                            <Alert.Title class="font-semibold"
                                >Warning</Alert.Title
                            >
                            <Alert.Description>
                                Due to limitations, these values will not update
                                in realtime.

                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="mt-2"
                                    onclick={updateObjectInfo}
                                >
                                    <RefreshCw class="w-3 h-3 mr-1" />
                                    Update</Button
                                >
                            </Alert.Description>
                        </Alert.Root>
                    </div>
                </div>
            {/if}

            <!-- Part Properties -->
            {#if object instanceof Types.BPart}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Box class="w-4 h-4 text-green-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Part
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Mesh Selector -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Mesh Type
                            </label>
                            <Select.Root
                                bind:value={meshSelectorValue}
                                onValueChange={handleMeshChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {meshSelectorValue
                                        ? meshOptions().find(
                                              (opt: any) =>
                                                  opt.value ===
                                                  meshSelectorValue
                                          )?.label || "Select a mesh"
                                        : "Select a mesh"}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each meshOptions() as option}
                                        <Select.Item value={option.value}>
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                {#if option.data.type === "primitive"}
                                                    {#if option.data.value === "block"}
                                                        <Box
                                                            class="w-4 h-4 text-blue-400"
                                                        />
                                                    {:else if option.data.value === "sphere"}
                                                        <div
                                                            class="w-4 h-4 bg-blue-400 rounded-full"
                                                        ></div>
                                                    {:else if option.data.value === "cylinder"}
                                                        <div
                                                            class="w-4 h-4 bg-blue-400 rounded-sm"
                                                        ></div>
                                                    {:else if option.data.value === "cone"}
                                                        <div
                                                            class="w-4 h-4 bg-blue-400"
                                                            style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"
                                                        ></div>
                                                    {:else if option.data.value === "plane"}
                                                        <div
                                                            class="w-4 h-1 bg-blue-400"
                                                        ></div>
                                                    {:else if option.data.value === "wedge"}
                                                        <div
                                                            class="w-4 h-4 bg-blue-400"
                                                            style="clip-path: polygon(0% 100%, 100% 100%, 100% 0%)"
                                                        ></div>
                                                    {/if}
                                                {:else}
                                                    <Box
                                                        class="w-4 h-4 text-purple-400"
                                                    />
                                                {/if}
                                                <span>{option.label}</span>
                                                {#if option.data.type === "asset" && (option.data as any).size}
                                                    <span
                                                        class="text-xs text-muted-foreground ml-auto"
                                                    >
                                                        {(
                                                            (option.data as any)
                                                                .size /
                                                            1024 /
                                                            1024
                                                        ).toFixed(2)} MB
                                                    </span>
                                                {/if}
                                            </div>
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Material Selector -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Material
                            </label>
                            <Select.Root
                                bind:value={materialSelectorValue}
                                onValueChange={handleMaterialChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {materialSelectorValue
                                        ? materialOptions().find(
                                              (opt: any) =>
                                                  opt.value ===
                                                  materialSelectorValue
                                          )?.label || "Select material..."
                                        : "Select material..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each materialOptions() as option}
                                        <Select.Item value={option.value}>
                                            {option.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Axis Lock Controls -->
                        <AxisLockControls
                            {object}
                            on:change={handleAxisLockChange}
                        />

                        <!-- Physics & Collision Toggles -->
                        <div class="space-y-2">
                            <div
                                class="flex items-center justify-between bg-muted/20 rounded-lg p-2.5"
                            >
                                <div
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Enable Physics
                                </div>
                                <Switch
                                    checked={object.enablePhysics}
                                    onCheckedChange={(v) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).enablePhysics = v;
                                        onPropertyChange(updated);
                                    }}
                                />
                            </div>
                            <div
                                class="flex items-center justify-between bg-muted/20 rounded-lg p-2.5"
                            >
                                <div
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Enable Collision
                                </div>
                                <Switch
                                    checked={object.enableCollision}
                                    onCheckedChange={(v) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).enableCollision = v;
                                        onPropertyChange(updated);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- UI Base Properties -->
            {#if object instanceof Types.BUI}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Settings class="w-4 h-4 text-pink-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            UI Layout
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <div
                            class="flex items-center justify-between bg-muted/20 rounded-lg p-2.5"
                        >
                            <div class="text-xs font-medium text-foreground/80">
                                Auto Layout
                            </div>
                            <Switch
                                checked={object.autoLayout}
                                onCheckedChange={(v) => {
                                    const updated = Object.assign(
                                        Object.create(
                                            Object.getPrototypeOf(object)
                                        ),
                                        object
                                    );
                                    (updated as any).autoLayout = v;
                                    onPropertyChange(updated);
                                }}
                            />
                        </div>

                        <Vector2Input
                            label="Position Percent (0-1)"
                            bind:value={object.positionPercent}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).positionPercent =
                                    e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />
                        <Vector2Input
                            label="Position Offset (px)"
                            bind:value={object.positionOffset}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).positionOffset =
                                    e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />
                        <Vector2Input
                            label="Size Percent (0-1)"
                            bind:value={object.sizePercent}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).sizePercent = e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />
                        <Vector2Input
                            label="Size Offset (px)"
                            bind:value={object.sizeOffset}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).sizeOffset = e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />

                        <!-- Rotation -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Rotation (deg)
                            </label>
                            <Input
                                type="number"
                                value={object.rotation}
                                onchange={(e) => {
                                    const updated = Object.assign(
                                        Object.create(
                                            Object.getPrototypeOf(object)
                                        ),
                                        object
                                    );
                                    (updated as any).rotation =
                                        parseFloat(
                                            (e.target as HTMLInputElement).value
                                        ) || 0;
                                    onPropertyChange(updated);
                                }}
                                class="bg-muted/30 border-border/40 text-foreground h-9 px-3 rounded-lg"
                            />
                        </div>

                        <!-- Anchors -->
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    X Anchor
                                </label>
                                <Select.Root
                                    bind:value={positionXAnchorValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).positionXAnchor = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="left"
                                            >Left</Select.Item
                                        >
                                        <Select.Item value="center"
                                            >Center</Select.Item
                                        >
                                        <Select.Item value="right"
                                            >Right</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Y Anchor
                                </label>
                                <Select.Root
                                    bind:value={positionYAnchorValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).positionYAnchor = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="top"
                                            >Top</Select.Item
                                        >
                                        <Select.Item value="center"
                                            >Center</Select.Item
                                        >
                                        <Select.Item value="bottom"
                                            >Bottom</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>

                        <!-- Visibility & Z-Index -->
                        <div class="grid grid-cols-2 gap-2">
                            <div
                                class="flex items-center justify-between bg-muted/20 rounded-lg p-2.5"
                            >
                                <div
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Visible
                                </div>
                                <Switch
                                    checked={object.visible}
                                    onCheckedChange={(v) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).visible = v;
                                        onPropertyChange(updated);
                                    }}
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Z-Index
                                </label>
                                <Input
                                    type="number"
                                    value={object.zIndex}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).zIndex =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 0;
                                        onPropertyChange(updated);
                                    }}
                                    class="bg-muted/30 border-border/40 text-foreground h-9 px-3 rounded-lg"
                                />
                            </div>
                        </div>

                        <!-- Padding & Margin -->
                        <Vector2Input
                            label="Padding (px)"
                            bind:value={object.padding}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).padding = e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />
                        <Vector2Input
                            label="Margin (px)"
                            bind:value={object.margin}
                            on:change={(e) => {
                                const updated = Object.assign(
                                    Object.create(
                                        Object.getPrototypeOf(object)
                                    ),
                                    object
                                );
                                (updated as any).margin = e.detail.value;
                                onPropertyChange(updated);
                            }}
                        />

                        <!-- Transition -->
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Transition
                                </label>
                                <Select.Root
                                    bind:value={transitionValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).transition = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="none"
                                            >None</Select.Item
                                        >
                                        <Select.Item value="fade"
                                            >Fade</Select.Item
                                        >
                                        <Select.Item value="fly"
                                            >Fly</Select.Item
                                        >
                                        <Select.Item value="slide"
                                            >Slide</Select.Item
                                        >
                                        <Select.Item value="scale"
                                            >Scale</Select.Item
                                        >
                                        <Select.Item value="blur"
                                            >Blur</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Duration (ms)
                                </label>
                                <Input
                                    type="number"
                                    value={(object as any).transitionDuration}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).transitionDuration =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 0;
                                        onPropertyChange(updated);
                                    }}
                                    class="bg-muted/30 border-border/40 text-foreground h-9 px-3 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- UI Container Properties -->
            {#if object instanceof Types.BContainerUI}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Box class="w-4 h-4 text-cyan-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Container
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Colors and borders -->
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Background Color
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).backgroundColor}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).backgroundColor = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    placeholder="rgba(0,0,0,0) or #rrggbb"
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Border Color
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).borderColor}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).borderColor = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    placeholder="rgba(0,0,0,0) or #rrggbb"
                                    class="h-9"
                                />
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Border Size (px)
                                </label>
                                <Input
                                    type="number"
                                    value={(object as any).borderSize}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).borderSize =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 0;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Border Radius (px)
                                </label>
                                <Input
                                    type="number"
                                    value={(object as any).borderRadius}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).borderRadius =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 0;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Scroll
                                </label>
                                <Select.Root
                                    bind:value={scrollValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).scroll = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="none"
                                            >None</Select.Item
                                        >
                                        <Select.Item value="horizontal"
                                            >Horizontal</Select.Item
                                        >
                                        <Select.Item value="vertical"
                                            >Vertical</Select.Item
                                        >
                                        <Select.Item value="both"
                                            >Both</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- UI Text Properties -->
            {#if object instanceof Types.BTextUI}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <FileCode class="w-4 h-4 text-amber-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Text
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Content
                            </label>
                            <Input
                                type="text"
                                value={(object as any).text}
                                onchange={(e) => {
                                    const updated = Object.assign(
                                        Object.create(
                                            Object.getPrototypeOf(object)
                                        ),
                                        object
                                    );
                                    (updated as any).text = (
                                        e.target as HTMLInputElement
                                    ).value;
                                    onPropertyChange(updated);
                                }}
                                class="h-9"
                            />
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Font Size (px)
                                </label>
                                <Input
                                    type="number"
                                    value={(object as any).fontSize}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).fontSize =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 12;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Font Family
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).fontFamily}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).fontFamily = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Font Weight
                                </label>
                                <Input
                                    type="number"
                                    value={(object as any).fontWeight}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).fontWeight =
                                            parseInt(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 400;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Text Color
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).color}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).color = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    H-Align
                                </label>
                                <Select.Root
                                    bind:value={textAlignValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).textAlign = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="left"
                                            >Left</Select.Item
                                        >
                                        <Select.Item value="center"
                                            >Center</Select.Item
                                        >
                                        <Select.Item value="right"
                                            >Right</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    V-Align
                                </label>
                                <Select.Root
                                    bind:value={textVerticalAlignValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).textVerticalAlign =
                                            val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="top"
                                            >Top</Select.Item
                                        >
                                        <Select.Item value="center"
                                            >Center</Select.Item
                                        >
                                        <Select.Item value="bottom"
                                            >Bottom</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Overflow
                                </label>
                                <Select.Root
                                    bind:value={overflowValue}
                                    onValueChange={(val) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).overflow = val;
                                        onPropertyChange(updated);
                                    }}
                                    type="single"
                                >
                                    <Select.Trigger class="w-full h-9" />
                                    <Select.Content>
                                        <Select.Item value="none"
                                            >None</Select.Item
                                        >
                                        <Select.Item value="wrap"
                                            >Wrap</Select.Item
                                        >
                                        <Select.Item value="ellipsis"
                                            >Ellipsis</Select.Item
                                        >
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- UI Button Properties -->
            {#if object instanceof Types.BButtonUI}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Box class="w-4 h-4 text-indigo-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Button
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Hover Color
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).hoverColor}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).hoverColor = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Pressed Color
                                </label>
                                <Input
                                    type="text"
                                    value={(object as any).pressedColor}
                                    onchange={(e) => {
                                        const updated = Object.assign(
                                            Object.create(
                                                Object.getPrototypeOf(object)
                                            ),
                                            object
                                        );
                                        (updated as any).pressedColor = (
                                            e.target as HTMLInputElement
                                        ).value;
                                        onPropertyChange(updated);
                                    }}
                                    class="h-9"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Script Properties -->
            {#if object instanceof Types.BScript}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <FileCode class="w-4 h-4 text-green-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Script
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <div
                            class="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg"
                        >
                            <span class="text-xs font-medium text-foreground/80"
                                >Code Blocks</span
                            >
                            <span
                                class="text-xs font-mono text-foreground bg-muted/40 px-2 py-1 rounded-md"
                                >{object.code.length}</span
                            >
                        </div>

                        <div class="bg-muted/20 p-3 rounded-lg">
                            <p class="text-xs text-muted-foreground mb-2">
                                Script Editor
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                class="w-full justify-start h-8"
                                disabled
                            >
                                <FileCode class="w-3 h-3 mr-2" />
                                Open Code Editor (Coming Soon)
                            </Button>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Camera Properties -->
            {#if object instanceof Types.BCamera}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Camera class="w-4 h-4 text-cyan-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Camera
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Projection Type -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Projection
                            </label>
                            <Select.Root
                                value={object.projectionType}
                                onValueChange={(val) => {
                                    if (val === "orthographic") {
                                        object.setOrthographic(
                                            object.orthographicSize,
                                            object.nearClipPlane,
                                            object.farClipPlane
                                        );
                                    } else {
                                        object.setPerspective(
                                            object.fieldOfView,
                                            object.nearClipPlane,
                                            object.farClipPlane
                                        );
                                    }
                                    onPropertyChange?.(object);
                                }}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {object.projectionType
                                        .charAt(0)
                                        .toUpperCase() +
                                        object.projectionType.slice(1)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="perspective"
                                        >Perspective</Select.Item
                                    >
                                    <Select.Item value="orthographic"
                                        >Orthographic</Select.Item
                                    >
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Perspective: FOV -->
                        {#if object.projectionType === "perspective"}
                            <div class="grid grid-cols-3 gap-2">
                                <div class="space-y-1.5 col-span-2">
                                    <label
                                        class="text-xs font-medium text-foreground/80"
                                        >Field of View (deg)</label
                                    >
                                    <Input
                                        type="number"
                                        min="1"
                                        max="179"
                                        value={object.fieldOfView}
                                        onchange={(e) => {
                                            const v =
                                                parseFloat(
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value
                                                ) || 60;
                                            object.fieldOfView = v;
                                            onPropertyChange(object);
                                        }}
                                        class="h-9"
                                    />
                                </div>
                                <div class="space-y-1.5">
                                    <label
                                        class="text-xs font-medium text-foreground/80"
                                        >Aspect</label
                                    >
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.1"
                                        value={object.aspectRatio}
                                        onchange={(e) => {
                                            object.aspectRatio =
                                                parseFloat(
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value
                                                ) || object.aspectRatio;
                                            onPropertyChange(object);
                                        }}
                                        class="h-9"
                                    />
                                </div>
                            </div>
                        {/if}

                        <!-- Orthographic: Size -->
                        {#if object.projectionType === "orthographic"}
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                    >Ortho Size (half-height)</label
                                >
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.01"
                                    value={object.orthographicSize}
                                    onchange={(e) => {
                                        object.orthographicSize =
                                            parseFloat(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || object.orthographicSize;
                                        onPropertyChange(object);
                                    }}
                                    class="h-9"
                                />
                            </div>
                        {/if}

                        <!-- Clipping Planes -->
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                    >Near</label
                                >
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.001"
                                    value={object.nearClipPlane}
                                    onchange={(e) => {
                                        object.nearClipPlane =
                                            parseFloat(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || object.nearClipPlane;
                                        onPropertyChange(object);
                                    }}
                                    class="h-9"
                                />
                            </div>
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                    >Far</label
                                >
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.01"
                                    value={object.farClipPlane}
                                    onchange={(e) => {
                                        object.farClipPlane =
                                            parseFloat(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || object.farClipPlane;
                                        onPropertyChange(object);
                                    }}
                                    class="h-9"
                                />
                            </div>
                        </div>

                        <!-- Background / Clear -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                                >Clear Color</label
                            >
                            <Input
                                type="text"
                                value={object.clearColor}
                                onchange={(e) => {
                                    object.clearColor =
                                        (e.target as HTMLInputElement).value ||
                                        object.clearColor;
                                    onPropertyChange(object);
                                }}
                                placeholder="#RRGGBB or css color"
                                class="h-9"
                            />
                        </div>

                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                                >Clear Flags</label
                            >
                            <Select.Root
                                value={object.clearFlags}
                                onValueChange={(val) => {
                                    object.clearFlags =
                                        val as typeof object.clearFlags;
                                    onPropertyChange(object);
                                }}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {object.clearFlags.charAt(0).toUpperCase() +
                                        object.clearFlags.slice(1)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="solid_color"
                                        >Solid Color</Select.Item
                                    >
                                    <Select.Item value="skybox"
                                        >Skybox</Select.Item
                                    >
                                    <Select.Item value="depth_only"
                                        >Depth Only</Select.Item
                                    >
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Camera Controller Type (placeholder for future use) -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                                >Controller</label
                            >
                            <Select.Root
                                value={object.cameraType}
                                onValueChange={(val) => {
                                    object.cameraType =
                                        val as typeof object.cameraType;
                                    onPropertyChange(object);
                                }}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {object.cameraType.charAt(0).toUpperCase() +
                                        object.cameraType.slice(1)}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="static"
                                        >Static</Select.Item
                                    >
                                    <Select.Item value="fly">Fly</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Constraint Properties -->
            {#if object instanceof Types.BConstraint}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Hash class="w-4 h-4 text-orange-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Constraint
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Part A Selector -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Part A
                            </label>
                            <Select.Root
                                bind:value={partASelectorValue}
                                onValueChange={handlePartAChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {partASelectorValue
                                        ? partOptions().find(
                                              (opt: any) =>
                                                  opt.value ===
                                                  partASelectorValue
                                          )?.label || "Select first part..."
                                        : "Select first part..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each partOptions() as option}
                                        <Select.Item value={option.value}>
                                            {option.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Part B Selector -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Part B
                            </label>
                            <Select.Root
                                bind:value={partBSelectorValue}
                                onValueChange={handlePartBChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {partBSelectorValue
                                        ? partOptions().find(
                                              (opt: any) =>
                                                  opt.value ===
                                                  partBSelectorValue
                                          )?.label || "Select second part..."
                                        : "Select second part..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each partOptions() as option}
                                        <Select.Item value={option.value}>
                                            {option.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Constraint Type -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Constraint Type
                            </label>
                            <Select.Root
                                bind:value={object.constraintType}
                                onValueChange={(value) => {
                                    if (object instanceof Types.BConstraint) {
                                        object.constraintType =
                                            value as typeof object.constraintType;
                                        onPropertyChange?.(object);
                                    }
                                }}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {object.constraintType}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="fixed"
                                        >Fixed</Select.Item
                                    >
                                    <Select.Item value="spherical"
                                        >Spherical</Select.Item
                                    >
                                    <Select.Item value="revolute"
                                        >Revolute</Select.Item
                                    >
                                    <Select.Item value="prismatic"
                                        >Prismatic</Select.Item
                                    >
                                    <Select.Item value="spring"
                                        >Spring</Select.Item
                                    >
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Spring Properties -->
                        {#if object.constraintType === "spring"}
                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Stiffness
                                </label>
                                <Input
                                    type="number"
                                    bind:value={object.stiffness}
                                    step="0.1"
                                    min="0"
                                    class="h-9"
                                />
                            </div>

                            <div class="space-y-1.5">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Damping
                                </label>
                                <Input
                                    type="number"
                                    bind:value={object.damping}
                                    step="0.1"
                                    min="0"
                                    class="h-9"
                                />
                            </div>
                        {/if}

                        <!-- Prismatic Limits -->
                        {#if object.constraintType === "prismatic"}
                            <div class="space-y-1.5">
                                <div class="flex items-center gap-2">
                                    <Switch
                                        bind:checked={
                                            object.prismaticLimitsEnabled
                                        }
                                        onCheckedChange={() => {
                                            onPropertyChange?.(object);
                                        }}
                                    />
                                    <label
                                        class="text-xs font-medium text-foreground/80"
                                    >
                                        Enable Limits
                                    </label>
                                </div>
                            </div>

                            {#if object.prismaticLimitsEnabled}
                                <div class="space-y-1.5">
                                    <label
                                        class="text-xs font-medium text-foreground/80"
                                    >
                                        Min Limit
                                    </label>
                                    <Input
                                        type="number"
                                        bind:value={object.prismaticLimitsMin}
                                        step="0.1"
                                        class="h-9"
                                    />
                                </div>

                                <div class="space-y-1.5">
                                    <label
                                        class="text-xs font-medium text-foreground/80"
                                    >
                                        Max Limit
                                    </label>
                                    <Input
                                        type="number"
                                        bind:value={object.prismaticLimitsMax}
                                        step="0.1"
                                        class="h-9"
                                    />
                                </div>
                            {/if}
                        {/if}

                        <!-- Constraint Status -->
                        <div class="bg-muted/20 p-3 rounded-lg">
                            <p class="text-xs text-muted-foreground mb-2">
                                Status
                            </p>
                            <div class="flex items-center gap-2">
                                {#if object.partA && object.partB}
                                    <div
                                        class="w-2 h-2 bg-green-400 rounded-full"
                                    ></div>
                                    <span class="text-xs text-foreground">
                                        Connected: {object.partA.name} ↔ {object
                                            .partB.name}
                                    </span>
                                {:else}
                                    <div
                                        class="w-2 h-2 bg-yellow-400 rounded-full"
                                    ></div>
                                    <span class="text-xs text-muted-foreground">
                                        Incomplete - Select both parts
                                    </span>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Waypoint Navigator Properties -->
            {#if object instanceof Types.BWaypointNavigator}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <Navigation class="w-4 h-4 text-purple-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Waypoint Navigator
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Path Selector -->
                        <div class="space-y-1.5">
                            <div class="text-xs text-muted-foreground">
                                Path
                            </div>
                            <Select.Root
                                value={pathSelectorValue}
                                onValueChange={handlePathChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full">
                                    {pathOptions().length === 0
                                        ? "No Waypoint Paths in scene"
                                        : pathOptions().find(
                                              (path) =>
                                                  path.value ===
                                                  pathSelectorValue
                                          )?.label ||
                                          "Select a Waypoint Path..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#if pathOptions().length === 0}
                                        <div
                                            class="px-2 py-2 text-xs text-muted-foreground"
                                        >
                                            No Waypoint Paths in scene
                                        </div>
                                    {:else}
                                        {#each pathOptions() as opt (opt.value)}
                                            <Select.Item value={opt.value}>
                                                {opt.label}
                                            </Select.Item>
                                        {/each}
                                    {/if}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Movement Settings -->
                        <div class="grid grid-cols-3 gap-2">
                            <!-- Speed -->
                            <div class="space-y-1.5 col-span-2">
                                <label
                                    class="text-xs font-medium text-foreground/80"
                                    >Speed</label
                                >
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={object.speed}
                                    onchange={(e) => {
                                        object.speed =
                                            parseFloat(
                                                (e.target as HTMLInputElement)
                                                    .value
                                            ) || 0;
                                        onPropertyChange(object);
                                    }}
                                    class="h-9"
                                />
                            </div>

                            <!-- Loop Toggle -->
                            <div
                                class="flex items-center justify-between bg-muted/20 rounded-lg p-2.5"
                            >
                                <div
                                    class="text-xs font-medium text-foreground/80"
                                >
                                    Loop
                                </div>
                                <Switch
                                    checked={object.loop}
                                    onCheckedChange={(v) => {
                                        object.loop = v;
                                        onPropertyChange(object);
                                    }}
                                />
                            </div>
                        </div>

                        <!-- Wait Time -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                                >Wait Time (s)</label
                            >
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={object.waitTime}
                                onchange={(e) => {
                                    object.waitTime =
                                        parseFloat(
                                            (e.target as HTMLInputElement).value
                                        ) || 0;
                                    onPropertyChange(object);
                                }}
                                class="h-9"
                            />
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Motor Properties -->
            {#if object instanceof Types.BMotor}
                <div class="space-y-3">
                    <div class="flex items-center gap-2 px-1">
                        <RefreshCw class="w-4 h-4 text-cyan-400" />
                        <h3 class="font-medium text-sm text-foreground">
                            Motor
                        </h3>
                    </div>

                    <div class="space-y-3 px-1">
                        <!-- Wheel Part Selector -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Wheel Part
                            </label>
                            <Select.Root
                                bind:value={motorWheelSelectorValue}
                                onValueChange={handleMotorWheelChange}
                                type="single"
                            >
                                <Select.Trigger class="w-full h-9">
                                    {motorWheelSelectorValue
                                        ? motorWheelOptions().find(
                                              (opt: any) =>
                                                  opt.value ===
                                                  motorWheelSelectorValue
                                          )?.label || "Select wheel part..."
                                        : "Select wheel part..."}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each motorWheelOptions() as option}
                                        <Select.Item value={option.value}>
                                            {option.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- Enabled Toggle -->
                        <div
                            class="flex items-center justify-between bg-muted/20 rounded-lg p-3"
                        >
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Enabled
                            </label>
                            <Switch
                                checked={object.enabled}
                                onCheckedChange={(v) => {
                                    object.enabled = v;
                                    onPropertyChange(object);
                                }}
                            />
                        </div>

                        <!-- Speed (Angular Velocity) -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Speed (rad/s)
                            </label>
                            <Input
                                type="number"
                                step="0.1"
                                value={object.speed}
                                onchange={(e) => {
                                    object.speed =
                                        parseFloat(
                                            (e.target as HTMLInputElement).value
                                        ) || 0;
                                    onPropertyChange(object);
                                }}
                                class="h-9"
                            />
                        </div>

                        <!-- Max Force (Torque) -->
                        <div class="space-y-1.5">
                            <label
                                class="text-xs font-medium text-foreground/80"
                            >
                                Max Force (Torque)
                            </label>
                            <Input
                                type="number"
                                step="1"
                                min="0"
                                value={object.maxForce}
                                onchange={(e) => {
                                    object.maxForce =
                                        parseFloat(
                                            (e.target as HTMLInputElement).value
                                        ) || 100;
                                    onPropertyChange(object);
                                }}
                                class="h-9"
                            />
                        </div>

                        <!-- Motor Status -->
                        <div class="bg-muted/20 p-3 rounded-lg">
                            <p class="text-xs text-muted-foreground mb-2">
                                Status
                            </p>
                            <div class="flex items-center gap-2">
                                {#if object.wheelPart}
                                    <div
                                        class="w-2 h-2 bg-green-400 rounded-full"
                                    ></div>
                                    <span class="text-xs text-foreground">
                                        Ready: {object.parent?.name || "?"} → {object
                                            .wheelPart.name}
                                    </span>
                                {:else}
                                    <div
                                        class="w-2 h-2 bg-yellow-400 rounded-full"
                                    ></div>
                                    <span class="text-xs text-muted-foreground">
                                        Incomplete - Select wheel part
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <!-- Info Box -->
                        <div
                            class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg"
                        >
                            <p class="text-xs text-blue-400/90 leading-relaxed">
                                <strong>Setup:</strong> Place this Motor as a child
                                of a BPart (host) and select the wheel BPart to rotate.
                                The motor connects at the host's center and rotates
                                around the world Y-axis.
                            </p>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Debug Info (Development) -->
            <div class="space-y-3">
                <div class="flex items-center gap-2 px-1">
                    <Settings class="w-4 h-4 text-muted-foreground" />
                    <h3 class="font-medium text-sm text-muted-foreground">
                        Debug Info
                    </h3>
                </div>

                <div class="px-1">
                    <pre
                        class="text-xs text-muted-foreground overflow-auto max-h-32 bg-muted/20 p-3 rounded-lg font-mono">{JSON.stringify(
                            object,
                            (key, value) => {
                                // Handle circular references by excluding parent and replacing children with IDs
                                if (key === "parent") {
                                    return value
                                        ? {
                                              id: value.id,
                                              name: value.name,
                                              type: value.type,
                                          }
                                        : null;
                                }
                                if (key === "children") {
                                    return value.map((child: any) => ({
                                        id: child.id,
                                        name: child.name,
                                        type: child.type,
                                    }));
                                }
                                return value;
                            },
                            2
                        )}</pre>
                </div>
            </div>
        {:else}
            <!-- No object selected state -->
            <div
                class="flex flex-col items-center justify-center h-64 text-center px-4"
            >
                <Box class="w-12 h-12 text-muted-foreground mb-3" />
                <p class="text-muted-foreground text-sm">
                    Select an object to view properties
                </p>
            </div>
        {/if}
    </div>
</div>
