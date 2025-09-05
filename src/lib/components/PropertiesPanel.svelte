<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import Vector3Input from "./properties/Vector3Input.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import {
        ChevronDown,
        Box,
        Search,
        Hexagon,
        Settings,
        MoreHorizontal,
        Hash,
        FileCode,
    } from "lucide-svelte";
    import * as Types from "$lib/types";
    import { assetStore } from "$lib/assetStore";

    const { sceneStore, selectedObject, onPropertyChange } = $props();

    const object = $derived(
        $sceneStore.getScene().objects.find((obj) => obj.id === selectedObject)
    );
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
            <h2 class="text-foreground font-semibold text-lg">Properties</h2>
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
                <label
                    class="text-sm font-medium text-foreground/80 block mb-3"
                >
                    Object Name
                </label>

                <Input
                    type="text"
                    value={object.name}
                    class="bg-muted/30 border-border/40 text-foreground text-base font-medium h-12 px-4 rounded-lg focus:border-blue-400/60 focus:bg-muted/50 focus:outline-none transition-all duration-200"
                    onchange={(e) => {
                        const target = e.target;
                        if (target && target.value !== undefined) {
                            const updatedObject = object.clone();
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

            <!-- Node3D Properties -->
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
                            // Convert Vector3 to BQuaternion (simplified conversion)
                            const euler = e.detail.value;
                            const updatedObject = object.clone();
                            updatedObject.rotation = new Types.BQuaternion(
                                euler.x,
                                euler.y,
                                euler.z,
                                1 // w component
                            );
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
                        <div class="space-y-2">
                            <label
                                class="text-sm font-medium text-foreground/80"
                            >
                                Mesh Type
                            </label>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button
                                        variant="outline"
                                        class="w-full justify-between bg-muted/30 border-border/40 hover:bg-muted/50 h-12"
                                    >
                                        <span class="text-left truncate">
                                            {object.meshSource.type ===
                                            "primitive"
                                                ? object.meshSource.value
                                                : assetStore.getAsset(
                                                      object.meshSource.value
                                                  )?.metadata.name}
                                        </span>
                                        <ChevronDown
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content
                                    class="w-80 max-h-64 overflow-y-auto"
                                >
                                    <!-- Primitive Meshes -->
                                    <DropdownMenu.Label
                                        >Primitives</DropdownMenu.Label
                                    >
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "block"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <Box
                                            class="w-4 h-4 text-blue-400 mr-2"
                                        />
                                        Block
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "sphere"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <div
                                            class="w-4 h-4 bg-blue-400 rounded-full mr-2"
                                        ></div>
                                        Sphere
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "cylinder"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <div
                                            class="w-4 h-4 bg-blue-400 rounded-sm mr-2"
                                        ></div>
                                        Cylinder
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "cone"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <div
                                            class="w-4 h-4 bg-blue-400 mr-2"
                                            style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%)"
                                        ></div>
                                        Cone
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "plane"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <div
                                            class="w-4 h-1 bg-blue-400 mr-2"
                                        ></div>
                                        Plane
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            const updatedObject =
                                                object.clone();
                                            updatedObject.setPrimitiveMesh(
                                                "wedge"
                                            );
                                            onPropertyChange(updatedObject);
                                        }}
                                    >
                                        <div
                                            class="w-4 h-4 bg-blue-400 mr-2"
                                            style="clip-path: polygon(0% 100%, 100% 100%, 100% 0%)"
                                        ></div>
                                        Wedge
                                    </DropdownMenu.Item>

                                    <!-- Asset Meshes -->
                                    {#if $assetStore
                                        .getAllAssets()
                                        .filter((asset) => asset.metadata.type === "mesh").length > 0}
                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Label
                                            >Assets</DropdownMenu.Label
                                        >
                                        {#each $assetStore
                                            .getAllAssets()
                                            .filter((asset) => asset.metadata.type === "mesh") as asset (asset.metadata.id)}
                                            <DropdownMenu.Item
                                                onclick={() => {
                                                    console.log(object);
                                                    const updatedObject =
                                                        object.clone();
                                                    console.log(updatedObject);
                                                    updatedObject.setAssetMesh(
                                                        asset.metadata.id
                                                    );
                                                    onPropertyChange(
                                                        updatedObject
                                                    );
                                                }}
                                            >
                                                <div
                                                    class="flex items-center gap-2 w-full"
                                                >
                                                    <Box
                                                        class="w-4 h-4 text-purple-400"
                                                    />
                                                    <div class="flex-1 min-w-0">
                                                        <div
                                                            class="font-medium truncate"
                                                        >
                                                            {asset.metadata
                                                                .name}
                                                        </div>
                                                        <div
                                                            class="text-xs text-muted-foreground truncate"
                                                        >
                                                            {(
                                                                asset.metadata
                                                                    .size /
                                                                1024 /
                                                                1024
                                                            ).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                            </DropdownMenu.Item>
                                        {/each}
                                    {/if}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </div>
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
                        null,
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
