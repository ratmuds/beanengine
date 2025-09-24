<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import * as Command from "$lib/components/ui/command/index.js";
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import ItemSwitcher from "$lib/components/ItemSwitcher.svelte";
    import {
        FolderOpen,
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
        FileCode,
        FolderTree,
        Folder,
        Clipboard,
    } from "lucide-svelte";
    import { sceneStore } from "$lib/sceneStore";

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

    let { selectedObject = $bindable(-1) } = $props();

    const dispatch = createEventDispatcher();

    let searchQuery = $state("");
    let contextMenu = $state<{
        x: number;
        y: number;
        objectId: string | null;
    } | null>(null);
    let draggedObject: string | null = $state(null);
    let dragOverObject: string | null = $state(null);
    let addDialogOpen = $state(false);
    let addDialogParentId: string | number = $state(-1);

    // Clipboard state for copy/paste functionality
    let copiedObject: any = $state(null);

    // Track expanded state of objects
    let expandedObjects = $state(new Set<string>());

    interface ObjectTreeItem {
        id: string;
        name: string;
        type: string;
        depth: number;
        hasChildren: boolean;
        expanded: boolean;
        children: string[];
        visible?: boolean;
        locked?: boolean;
        parent?: any;
    }

    let filteredObjects = $state<ObjectTreeItem[]>([]);

    function flattenObjectsHierarchy(
        objects: any[],
        allObjects: any[],
        depth = 0
    ): any[] {
        const flattened: any[] = [];

        for (const obj of objects) {
            // Find children of this object
            const children = allObjects.filter((child) => {
                if (!child.parent) return false;
                // Handle both string parent IDs and parent objects
                return typeof child.parent === "string"
                    ? child.parent === obj.id
                    : child.parent.id === obj.id;
            });

            // Check if this object is expanded
            const isExpanded = expandedObjects.has(obj.id);

            // Add the current object with its depth and expanded state
            flattened.push({
                ...obj,
                depth,
                hasChildren: children.length > 0,
                expanded: isExpanded,
                children: children.map((c) => c.id), // Update children array with actual child IDs
            });

            // If the object is expanded and has children, recursively add them
            if (isExpanded && children.length > 0) {
                flattened.push(
                    ...flattenObjectsHierarchy(children, allObjects, depth + 1)
                );
            }
        }

        return flattened;
    }

    $effect(() => {
        const allObjects = $sceneStore.getScene().objects;
        const rootObjects = allObjects.filter((obj: any) => !obj.parent);

        const hierarchicalObjects = flattenObjectsHierarchy(
            rootObjects,
            allObjects
        );

        filteredObjects = searchQuery.trim()
            ? hierarchicalObjects.filter((obj) =>
                  obj.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : hierarchicalObjects;
    });

    function getObjectIcon(obj: any) {
        switch (obj.type) {
            case "script":
                return FileCode;
            case "part":
                return Box;
            case "mesh":
                return FileImage;
            case "camera":
                return Camera;
            case "light":
                return Lightbulb;
            case "constraint":
                return Clipboard;
            case "storage":
                return Folder;
            case "uistorage":
                return Folder;
            case "playercontroller":
                return Navigation;
            default:
                return Box;
        }
    }

    function handleRightClick(
        event: MouseEvent,
        objectId: string | null = null
    ) {
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
        if (expandedObjects.has(objectId)) {
            expandedObjects.delete(objectId);
        } else {
            expandedObjects.add(objectId);
        }
        // Trigger reactivity
        expandedObjects = new Set(expandedObjects);
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
                if (objectId) {
                    handleCopyObject(objectId);
                }
                break;
            case "paste":
                handlePasteObject(objectId || -1);
                break;
            case "duplicate":
                if (objectId) {
                    handleDuplicateObject(objectId);
                }
                break;

            case "delete":
                if (objectId) {
                    handleDeleteObject(objectId);
                }
                break;
            case "goto":
                if (objectId) {
                    dispatch("gotoObject", { id: objectId });
                }
                break;
        }
    }

    function handleCopyObject(objectId: string) {
        const allObjects = $sceneStore.getScene().objects;
        const objectToCopy = allObjects.find((obj: any) => obj.id === objectId);
        if (
            objectToCopy &&
            (objectToCopy.type === "storage" ||
                objectToCopy.type === "uistorage")
        )
            return; // cannot copy storage
        if (objectToCopy) {
            // Use the proper clone method instead of structuredClone
            copiedObject = objectToCopy.clone();
            dispatch("copyObject", { id: objectId });
        }
    }

    function handlePasteObject(parentId: string | number) {
        if (copiedObject) {
            if (parentId !== -1) {
                const targetParent = $sceneStore
                    .getScene()
                    .objects.find((o: any) => o.id === parentId);
                if (
                    targetParent &&
                    (targetParent.type === "storage" ||
                        targetParent.type === "uistorage")
                )
                    return; // cannot paste into storage
            }
            dispatch("pasteObject", {
                copiedObject: copiedObject,
                parentId,
            });
        }
    }

    function handleDuplicateObject(objectId: string) {
        const allObjects = $sceneStore.getScene().objects;
        const objectToDuplicate = allObjects.find(
            (obj: any) => obj.id === objectId
        );
        if (
            objectToDuplicate &&
            (objectToDuplicate.type === "storage" ||
                objectToDuplicate.type === "uistorage")
        )
            return; // cannot duplicate storage
        if (objectToDuplicate) {
            // Use the proper clone method instead of structuredClone
            dispatch("duplicateObject", {
                originalId: objectId,
                duplicatedObject: objectToDuplicate,
            });
        }
    }

    function handleDeleteObject(objectId: string) {
        const allObjects = $sceneStore.getScene().objects;
        const objectToDelete = allObjects.find((o: any) => o.id === objectId);
        if (
            objectToDelete &&
            (objectToDelete.type === "storage" ||
                objectToDelete.type === "uistorage")
        )
            return; // cannot delete storage
        dispatch("deleteObject", { id: objectId });
    }

    function handleToggleVisibility(event: MouseEvent, objectId: string) {
        event.stopPropagation();
        dispatch("toggleVisibility", { id: objectId });
    }

    function handleToggleLock(event: MouseEvent, objectId: string) {
        event.stopPropagation();
        dispatch("toggleLock", { id: objectId });
    }

    function handleDragStart(event: DragEvent, objectId: string) {
        if (!event.dataTransfer) return;
        // Disallow dragging storage objects
        const allObjects = $sceneStore.getScene().objects;
        const obj = allObjects.find((o: any) => o.id === objectId);
        if (obj && (obj.type === "storage" || obj.type === "uistorage")) {
            event.preventDefault();
            return;
        }
        draggedObject = objectId;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", objectId);

        // Add visual feedback
        if (event.target instanceof HTMLElement) {
            event.target.style.opacity = "0.5";
        }
    }

    function handleDragEnd(event: DragEvent) {
        draggedObject = null;
        dragOverObject = null;

        // Reset visual feedback
        if (event.target instanceof HTMLElement) {
            event.target.style.opacity = "";
        }
    }

    function handleDragOver(event: DragEvent, targetObjectId: string) {
        event.preventDefault();
        if (!draggedObject || draggedObject === targetObjectId) return;

        // Check if we're not trying to drag parent into its own child
        const draggedObj = filteredObjects.find(
            (obj) => obj.id === draggedObject
        );
        const targetObj = filteredObjects.find(
            (obj) => obj.id === targetObjectId
        );

        if (draggedObj && targetObj && isDescendant(targetObj, draggedObj)) {
            event.dataTransfer!.dropEffect = "none";
            return;
        }

        dragOverObject = targetObjectId;
        event.dataTransfer!.dropEffect = "move";
    }

    function handleDragLeave(event: DragEvent, targetObjectId: string) {
        // Only clear dragOverObject if we're actually leaving this element
        // and not just moving to a child element
        const rect = (
            event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;

        if (
            x < rect.left ||
            x > rect.right ||
            y < rect.top ||
            y > rect.bottom
        ) {
            if (dragOverObject === targetObjectId) {
                dragOverObject = null;
            }
        }
    }

    function handleDrop(event: DragEvent, targetObjectId: string) {
        event.preventDefault();

        if (!draggedObject || draggedObject === targetObjectId) return;

        // Check if we're not trying to drag parent into its own child
        const draggedObj = filteredObjects.find(
            (obj) => obj.id === draggedObject
        );
        const targetObj = filteredObjects.find(
            (obj) => obj.id === targetObjectId
        );

        if (draggedObj && targetObj && isDescendant(targetObj, draggedObj)) {
            return;
        }

        // Auto-expand the target parent
        expandedObjects.add(targetObjectId);
        expandedObjects = new Set(expandedObjects);

        dispatch("reparentObject", {
            objectId: draggedObject,
            newParentId: targetObjectId,
        });

        draggedObject = null;
        dragOverObject = null;
    }

    function isDescendant(potentialChild: any, potentialParent: any): boolean {
        let current = potentialChild;
        while (current && current.parent) {
            if (current.parent === potentialParent.id) {
                return true;
            }
            current = filteredObjects.find((obj) => obj.id === current.parent);
        }
        return false;
    }

    // Close context menu when clicking elsewhere
    function handleDocumentClick() {
        closeContextMenu();
    }

    function handleAddObjectType(type: string) {
        // Auto-expand the parent if it's not -1 (root)
        if (addDialogParentId !== -1 && addDialogParentId != null) {
            expandedObjects.add(addDialogParentId.toString());
            expandedObjects = new Set(expandedObjects);
        }

        dispatch("addObject", {
            type,
            parentId: addDialogParentId,
        });
        addDialogOpen = false;
        addDialogParentId = -1;
    }

    // Public method to open add dialog from parent component
    export function openAddDialog(parentId: string | number) {
        addDialogParentId = parentId;
        addDialogOpen = true;
    }
</script>

<svelte:document onclick={handleDocumentClick} />

<div
    class="h-full bg-card/60 backdrop-blur-sm border-r border-border/30 flex flex-col relative overflow-hidden"
>
    <!-- Subtle gradient accent -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/3 pointer-events-none"
    ></div>

    <!-- Header -->
    <div class="p-5 border-b border-border/30 relative z-10 space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-green-500/10 rounded-lg">
                    <FolderTree class="w-5 h-5 text-green-400" />
                </div>
                <h2 class="text-foreground font-semibold text-lg">
                    Object Explorer
                </h2>
            </div>

            <Popover.Root bind:open={addDialogOpen}>
                <Popover.Trigger
                    class="{buttonVariants({
                        variant: 'outline',
                    })} h-10 w-10 p-0 rounded-xl shadow-sm transition-all duration-200"
                    onclick={() => openAddDialog(-1)}
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
                                    class="rounded-lg m-1"
                                >
                                    <Box class="w-4 h-4 mr-2" />
                                    Part
                                </Command.Item>
                                <Command.Item
                                    value="script"
                                    onSelect={() =>
                                        handleAddObjectType("Script")}
                                    class="rounded-lg m-1"
                                >
                                    <FileCode class="w-4 h-4 mr-2" />
                                    Script
                                </Command.Item>
                                <Command.Item
                                    value="camera"
                                    onSelect={() =>
                                        handleAddObjectType("Camera")}
                                    class="rounded-lg m-1"
                                >
                                    <Camera class="w-4 h-4 mr-2" />
                                    Camera
                                </Command.Item>
                                <Command.Item
                                    value="light"
                                    onSelect={() =>
                                        handleAddObjectType("Light")}
                                    class="rounded-lg m-1"
                                >
                                    <Lightbulb class="w-4 h-4 mr-2" />
                                    Light
                                </Command.Item>
                                <Command.Item
                                    value="playercontroller"
                                    onSelect={() =>
                                        handleAddObjectType("PlayerController")}
                                    class="rounded-lg m-1"
                                >
                                    <Navigation class="w-4 h-4 mr-2" />
                                    Player Controller
                                </Command.Item>
                            </Command.Group>
                            <Command.Separator />
                            <Command.Group heading="Physics">
                                <Command.Item
                                    value="constraint"
                                    onSelect={() =>
                                        handleAddObjectType("Constraint")}
                                    class="rounded-lg m-1"
                                >
                                    <Clipboard class="w-4 h-4 mr-2" />
                                    Constraint
                                </Command.Item>
                            </Command.Group>
                            <Command.Separator />
                            <Command.Group heading="UI">
                                <Command.Item
                                    value="containerui"
                                    onSelect={() =>
                                        handleAddObjectType("ContainerUI")}
                                    class="rounded-lg m-1"
                                >
                                    <Box class="w-4 h-4 mr-2" />
                                    Container UI
                                </Command.Item>
                                <Command.Item
                                    value="textui"
                                    onSelect={() =>
                                        handleAddObjectType("TextUI")}
                                    class="rounded-lg m-1"
                                >
                                    <FileImage class="w-4 h-4 mr-2" />
                                    Text UI
                                </Command.Item>
                                <Command.Item
                                    value="buttonui"
                                    onSelect={() =>
                                        handleAddObjectType("ButtonUI")}
                                    class="rounded-lg m-1"
                                >
                                    <Box class="w-4 h-4 mr-2" />
                                    Button UI
                                </Command.Item>
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

    <!-- Object Tree -->
    <div
        class="flex-1 overflow-y-auto p-3 relative z-10"
        ondragover={(e) => {
            e.preventDefault();
            if (draggedObject && e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
            }
        }}
        ondrop={(e) => {
            e.preventDefault();
            if (draggedObject) {
                // Reparent to root (-1)
                dispatch("reparentObject", {
                    objectId: draggedObject,
                    newParentId: -1,
                });
                draggedObject = null;
                dragOverObject = null;
            }
        }}
        onclick={(e) => {
            // Unselect when clicking on empty space
            if (e.target === e.currentTarget) {
                selectedObject = -1;
                dispatch("selectObject", { id: -1 });
            }
        }}
        oncontextmenu={(e) => {
            // Right click on empty space shows paste option
            if (e.target === e.currentTarget) {
                handleRightClick(e, null);
            }
        }}
    >
        <div
            class="space-y-1"
            onclick={(e) => {
                // Unselect when clicking on empty space within the list
                if (e.target === e.currentTarget) {
                    selectedObject = -1;
                    dispatch("selectObject", { id: -1 });
                }
            }}
            oncontextmenu={(e) => {
                // Right click on empty space within the list shows paste option
                if (e.target === e.currentTarget) {
                    handleRightClick(e, null);
                }
            }}
        >
            {#each filteredObjects as obj (obj.id)}
                {@const Icon = getObjectIcon(obj)}
                {@const hasChildren = obj.hasChildren}
                <div
                    class="group relative flex items-center gap-2 px-2 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/60 cursor-pointer transition-all duration-200 {selectedObject ===
                    obj.id
                        ? 'bg-blue-500/15 text-blue-300 shadow-sm border border-blue-400/30'
                        : dragOverObject === obj.id
                          ? 'bg-green-500/20 border border-green-400/50'
                          : 'hover:shadow-sm'} min-h-[44px]"
                    style="margin-left: {obj.depth * 16}px"
                    onclick={() => handleObjectClick(obj.id)}
                    oncontextmenu={(e) => handleRightClick(e, obj.id)}
                    draggable={obj.type !== "storage" ||
                        obj.type !== "uistorage"}
                    ondragstart={(e) => handleDragStart(e, obj.id)}
                    ondragend={handleDragEnd}
                    ondragover={(e) => handleDragOver(e, obj.id)}
                    ondragleave={(e) => handleDragLeave(e, obj.id)}
                    ondrop={(e) => handleDrop(e, obj.id)}
                    role="button"
                    tabindex="0"
                >
                    <!-- Connection lines for depth visualization -->
                    {#if obj.depth > 0}
                        <div class="absolute left-0 top-0 bottom-0 flex">
                            {#each Array(obj.depth) as _}
                                <div class="w-4 flex justify-center">
                                    <div class="w-px bg-border/40 h-full"></div>
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
                                onclick={(e) => {
                                    e.stopPropagation();
                                    handleToggleExpanded(obj.id);
                                }}
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
                        {#if obj.type === "script"}
                            <Icon class="w-5 h-5 text-green-400" />
                        {:else if obj.type === "light"}
                            <Icon class="w-5 h-5 text-yellow-400" />
                        {:else if obj.type === "part"}
                            <Icon class="w-5 h-5 text-blue-400" />
                        {:else if obj.type === "mesh"}
                            <Icon class="w-5 h-5 text-cyan-400" />
                        {:else if obj.type === "camera"}
                            <Icon class="w-5 h-5 text-indigo-400" />
                        {:else if obj.type === "constraint"}
                            <Icon class="w-5 h-5 text-purple-400" />
                        {:else}
                            <Icon class="w-5 h-5 text-gray-400" />
                        {/if}
                    </div>

                    <!-- Name -->
                    <span class="flex-1 font-medium truncate text-base"
                        >{obj.name}</span
                    >

                    <!-- Controls -->
                    {#if obj.type !== "storage"}
                        <div
                            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                            <button
                                class="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 flex items-center justify-center {obj.visible ===
                                false
                                    ? 'text-orange-400 hover:text-orange-300'
                                    : ''}"
                                onclick={(e) =>
                                    handleToggleVisibility(e, obj.id)}
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
                                onclick={(e) => handleToggleLock(e, obj.id)}
                                title={obj.locked
                                    ? "Unlock object"
                                    : "Lock object"}
                            >
                                {#if obj.locked}
                                    <Lock class="w-4 h-4" />
                                {:else}
                                    <Unlock class="w-4 h-4" />
                                {/if}
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<!-- Context Menu -->
{#if contextMenu}
    <div
        class="fixed bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-xl p-2 z-50 min-w-48"
        style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
    >
        {#if contextMenu.objectId}
            {@const ctxObj = $sceneStore
                .getScene()
                .objects.find((o: any) => o.id === contextMenu.objectId)}
            {@const isStorage = ctxObj && ctxObj.type === "storage"}
            <!-- Object-specific context menu -->
            {#if !isStorage}
                <button
                    class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                    onclick={() => handleContextAction("copy")}
                >
                    <Copy class="w-4 h-4 text-blue-400" />
                    Copy
                </button>
            {/if}
            {#if copiedObject}
                <button
                    class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                    onclick={() => handleContextAction("paste")}
                >
                    <Clipboard class="w-4 h-4 text-orange-400" />
                    Paste as Child
                </button>
            {/if}
            {#if !isStorage}
                <button
                    class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                    onclick={() => handleContextAction("duplicate")}
                >
                    <FileImage class="w-4 h-4 text-green-400" />
                    Duplicate
                </button>
                <div class="h-px bg-border/30 my-2 mx-2"></div>
            {/if}
            <button
                class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                onclick={() => handleContextAction("goto")}
            >
                <Navigation class="w-4 h-4 text-purple-400" />
                Go to Object
            </button>
            {#if !isStorage}
                <div class="h-px bg-border/30 my-2 mx-2"></div>
                <button
                    class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                    onclick={() => handleContextAction("delete")}
                >
                    <Trash2 class="w-4 h-4" />
                    Delete
                </button>
            {/if}
        {:else}
            <!-- Empty space context menu -->
            {#if copiedObject}
                <button
                    class="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-3 transition-all duration-200 rounded-lg font-medium"
                    onclick={() => handleContextAction("paste")}
                >
                    <Clipboard class="w-4 h-4 text-orange-400" />
                    Paste
                </button>
            {:else}
                <div class="px-4 py-3 text-sm text-muted-foreground">
                    No items to paste
                </div>
            {/if}
        {/if}
    </div>
{/if}
