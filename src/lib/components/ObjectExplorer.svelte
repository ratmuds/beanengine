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

    export let sceneObjects: Array<{
        id: string;
        name: string;
        type: string;
        expanded: boolean;
        depth: number;
        visible?: boolean;
        locked?: boolean;
        children?: string[];
    }> = [];

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

    let searchQuery = "";
    let contextMenu: { x: number; y: number; objectId: string } | null = null;
    let selectedObjectId: string | null = null;

    $: filteredObjects = searchQuery.trim()
        ? sceneObjects.filter((obj) =>
              obj.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : sceneObjects;

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
        selectedObjectId = objectId;
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
        dispatch("addObject", { type });
    }
</script>

<svelte:document on:click={handleDocumentClick} />

<div
    class="h-full bg-gray-900/60 backdrop-blur-sm border-r border-gray-700/30 flex flex-col"
>
    <!-- Header -->
    <div class="p-4 border-b border-gray-700/30">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-gray-200 font-semibold">Object Explorer</h2>

            <Popover.Root>
                <Popover.Trigger
                    size="sm"
                    class="{buttonVariants({
                        variant: 'ghost',
                    })} h-7 w-7 p-0 text-gray-400 hover:text-green-400 hover:bg-green-500/20"
                    on:click={() => dispatch("addObject", {})}
                >
                    <Plus class="w-4 h-4" />
                </Popover.Trigger>
                <Popover.Content class="w-80">
                    <h2 class="font-semibold mb-1">Add Object</h2>

                    <Command.Root>
                        <Command.Input placeholder="Search for objects..." />
                        <Command.List>
                            <Command.Empty>No results found.</Command.Empty>
                            <Command.Group heading="Common">
                                <Command.Item value="part" onSelect={() => handleAddObjectType('Part')}>Part</Command.Item>
                                <Command.Item>Script</Command.Item>
                                <Command.Item>Light</Command.Item>
                            </Command.Group>
                            <Command.Separator />
                            <Command.Group heading="Other">
                                <Command.Item>Folder</Command.Item>
                                <Command.Item>Spawn</Command.Item>
                                <Command.Item>Particles</Command.Item>
                                <Command.Item>Constraint</Command.Item>
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

        <!-- Search -->
        <div class="mt-3 relative">
            <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
            />
            <Input
                bind:value={searchQuery}
                type="text"
                placeholder="Search objects..."
                class="pl-8 bg-gray-800/50 border-gray-700/30 text-gray-200 text-sm h-8 focus:border-blue-500 focus:outline-none"
            />
        </div>
    </div>

    <!-- Object Tree -->
    <div class="flex-1 overflow-y-auto p-2">
        <div class="space-y-0.5">
            {#each filteredObjects as obj (obj.id)}
                {@const Icon = getObjectIcon(obj.type)}
                {@const hasChildren = obj.children && obj.children.length > 0}
                <div
                    class="group relative flex items-center gap-1 px-2 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-800/60 cursor-pointer transition-colors {selectedObjectId ===
                    obj.id
                        ? 'bg-blue-600/20 text-blue-300'
                        : ''}"
                    style="margin-left: {obj.depth * 16}px"
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
                                    class="w-4 flex justify-center"
                                    style="margin-left: {i * 16}px"
                                >
                                    {#if i === obj.depth - 1}
                                        <div
                                            class="w-px bg-gray-600/40 h-full"
                                        ></div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Expand/Collapse button -->
                    <div
                        class="w-4 h-4 flex items-center justify-center relative z-10"
                    >
                        {#if hasChildren}
                            <button
                                class="w-3 h-3 text-gray-500 hover:text-gray-300 transition-colors"
                                on:click|stopPropagation={() =>
                                    handleToggleExpanded(obj.id)}
                            >
                                {#if obj.expanded}
                                    <ChevronDown class="w-3 h-3" />
                                {:else}
                                    <ChevronRight class="w-3 h-3" />
                                {/if}
                            </button>
                        {/if}
                    </div>

                    <!-- Icon -->
                    <div class="w-4 h-4 flex items-center justify-center">
                        {#if obj.type === "folder"}
                            {#if obj.expanded}
                                <FolderOpen class="w-4 h-4 text-yellow-400" />
                            {:else}
                                <Folder class="w-4 h-4 text-yellow-400" />
                            {/if}
                        {:else}
                            <Icon class="w-4 h-4 text-gray-400" />
                        {/if}
                    </div>

                    <!-- Name -->
                    <span class="flex-1 font-medium truncate">{obj.name}</span>

                    <!-- Controls -->
                    <div
                        class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <button
                            class="w-5 h-5 p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                            on:click={(e) => handleToggleVisibility(e, obj.id)}
                            title={obj.visible === false ? "Show" : "Hide"}
                        >
                            {#if obj.visible === false}
                                <EyeOff class="w-4 h-4" />
                            {:else}
                                <Eye class="w-4 h-4" />
                            {/if}
                        </button>
                        <button
                            class="w-5 h-5 p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
                            on:click={(e) => handleToggleLock(e, obj.id)}
                            title={obj.locked ? "Unlock" : "Lock"}
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

<!-- Context Menu -->
{#if contextMenu}
    <div
        class="fixed bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-md shadow-lg py-1 z-50 min-w-40"
        style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    >
        <button
            class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/60 flex items-center gap-2 transition-colors"
            on:click={() => handleContextAction("copy")}
        >
            <Copy class="w-4 h-4" />
            Copy
        </button>
        <button
            class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/60 flex items-center gap-2 transition-colors"
            on:click={() => handleContextAction("duplicate")}
        >
            <FileImage class="w-4 h-4" />
            Duplicate
        </button>
        <div class="h-px bg-gray-700/50 my-1"></div>
        <button
            class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/60 flex items-center gap-2 transition-colors"
            on:click={() => handleContextAction("goto")}
        >
            <Navigation class="w-4 h-4" />
            Go to Object
        </button>
        <div class="h-px bg-gray-700/50 my-1"></div>
        <button
            class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
            on:click={() => handleContextAction("delete")}
        >
            <Trash2 class="w-4 h-4" />
            Delete
        </button>
    </div>
{/if}
