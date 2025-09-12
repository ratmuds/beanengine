<script lang="ts">
    import { draggable } from "@neodrag/svelte";
    import { dndzone, dragHandleZone } from "svelte-dnd-action";
    import Separator from "./ui/separator/separator.svelte";
    import CodeBlock from "$lib/components/CodeBlock.svelte";
    import { GripVertical, Edit3 } from "lucide-svelte";

    import { compileScript } from "$lib/compiler.js";

    let {
        items = $bindable([]),
        variables = $bindable([
            { id: "var1", name: "score", type: "number", value: 100 },
            { id: "var2", name: "playerName", type: "string", value: "Player" },
            { id: "var3", name: "isGameOver", type: "boolean", value: false },
        ]),
        compiledCode = $bindable([]),
        selectedScript = $bindable(null),
    } = $props();

    let codeListTitle = $state("Code List");
    let isEditingTitle = $state(false);

    // Camera state for panning and zooming
    let camera = $state({
        x: 0,
        y: 0,
        zoom: 1,
    });
    let isDragging = $state(false);
    let lastMousePos = $state({ x: 0, y: 0 });

    // Effect to load script data when selectedScript changes
    $effect(() => {
        if (selectedScript && selectedScript.code) {
            items = Array.isArray(selectedScript.code)
                ? selectedScript.code
                : [];
        } else if (selectedScript) {
            items = [];
        }
    });

    // Effect to update compiled code when items change
    $effect(() => {
        // Remove all logging to stop infinite loop
        if (items && Array.isArray(items)) {
            compiledCode = compileScript(items);
        }
    });

    // Effect to save changes back to selectedScript
    $effect(() => {
        if (selectedScript && items) {
            selectedScript.code = items;
        }
    });

    // DND functions for code blocks using svelte-dnd-action
    function handleDndConsider(e) {
        items = e.detail.items;
    }

    function handleDndFinalize(e) {
        items = e.detail.items;
    }

    // DND functions for nested children in code blocks
    function handleChildDndConsider(e, itemId) {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            item.children = e.detail.items;
            items = [...items];
        }
    }

    function handleChildDndFinalize(e, itemId) {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            item.children = e.detail.items;
            items = [...items];
        }
    }

    // Keep HTML drag for triggers since they need different behavior
    let draggedItem = null;
    let dragSource = null;
    let validDropOccurred = false;

    function handleDragStart(e, item, index, source = "items") {
        draggedItem = { item, index, source };
        dragSource = source;
        validDropOccurred = false;
        e.dataTransfer!.effectAllowed = "move";
        e.dataTransfer!.setData("text/plain", JSON.stringify(item));
        e.dataTransfer!.setData("application/x-source", source);
        e.dataTransfer!.setData("application/x-index", index.toString());
    }

    function handleDragEnd(e) {
        // Clean up any item that was dragged but not dropped in a valid zone
        if (draggedItem && !validDropOccurred) {
            if (draggedItem.source === "triggers") {
                // Remove from triggers array
                activeTriggers = activeTriggers.filter(
                    (_, i) => i !== draggedItem.index
                );
            }
        }
        draggedItem = null;
        dragSource = null;
        validDropOccurred = false;
        triggerDragOverIndex = -1;
    }

    function startEditingTitle() {
        isEditingTitle = true;
    }

    function finishEditingTitle(event) {
        if (event.key === "Enter" || event.type === "blur") {
            isEditingTitle = false;
        }
    }

    // Camera control functions
    function handleMouseDown(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            // Middle mouse or Ctrl+left click
            isDragging = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    }

    function handleMouseMove(e) {
        if (isDragging) {
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;

            camera.x += deltaX;
            camera.y += deltaY;

            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    }

    function handleMouseUp(e) {
        if (e.button === 1 || e.button === 0) {
            isDragging = false;
        }
    }

    function handleWheel(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            const zoomFactor = 0.1;
            const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
            const newZoom = Math.max(0.25, Math.min(3, camera.zoom + delta));

            // Zoom towards mouse position
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomRatio = newZoom / camera.zoom;
            camera.x = mouseX - (mouseX - camera.x) * zoomRatio;
            camera.y = mouseY - (mouseY - camera.y) * zoomRatio;
            camera.zoom = newZoom;
        }
    }

    // Active triggers that have been dragged into the code list
    let activeTriggers = $state([]);

    let triggerDragOverIndex = -1;

    function handleTriggerDragOver(e, index) {
        e.preventDefault();
        triggerDragOverIndex = index;
    }

    function handleTriggerDragLeave(e) {
        triggerDragOverIndex = -1;
    }

    function handleTriggerDrop(e, dropIndex) {
        e.preventDefault();
        triggerDragOverIndex = -1;
        validDropOccurred = true;

        const source = e.dataTransfer.getData("application/x-source");
        const originalIndex = parseInt(
            e.dataTransfer.getData("application/x-index")
        );

        if (source === "triggers" && originalIndex !== dropIndex) {
            const newTriggers = [...activeTriggers];
            const [removed] = newTriggers.splice(originalIndex, 1);
            newTriggers.splice(dropIndex, 0, removed);
            activeTriggers = newTriggers;
        }
    }
</script>

<div
    class="h-full bg-[#181818] font-mono relative overflow-hidden"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onwheel={handleWheel}
    style="cursor: {isDragging ? 'grabbing' : 'grab'}"
>
    <!-- Grid background -->
    <div
        class="absolute inset-0"
        style="background-image: radial-gradient(circle, #444 1.5px, transparent 1.5px); background-size: {40 *
            camera.zoom}px {40 *
            camera.zoom}px; opacity: 0.4; transform: translate({camera.x}px, {camera.y}px);"
    ></div>

    <!-- Viewport container with camera transform -->
    <div
        class="absolute inset-0"
        style="transform: translate({camera.x}px, {camera.y}px) scale({camera.zoom}); transform-origin: 0 0;"
    >
        <div class="flex justify-center p-6">
            <!-- Code List Panel -->
            <div
                class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg min-w-96 w-fit relative z-10"
                use:draggable={{ handle: ".drag-handle", grid: [40, 40] }}
            >
                <div
                    class="drag-handle bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 cursor-grab active:cursor-grabbing flex items-center gap-2 rounded-t-md"
                >
                    <GripVertical class="w-4 h-4 text-[#666]" />
                    {#if isEditingTitle}
                        <input
                            type="text"
                            bind:value={codeListTitle}
                            class="bg-transparent text-[#ccc] text-sm font-medium outline-none border-none"
                            onkeydown={finishEditingTitle}
                            onblur={finishEditingTitle}
                            autofocus
                        />
                    {:else}
                        <span
                            class="text-[#ccc] text-sm font-medium cursor-pointer hover:text-white transition-colors"
                            onclick={startEditingTitle}
                        >
                            {codeListTitle}
                        </span>
                        <Edit3
                            class="w-3 h-3 text-[#666] hover:text-[#ccc] cursor-pointer"
                            onclick={startEditingTitle}
                        />
                    {/if}
                </div>

                <!-- Triggers Drop Zone -->
                <div class="p-3">
                    <div class="text-[#ccc] text-sm font-medium mb-2">
                        Triggers
                    </div>
                    <div
                        class="min-h-12 p-2 border border-[#2e2e2e] rounded bg-[#252525]/30 {triggerDragOverIndex >=
                        0
                            ? 'outline-2 outline-yellow-500 bg-yellow-500/10'
                            : ''}"
                        ondrop={(e) => {
                            e.preventDefault();
                            triggerDragOverIndex = -1;
                            validDropOccurred = true;
                            const data = e.dataTransfer.getData("text/plain");
                            const source = e.dataTransfer.getData(
                                "application/x-source"
                            );

                            if (data) {
                                try {
                                    const trigger = JSON.parse(data);
                                    if (
                                        trigger.type &&
                                        trigger.type.startsWith("on") &&
                                        !source
                                    ) {
                                        // Only create new trigger if it's from palette (no source)
                                        const newTrigger = {
                                            ...trigger,
                                            id: Date.now() + Math.random(),
                                        };
                                        activeTriggers = [
                                            ...activeTriggers,
                                            newTrigger,
                                        ];
                                    }
                                } catch (err) {
                                    console.error(
                                        "Failed to parse dropped data:",
                                        err
                                    );
                                }
                            }
                        }}
                        ondragover={(e) => {
                            e.preventDefault();
                            triggerDragOverIndex = 0;
                        }}
                        ondragleave={(e) => {
                            triggerDragOverIndex = -1;
                        }}
                    >
                        {#if activeTriggers.length === 0}
                            <div class="text-[#666] text-xs text-center py-2">
                                Drop triggers here to activate the code below
                            </div>
                        {:else}
                            <div class="flex flex-wrap gap-1">
                                {#each activeTriggers as trigger, i (trigger.id)}
                                    <div
                                        class="w-full border-l-6 border-yellow-500 bg-muted text-white p-3 rounded text-sm font-semibold shadow-sm cursor-move"
                                        draggable="true"
                                        ondragstart={(e) =>
                                            handleDragStart(
                                                e,
                                                trigger,
                                                i,
                                                "triggers"
                                            )}
                                        ondragover={(e) =>
                                            handleTriggerDragOver(e, i)}
                                        ondragleave={handleTriggerDragLeave}
                                        ondrop={(e) => handleTriggerDrop(e, i)}
                                        ondragend={handleDragEnd}
                                    >
                                        {trigger.name}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <Separator class="my-2" />

                <div
                    class="p-3 h-[calc(100vh-220px)] overflow-y-auto"
                    use:dragHandleZone={{
                        items: items,
                        flipDurationMs: 300,
                        dropTargetStyle: {
                            outline: "2px solid #3b82f6",
                            "outline-offset": "2px",
                            "border-radius": "8px",
                        },
                        dragDisabled: false,
                        morphDisabled: true,
                        dropFromOthersDisabled: false,
                    }}
                    onconsider={handleDndConsider}
                    onfinalize={handleDndFinalize}
                    ondrop={(e) => {
                        e.preventDefault();
                        validDropOccurred = true;
                        const data = e.dataTransfer.getData("text/plain");
                        const jsonData =
                            e.dataTransfer.getData("application/json");
                        const source = e.dataTransfer.getData(
                            "application/x-source"
                        );

                        // Handle chips (application/json)
                        if (jsonData) {
                            try {
                                const chip = JSON.parse(jsonData);
                                // Create a new chip item for any chip type
                                const newChip = {
                                    ...chip,
                                    id: Date.now() + Math.random(),
                                };
                                items = [...items, newChip];
                            } catch (err) {
                                console.error(
                                    "Failed to parse dropped JSON data:",
                                    err
                                );
                            }
                        }
                        // Handle blocks (text/plain)
                        else if (data) {
                            try {
                                const block = JSON.parse(data);
                                if (!block.type?.startsWith("on") && !source) {
                                    // Only create new item if it's from palette (no source)
                                    const newItem = {
                                        ...block,
                                        id: Date.now() + Math.random(),
                                    };
                                    items = [...items, newItem];
                                }
                            } catch (err) {
                                console.error(
                                    "Failed to parse dropped data:",
                                    err
                                );
                            }
                        }
                    }}
                    ondragover={(e) => {
                        e.preventDefault();
                    }}
                >
                    {#each items as item (item.id)}
                        <CodeBlock
                            {item}
                            onChildDndConsider={handleChildDndConsider}
                            onChildDndFinalize={handleChildDndFinalize}
                            onUpdate={(updatedItem) => {
                                const mainIndex = items.findIndex(
                                    (i) => i.id === updatedItem.id
                                );
                                if (mainIndex !== -1) {
                                    items[mainIndex] = updatedItem;
                                }
                            }}
                        />
                    {/each}
                </div>
            </div>

            <!-- Delete Zone (invisible overlay) -->
            <div
                class="fixed inset-0 pointer-events-none z-0"
                ondragover={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("bg-red-500/10");
                }}
                ondragleave={(e) => {
                    e.currentTarget.classList.remove("bg-red-500/10");
                }}
                ondrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("bg-red-500/10");
                    // Items dropped here will be deleted (handled by individual dnd zones)
                }}
            ></div>
        </div>
    </div>
</div>
