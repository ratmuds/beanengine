<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import { Switch } from "$lib/components/ui/switch";
    import Vector3Input from "./properties/Vector3Input.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import ClassSelector from "./properties/ClassSelector.svelte";
    import {
        ChevronDown,
        ChevronRight,
        Box,
        Move3d,
        Palette,
        Eye,
        Search,
        Hexagon,
        Sun,
        Settings,
        MoreHorizontal,
        Hash,
    } from "lucide-svelte";
    import * as Types from "$lib/types";

    let { sceneStore, selectedObject, onPropertyChange } = $props();

    let object = $derived(
        $sceneStore.getScene().objects.find((obj) => obj.id === selectedObject)
    );

    $effect(() => {
        console.log("Selected Object:", selectedObject);
        console.log("AAAAAAAAAAAAAAAAAAAAA", $sceneStore);
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
    <div class="p-4 border-b border-border/30 relative z-10">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-foreground font-semibold">Properties</h2>
            <Button
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-muted-foreground hover:text-green-400 hover:bg-green-500/20"
                on:click={() => dispatch("addObject", {})}
            >
                <MoreHorizontal class="w-4 h-4" />
            </Button>
        </div>

        <!-- Search -->
        <div class="mt-3 relative">
            <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <Input
                type="text"
                placeholder="Search properties..."
                class="pl-8 bg-muted/50 border-border/30 text-foreground text-sm h-8 focus:border-blue-500 focus:outline-none"
            />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto relative z-10">
        {#if object}
            <!-- Object Name -->
            <div class="px-3 py-2 border-b border-border">
                <label class="text-xs text-muted-foreground block mb-1 ml-1"
                    >Object Name</label
                >

                <Input
                    type="text"
                    value={object.name}
                    class="bg-transparent border-0 text-foreground text-sm font-medium h-auto focus:ring-0 focus:border-0"
                    onchange={(e) => {
                        object.name = e.target.value;
                        onPropertyChange(object);
                    }}
                />
                <div
                    class="text-xs text-muted-foreground font-mono mt-0.5 ml-1 flex items-center gap-1"
                >
                    <Hash class="w-3 h-3" />
                    {object.id}
                </div>
            </div>

            <!-- Node3D Properties -->
            {#if object instanceof Types.BNode3D}
                <div class="p-3 space-y-4">
                    <h3 class="font-semibold">
                        <Hexagon class="w-5 h-5 inline-block" /> Node
                    </h3>

                    <Vector3Input
                        label="Position"
                        bind:value={object.position}
                        on:change={(e) => {
                            object.position = e.detail.value;
                            onPropertyChange(object);
                        }}
                    />
                    <Vector3Input
                        label="Rotation"
                        bind:value={object.rotation}
                        on:change={(e) => {
                            object.rotation = e.detail.value;
                            onPropertyChange(object);
                        }}
                    />
                    <Vector3Input
                        label="Scale"
                        bind:value={object.scale}
                        on:change={(e) => {
                            object.scale = e.detail.value;
                            onPropertyChange(object);
                        }}
                    />
                </div>
            {/if}

            <!-- Part Properties -->
            {#if object instanceof Types.BPart}
                <div class="p-3 space-y-4">
                    <h3 class="font-semibold">
                        <Box class="w-5 h-5 inline-block" /> Part
                    </h3>

                    <p class="text-sm text-muted-foreground">Mesh</p>
                    <p>Block</p>
                </div>
            {/if}

            {JSON.stringify(object, null, 2)}
        {:else}
            <!-- No object selected state -->
            <div
                class="flex flex-col items-center justify-center h-64 text-center px-4"
            >
                <Box class="w-8 h-8 text-muted-foreground mb-2" />
                <p class="text-muted-foreground text-sm">
                    Select an object to view properties
                </p>
            </div>
        {/if}
    </div>
</div>
