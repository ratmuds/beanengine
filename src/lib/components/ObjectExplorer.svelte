<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import * as Command from "$lib/components/ui/command/index.js";
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import ItemSwitcher from "./ItemSwitcher.svelte";
    import {
        FolderOpen,
        Folder,
        Camera,
        Lightbulb,
        Box,
        ChevronRight,
        ChevronDown,
        Plus,
        Search,
        Copy,
        FileImage,
        Trash2,
        Eye,
        EyeOff,
        Lock,
        Unlock,
        Navigation,
    } from "lucide-svelte";
    import Separator from "./ui/separator/separator.svelte";

    /*export let sceneObjects: Array<{
        id: string;
        name: string;
        type: string;
        expanded: boolean;
        depth: number;
        visible?: boolean;
        locked?: boolean;
        children?: string[];
    }> = [];*/

    let { sceneStore, selectedObject = $bindable(-1) } = $props();

    const dispatch = createEventDispatcher<{
        selectObject: { id: string };
        toggleExpanded: { id: string };
        addObject: { parentId?: string; type?: string };
        deleteObject: { id: string };
        duplicateObject: { id: string };
        copyObject: { id: string };
        toggleVisibility: { id: string };
        toggleLock: { id: string };
        gotoObject: { id: string };
    }>();

    let searchQuery = $state("");
    let contextMenu: { x: number; y: number; objectId: string } | null =
        $state(null);

    let filteredObjects = $state([]);

    $effect(() => {
        filteredObjects = searchQuery.trim()
            ? $sceneStore
                  .getScene()
                  .objects.filter((obj) =>
                      obj.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
            : $sceneStore.getScene().objects;
    });

    function getObjectIcon(type: string) {
        switch (type) {
            case "camera":
                return Camera;
            case "light":
                return Lightbulb;
            case "folder":
                return Folder;
            case "mesh":
                return Box;
            case "script":
                return FileImage;
            default:
                return Box;
        }
    }

    function handleRightClick(event: MouseEvent, objectId: string) {
        event.preventDefault();
        contextMenu = {
            x: event.clientX,
            y: event.clientY,
            objectId,
        };
    }

    function handleObjectClick(objectId: string) {
        selectedObject = objectId;
        dispatch("selectObject", { id: objectId });
    }

    function handleToggleExpanded(objectId: string) {
        dispatch("toggleExpanded", { id: objectId });
    }

    function closeContextMenu() {
        contextMenu = null;
    }

    function handleContextAction(action: string) {
        if (!contextMenu) return;

        const objectId = contextMenu.objectId;
        closeContextMenu();

        switch (action) {
            case "copy":
                dispatch("copyObject", { id: objectId });
                break;
            case "duplicate":
                dispatch("duplicateObject", { id: objectId });
                break;
            case "delete":
                dispatch("deleteObject", { id: objectId });
                break;
            case "goto":
                dispatch("gotoObject", { id: objectId });
                break;
        }
    }

    function handleToggleVisibility(event: MouseEvent, objectId: string) {
        event.stopPropagation();
        dispatch("toggleVisibility", { id: objectId });
    }

    function handleToggleLock(event: MouseEvent, objectId: string) {
        event.stopPropagation();
        dispatch("toggleLock", { id: objectId });
    }

    // Close context menu when clicking elsewhere
    function handleDocumentClick() {
        closeContextMenu();
    }

    function handleAddObjectType(type: string) {
        console.log(`Adding object of type: ${type}`);
        dispatch("addObject", { type });
    }
</script>

<svelte:document on:click={handleDocumentClick} />

<div
    class="h-full bg-card/60 backdrop-blur-sm border-r border-border/30 flex flex-col relative overflow-hidden"
>
    <!-- Subtle gradient accent -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/3 pointer-events-none"
    ></div>

    <!-- Header - Enhanced with better spacing and typography -->
    <div class="p-5 border-b border-border/30 relative z-10 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-foreground font-semibold text-lg">
                Object Explorer
            </h2>

            <Popover.Root>
                <Popover.Trigger
                    size="sm"
                    class="{buttonVariants({
                        variant: 'outline',
                    })} h-10 w-10 p-0 rounded-xl shadow-sm transition-all duration-200"
                    on:click={() => dispatch("addObject", {})}
                    title="Add new object"
                >
                    <Plus class="w-5 h-5" />
                </Popover.Trigger>
                <Popover.Content
                    class="w-80 bg-card/95 backdrop-blur-md border-border/60 rounded-xl shadow-lg"
                >
                    <h2 class="font-semibold mb-3 text-base">Add Object</h2>

                    <Command.Root>
                        <Command.Input
                            placeholder="Search for objects..."
                            class="rounded-lg"
                        />
                        <Command.List>
                            <Command.Empty>No results found.</Command.Empty>
                            <Command.Group heading="Common">
                                <Command.Item
                                    value="part"
                                    onSelect={() => handleAddObjectType("Part")}
                                    class="rounded-lg m-1">Part</Command.Item
                                >
                                <Command.Item class="rounded-lg m-1"
                                    >Script</Command.Item
                                >
                                <Command.Item class="rounded-lg m-1"
                                    >Light</Command.Item
                                >
                            </Command.Group>
                            <Command.Separator />
                            <Command.Group heading="Other">
                                <Command.Item class="rounded-lg m-1"
                                    >Folder</Command.Item
                                >
                                <Command.Item class="rounded-lg m-1"
                                    >Spawn</Command.Item
                                >
                                <Command.Item class="rounded-lg m-1"
                                    >Particles</Command.Item
                                >
                                <Command.Item class="rounded-lg m-1"
                                    >Constraint</Command.Item
                                >
                            </Command.Group>
                        </Command.List>
                    </Command.Root>
                </Popover.Content>
            </Popover.Root>
        </div>

        <!-- Scene Selector -->
        <ItemSwitcher
            name="Scene"
            options={["Default"]}
            defaultOption="Default"
        >
            <FolderOpen class="w-4 h-4" />
        </ItemSwitcher>

        <!-- Search - Enhanced with pill shape and better styling -->
        <div class="relative">
            <div
                class="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
            >
                <Search class="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
                bind:value={searchQuery}
                type="text"
                placeholder="Search objects..."
                class="pl-12 pr-4 py-3 bg-muted/40 border-border/40 text-foreground text-sm rounded-xl h-11 focus:border-blue-400/60 focus:bg-muted/60 focus:outline-none transition-all duration-200 shadow-sm"
            />
        </div>
    </div>

    <!-- Object Tree - Enhanced with modern pill-shaped items -->
    <div class="flex-1 overflow-y-auto p-3 relative z-10">
        <div class="space-y-1">
            {#each filteredObjects as obj (obj.id)}
                {@const Icon = getObjectIcon(obj.type)}
                {@const hasChildren = obj.children && obj.children.length > 0}
                <div
                    class="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/60 cursor-pointer transition-all duration-200 {selectedObject ===
                    obj.id
                        ? 'bg-blue-500/15 text-blue-300 shadow-sm border border-blue-400/30'
                        : 'hover:shadow-sm'} min-h-[44px]"
                    style="margin-left: {obj.depth * 20}px"
                    on:click={() => handleObjectClick(obj.id)}
                    on:contextmenu={(e) => handleRightClick(e, obj.id)}
                    role="button"
                    tabindex="0"
                >
                    <!-- Connection lines for depth visualization -->
                    {#if obj.depth > 0}
                        <div class="absolute left-0 top-0 bottom-0 flex">
                            {#each Array(obj.depth) as _, i}
                                <div
                                    class="w-5 flex justify-center"
                                    style="margin-left: {i * 20}px"
                                >
                                    {#if i === obj.depth - 1}
                                        <div
                                            class="w-px bg-border/40 h-full"
                                        ></div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Expand/Collapse button -->
                    <div
                        class="w-6 h-6 flex items-center justify-center relative z-10"
                    >
                        {#if hasChildren}
                            <button
                                class="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 flex items-center justify-center"
                                on:click|stopPropagation={() =>
                                    handleToggleExpanded(obj.id)}
                                title={obj.expanded ? "Collapse" : "Expand"}
                            >
                                {#if obj.expanded}
                                    <ChevronDown class="w-4 h-4" />
                                {:else}
                                    <ChevronRight class="w-4 h-4" />
                                {/if}
                            </button>
                        {/if}
                    </div>

                    <!-- Icon with color coding -->
                    <div class="w-6 h-6 flex items-center justify-center">
                        {#if obj.type === "folder"}
                            {#if obj.expanded}
                                <FolderOpen class="w-5 h-5 text-amber-400" />
                            {:else}
                                <Folder class="w-5 h-5 text-amber-400" />
                            {/if}
                        {:else if obj.type === "camera"}
                            <Icon class="w-5 h-5 text-purple-400" />
                        {:else if obj.type === "light"}
                            <Icon class="w-5 h-5 text-yellow-400" />
                        {:else if obj.type === "script"}
                            <Icon class="w-5 h-5 text-green-400" />
                        {:else}
                            <Icon class="w-5 h-5 text-blue-400" />
                        {/if}
                    </div>

                    <!-- Name with better typography -->
                    <span class="flex-1 font-medium truncate text-base"
                        >{obj.name}</span
                    >

                    <!-- Controls with better styling -->
                    <div
                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                        <button
                            class="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 flex items-center justify-center {obj.visible ===
                            false
                                ? 'text-orange-400 hover:text-orange-300'
                                : ''}"
                            on:click={(e) => handleToggleVisibility(e, obj.id)}
                            title={obj.visible === false
                                ? "Show object"
                                : "Hide object"}
                        >
                            {#if obj.visible === false}
                                <EyeOff class="w-4 h-4" />
                            {:else}
                                <Eye class="w-4 h-4" />
                            {/if}
                        </button>
                        <button
                            class="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 flex items-center justify-center {obj.locked
                                ? 'text-red-400 hover:text-red-300'
                                : ''}"
                            on:click={(e) => handleToggleLock(e, obj.id)}
                            title={obj.locked ? "Unlock object" : "Lock object"}
                        >
                            {#if obj.locked}
                                <Lock class="w-4 h-4" />
                            {:else}
                                <Unlock class="w-4 h-4" />
                            {/if}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Context Menu - Enhanced with modern styling -->
{#if contextMenu}
    <div
        class="fixed bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-xl p-2 z-50 min-w-48"
        style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    >
        <button
            class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
            on:click={() => handleContextAction("copy")}
        >
            <Copy class="w-4 h-4 text-blue-400" />
            Copy
        </button>
        <button
            class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
            on:click={() => handleContextAction("duplicate")}
        >
            <FileImage class="w-4 h-4 text-green-400" />
            Duplicate
        </button>
        <div class="h-px bg-border/30 my-2 mx-2"></div>
        <button
            class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
            on:click={() => handleContextAction("goto")}
        >
            <Navigation class="w-4 h-4 text-purple-400" />
            Go to Object
        </button>
        <div class="h-px bg-border/30 my-2 mx-2"></div>
        <button
            class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
            on:click={() => handleContextAction("delete")}
        >
            <Trash2 class="w-4 h-4" />
            Delete
        </button>
    </div>
{/if}
