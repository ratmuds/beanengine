<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import Input from "$lib/components/ui/input/input.svelte";
    import Vector3Input from "$lib/components/properties/Vector3Input.svelte";

    import * as Select from "$lib/components/ui/select/index.js";
    import {
        ChevronDown,
        Box,
        Search,
        Hexagon,
        Settings,
        MoreHorizontal,
        Hash,
        FileCode,
        RefreshCw,
    } from "lucide-svelte";
    import * as Types from "$lib/types";
    import { assetStore } from "$lib/assetStore";
    import { materialStore } from "$lib/materialStore";
    import AxisLockControls from "$lib/components/properties/AxisLockControls.svelte";
    import { sceneStore } from "$lib/sceneStore";

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
            {
                value: "primitive-cone",
                label: "Cone",
                data: { type: "primitive", value: "cone" },
            },
            {
                value: "primitive-plane",
                label: "Plane",
                data: { type: "primitive", value: "plane" },
            },
            {
                value: "primitive-wedge",
                label: "Wedge",
                data: { type: "primitive", value: "wedge" },
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

        const selectedOption = meshOptions().find((option: any) => option.value === value);
        if (!selectedOption) return;

        const updatedObject = object.clone();

        if (selectedOption.data.type === "primitive") {
            updatedObject.setPrimitiveMesh(selectedOption.data.value as any);
        } else {
            updatedObject.setAssetMesh(selectedOption.data.value);
        }

        onPropertyChange(updatedObject);
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

        const updatedObject = object.clone();
        updatedObject.material = value;
        onPropertyChange(updatedObject);
    }

    function handleAxisLockChange(event: any) {
        if (!object || !(object instanceof Types.BPart)) return;

        const updatedObject = event.detail.object.clone();
        onPropertyChange(updatedObject);
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

    function handlePartAChange(value: string) {
        if (!object || !(object instanceof Types.BConstraint)) return;

        const selectedPart = $sceneStore
            .getScene()
            .objects.find((obj) => obj.id === value);
        if (!selectedPart || !(selectedPart instanceof Types.BPart)) return;

        // Create a new constraint with the updated partA
        const updatedObject = new Types.BConstraint(
            object.name,
            object.id,
            object.parent,
            selectedPart,
            object.partB
        );
        onPropertyChange(updatedObject);
    }

    function handlePartBChange(value: string) {
        if (!object || !(object instanceof Types.BConstraint)) return;

        const selectedPart = $sceneStore
            .getScene()
            .objects.find((obj) => obj.id === value);
        if (!selectedPart || !(selectedPart instanceof Types.BPart)) return;

        // Create a new constraint with the updated partB
        const updatedObject = new Types.BConstraint(
            object.name,
            object.id,
            object.parent,
            object.partA,
            selectedPart
        );
        onPropertyChange(updatedObject);
    }
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

    <div class="flex-1 overflow-y-auto relative z-10 p-4 space-y-5">
        {#if object}
            <!-- Object Name -->
            <div
                class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-sm"
            >
                <div class="space-y-3">
                    <label for="object-name-input" class="text-sm font-medium text-foreground/80 block">
                        Object Name
                    </label>

                    <Input
                        id="object-name-input"
                        type="text"
                        value={object.name}
                        class="bg-muted/30 border-border/40 text-foreground text-base font-medium h-12 px-4 rounded-lg focus:border-blue-400/60 focus:bg-muted/50 focus:outline-none transition-all duration-200"
                        onchange={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target && target.value !== undefined) {
                                const updatedObject = (object as any).clone();
                                updatedObject.name = target.value;
                                onPropertyChange(updatedObject);
                            }
                        }}
                    />
                    <div
                        class="text-xs text-muted-foreground font-mono mt-3 flex items-center gap-2 px-2"
                    >
                        <Hash class="w-3 h-3" />
                        <span class="bg-muted/40 px-2 py-1 rounded-md"
                            >{object.id}</span
                        >
                    </div>
                </div>
            </div>            <!-- Node3D Properties -->
            {#if object instanceof Types.BNode3D}
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-5 shadow-sm space-y-5"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-blue-500/10 rounded-lg">
                            <Hexagon class="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Transform
                        </h3>
                    </div>

                    <Vector3Input
                        label="Position"
                        bind:value={object.position}
                        on:change={(e) => {
                            const updatedObject = object.clone();
                            updatedObject.position = e.detail.value;
                            onPropertyChange(updatedObject);
                        }}
                    />
                    <Vector3Input
                        label="Rotation"
                        bind:value={object.rotation}
                        on:change={(e) => {
                            // Keep Euler angles for BNode3D (user-facing)
                            const updatedObject = object.clone();
                            updatedObject.rotation = e.detail.value;
                            onPropertyChange(updatedObject);
                        }}
                    />
                    <Vector3Input
                        label="Scale"
                        bind:value={object.scale}
                        on:change={(e) => {
                            const updatedObject = object.clone();
                            updatedObject.scale = e.detail.value;
                            onPropertyChange(updatedObject);
                        }}
                    />

                    <Alert.Root>
                        <Alert.Title class="font-semibold">Warning</Alert.Title>
                        <Alert.Description>
                            Due to limitations, these values will not update in
                            realtime.

                            <Button
                                variant="outline"
                                class="mt-2"
                                onclick={updateObjectInfo}
                            >
                                <RefreshCw />
                                Update</Button
                            >
                        </Alert.Description>
                    </Alert.Root>
                </div>
            {/if}

            <!-- Part Properties -->
            {#if object instanceof Types.BPart}
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-green-500/10 rounded-lg">
                            <Box class="w-5 h-5 text-green-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Part Properties
                        </h3>
                    </div>

                    <div class="space-y-3">
                        <!-- Mesh Selector -->
                        <label class="space-y-2 block">
                            <span class="text-sm font-medium text-foreground/80">
                                Mesh Type
                            </span>
                            <Select.Root bind:value={meshSelectorValue} onValueChange={handleMeshChange} type="single">
                                <Select.Trigger class="w-full">
                                    {meshSelectorValue ? 
                                        meshOptions().find((opt: any) => opt.value === meshSelectorValue)?.label || "Select a mesh"
                                        : "Select a mesh"}
                                </Select.Trigger>
                                <Select.Content>
                                    {#each meshOptions() as option}
                                        <Select.Item value={option.value}>
                                            <div class="flex items-center gap-2">
                                                {#if option.data.type === "primitive"}
                                                    {#if option.data.value === "block"}
                                                        <Box class="w-4 h-4 text-blue-400" />
                                                    {:else if option.data.value === "sphere"}
                                                        <div class="w-4 h-4 bg-blue-400 rounded-full"></div>
                                                    {:else if option.data.value === "cylinder"}
                                                        <div class="w-4 h-4 bg-blue-400 rounded-sm"></div>
                                                    {:else if option.data.value === "cone"}
                                                        <div class="w-4 h-4 bg-blue-400" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"></div>
                                                    {:else if option.data.value === "plane"}
                                                        <div class="w-4 h-1 bg-blue-400"></div>
                                                    {:else if option.data.value === "wedge"}
                                                        <div class="w-4 h-4 bg-blue-400" style="clip-path: polygon(0% 100%, 100% 100%, 100% 0%)"></div>
                                                    {/if}
                                                {:else}
                                                    <Box class="w-4 h-4 text-purple-400" />
                                                {/if}
                                                <span>{option.label}</span>
                                                {#if option.data.type === "asset" && (option.data as any).size}
                                                    <span class="text-xs text-muted-foreground ml-auto">
                                                        {((option.data as any).size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                {/if}
                                            </div>
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </label>

                        <!-- Material Selector -->
                        <label class="space-y-2 block">
                            <span class="text-sm font-medium text-foreground/80">
                                Material
                            </span>
                            <Select.Root bind:value={materialSelectorValue} onValueChange={handleMaterialChange} type="single">
                                <Select.Trigger class="w-full">
                                    {materialSelectorValue ? 
                                        materialOptions().find((opt: any) => opt.value === materialSelectorValue)?.label || "Select material..."
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
                        </label>

                        <!-- Axis Lock Controls -->
                        <AxisLockControls
                            {object}
                            on:change={handleAxisLockChange}
                        />
                    </div>
                </div>
            {/if}

            <!-- Script Properties -->
            {#if object instanceof Types.BScript}
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-green-500/10 rounded-lg">
                            <FileCode class="w-5 h-5 text-green-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Script Properties
                        </h3>
                    </div>

                    <div class="space-y-3">
                        <div
                            class="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                            <span class="text-sm font-medium text-foreground/80"
                                >Code Blocks</span
                            >
                            <span
                                class="text-sm font-mono text-foreground bg-muted/40 px-2 py-1 rounded-md"
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
                                class="w-full justify-start"
                                disabled
                            >
                                <FileCode class="w-4 h-4 mr-2" />
                                Open Code Editor (Coming Soon)
                            </Button>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Constraint Properties -->
            {#if object instanceof Types.BConstraint}
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-5 shadow-sm space-y-4"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-orange-500/10 rounded-lg">
                            <Hash class="w-5 h-5 text-orange-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Constraint Properties
                        </h3>
                    </div>

                    <div class="space-y-4">
                        <!-- Part A Selector -->
                        <label class="space-y-2 block">
                            <span class="text-sm font-medium text-foreground/80">
                                Part A
                            </span>
                            <Select.Root bind:value={partASelectorValue} onValueChange={handlePartAChange} type="single">
                                <Select.Trigger class="w-full">
                                    {partASelectorValue ? 
                                        partOptions().find((opt: any) => opt.value === partASelectorValue)?.label || "Select first part..."
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
                        </label>

                        <!-- Part B Selector -->
                        <label class="space-y-2 block">
                            <span class="text-sm font-medium text-foreground/80">
                                Part B
                            </span>
                            <Select.Root bind:value={partBSelectorValue} onValueChange={handlePartBChange} type="single">
                                <Select.Trigger class="w-full">
                                    {partBSelectorValue ? 
                                        partOptions().find((opt: any) => opt.value === partBSelectorValue)?.label || "Select second part..."
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
                        </label>

                        <!-- Constraint Status -->
                        <div class="bg-muted/20 p-3 rounded-lg">
                            <p class="text-xs text-muted-foreground mb-2">
                                Constraint Status
                            </p>
                            <div class="flex items-center gap-2">
                                {#if object.partA && object.partB}
                                    <div
                                        class="w-2 h-2 bg-green-400 rounded-full"
                                    ></div>
                                    <span class="text-sm text-foreground">
                                        Constraint - {object.partA.name} ↔ {object
                                            .partB.name}
                                    </span>
                                {:else}
                                    <div
                                        class="w-2 h-2 bg-yellow-400 rounded-full"
                                    ></div>
                                    <span class="text-sm text-muted-foreground">
                                        Incomplete - Select both parts
                                    </span>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Debug Info (Development) -->
            <div
                class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 shadow-sm"
            >
                <div class="flex items-center gap-2 mb-3">
                    <Settings class="w-4 h-4 text-muted-foreground" />
                    <h4 class="font-medium text-sm text-muted-foreground">
                        Debug Info
                    </h4>
                </div>
                <pre
                    class="text-xs text-muted-foreground overflow-auto max-h-48 bg-muted/20 p-3 rounded-lg font-mono">{JSON.stringify(
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
