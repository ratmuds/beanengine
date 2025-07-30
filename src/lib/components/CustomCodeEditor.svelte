<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import { draggable } from "@neodrag/svelte";
    import Separator from "./ui/separator/separator.svelte";
    import CodeBlock from "$lib/components/CodeBlock.svelte";
    import { GripVertical, Edit3, Trash2 } from "lucide-svelte";
    import { generateAvailableBlocks } from "$lib/blockConfig.js";
    import { generateAvailableChips } from "$lib/chipConfig.js";

    let {
        items = $bindable([]),
        variables = $bindable([
            { id: "var1", name: "score", type: "number", value: 100 },
            { id: "var2", name: "playerName", type: "string", value: "Player" },
            { id: "var3", name: "isGameOver", type: "boolean", value: false },
        ]),
        compiledCode = $bindable([]),
    } = $props();

    // Available code block templates - generated from config
    let availableBlocks = $state(generateAvailableBlocks());
    // Available chip templates - generated from config
    let availableChips = $state(generateAvailableChips());

    const flipDurationMs = 300;
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

    // Function to extract parameters from block fields
    function extractParams(item) {
        const params = {};
        if (item.fields) {
            item.fields.forEach((field) => {
                // Get the basic field value from the item property
                let fieldValue = item[field.bind] || "";
                console.log(
                    "skib",
                    item,
                    field.bind,
                    fieldValue,
                    item[field.bind]
                );

                // If there are variable inputs, extract their values and combine with field value
                // TODO: there are a ton of things wrong here - have to do full rewrite
                if (field.inputs && field.inputs.length > 0) {
                    const inputValues = field.inputs.map((input) => {
                        if (input.type === "variable") {
                            return `$${input.name}`; // Prefix variables with $
                        } else if (input.value !== undefined) {
                            return input.value;
                        } else {
                            return input.name || input.id;
                        }
                    });

                    // Combine field value with input values
                    if (fieldValue && fieldValue !== "") {
                        // If both field value and variables exist, combine them
                        fieldValue = `${fieldValue} ${inputValues.join(" ")}`;
                    } else {
                        // If only variables exist, use just the variables
                        fieldValue = inputValues.join(" ");
                    }
                }
                // If no variable inputs, use the regular field value (text input)
                // fieldValue already contains item[field.bind] from above

                params[field.bind] = fieldValue;
            });
        }
        return params;
    }

    // Helper function to count nested chips in items
    function countNestedChips(items) {
        console.log(items);

        let count = 0;
        items.forEach((item) => {
            if (item.fields) {
                item.fields.forEach((field) => {
                    if (field.inputs && field.inputs.length > 0) {
                        count += field.inputs.length;
                        // Recursively count chips in nested chips
                        count += countNestedChips(
                            field.inputs.filter((input) => input.fields)
                        );
                    }
                });
            }
            if (item.children) {
                count += countNestedChips(item.children);
            }
        });
        return count;
    }

    // Function to recursively compile blocks to executable structure
    function compileBlocks(blocks = undefined) {
        if (!blocks) {
            blocks = items;
        }

        // Convert proxy to regular array if needed
        const blocksArray = Array.isArray(blocks) ? blocks : Array.from(blocks);

        if (blocksArray.length === 0) {
            return [];
        }

        const result = blocksArray.map((block) => {
            const compiled = {
                type: block.type,
                params: extractParams(block),
            };

            // Handle blocks with children (if, repeat, etc.)
            if (block.children && Array.isArray(block.children)) {
                compiled.children = compileBlocks(block.children);
            }

            return compiled;
        });

        return result;
    }

    // Effect to update compiled code when items change
    $effect(() => {
        // Remove all logging to stop infinite loop
        if (items && Array.isArray(items)) {
            compiledCode = compileBlocks();
        }
    });

    function handleDndConsider(e) {
        const beforeCount = countNestedChips(items);
        console.log(`🔄 DND CONSIDER - Before: ${beforeCount} chips`);
        items = e.detail.items;
        const afterCount = countNestedChips(items);
        console.log(`🔄 DND CONSIDER - After: ${afterCount} chips`);
        if (beforeCount !== afterCount) {
            console.warn(
                `❌ CHIP LOSS in handleDndConsider: ${beforeCount} -> ${afterCount}`
            );
        }
    }

    function handleDndFinalize(e) {
        const beforeCount = countNestedChips(items);
        console.log(`✅ DND FINALIZE - Before: ${beforeCount} chips`);
        items = e.detail.items;
        const afterCount = countNestedChips(items);
        console.log(`✅ DND FINALIZE - After: ${afterCount} chips`);
        if (beforeCount !== afterCount) {
            console.warn(
                `❌ CHIP LOSS in handleDndFinalize: ${beforeCount} -> ${afterCount}`
            );
        }
        // Check if item was dropped outside of valid zones
        if (e.detail.info && e.detail.info.trigger === "droppedOutside") {
            // Remove the item from the list
            items = items.filter((item) => item.id !== e.detail.info.id);
        }
    }

    function handleIfDndConsider(e, itemId) {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            item.children = e.detail.items;
            items = [...items];
        }
    }

    function handleIfDndFinalize(e, itemId) {
        const item = items.find((i) => i.id === itemId);
        if (item) {
            item.children = e.detail.items;
            items = [...items];
        }
    }

    function handleBlockPaletteDnd(e) {
        // Don't modify the palette - it's infinite
        if (e.detail.info && e.detail.info.trigger === "droppedIntoZone") {
            // Create a new item from the dragged block template
            const draggedBlock = e.detail.items.find(
                (item) => item.id === e.detail.info.id
            );
            if (draggedBlock) {
                const newItem = {
                    ...draggedBlock,
                    id: Date.now() + Math.random(), // Generate unique ID
                };
                items = [...items, newItem];
            }
        }
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

    // Available trigger templates for dragging
    let availableTriggers = $state([
        { id: "trigger1", type: "onStart", name: "On Start" },
        { id: "trigger2", type: "onUpdate", name: "On Update" },
        { id: "trigger3", type: "onKeyPress", name: "On Key Press" },
    ]);

    // Active triggers that have been dragged into the code list
    let activeTriggers = $state([]);

    function handleActiveTriggersDndConsider(e) {
        activeTriggers = e.detail.items;
    }

    function handleActiveTriggersDndFinalize(e) {
        activeTriggers = e.detail.items;
        // Check if trigger was dropped outside of valid zones
        if (e.detail.info && e.detail.info.trigger === "droppedOutside") {
            // Remove the trigger from the list
            activeTriggers = activeTriggers.filter(
                (trigger) => trigger.id !== e.detail.info.id
            );
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
        <div class="flex gap-6 p-6">
            <!-- Left Sidebar -->
            <div class="w-64 relative z-10 flex flex-col gap-4">
                <button
                    onclick={() => {
                        console.log("Manual compile triggered");
                        console.log("Items:", $state.snapshot(items));
                        const result = compileBlocks();
                        console.log("Manual compile result:", result);
                        console.log(
                            "Compiled code prop:",
                            $state.snapshot(compiledCode)
                        );
                    }}
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                    Debug Compile
                </button>

                <!-- Code Blocks Palette -->
                <div
                    class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg flex-1"
                >
                    <div
                        class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
                    >
                        <span class="text-[#ccc] text-sm font-medium"
                            >Code Blocks</span
                        >
                    </div>
                    <div
                        class="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto"
                    >
                        {#each availableBlocks as block (block.id)}
                            <div
                                class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded text-sm font-medium cursor-grab hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                                draggable="true"
                                ondragstart={(e) => {
                                    e.dataTransfer.setData(
                                        "text/plain",
                                        JSON.stringify(block)
                                    );
                                }}
                            >
                                {block.type}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Triggers Palette -->
                <div
                    class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg"
                >
                    <div
                        class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
                    >
                        <span class="text-[#ccc] text-sm font-medium"
                            >Triggers</span
                        >
                    </div>
                    <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
                        {#each availableTriggers as trigger (trigger.id)}
                            <div
                                class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-2 rounded text-sm font-medium cursor-grab hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-sm"
                                draggable="true"
                                ondragstart={(e) => {
                                    e.dataTransfer.setData(
                                        "text/plain",
                                        JSON.stringify(trigger)
                                    );
                                }}
                            >
                                {trigger.name}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Chips Panel -->
                <div
                    class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg h-32"
                >
                    <div
                        class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
                    >
                        <span class="text-[#ccc] text-xs font-medium"
                            >Chips</span
                        >
                    </div>
                    <div class="p-2 space-y-1 h-20 overflow-y-auto">
                        {#each availableChips as chip (chip.id)}
                            <div
                                class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm inline-block mr-1"
                                draggable="true"
                                ondragstart={(e) => {
                                    e.dataTransfer.setData(
                                        "application/json",
                                        JSON.stringify(chip)
                                    );
                                    e.dataTransfer.effectAllowed = "copy";
                                }}
                            >
                                {chip.type}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

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

                <!-- Active Triggers Drop Zone -->
                <div class="p-3">
                    <div class="text-[#ccc] text-sm font-medium mb-2">
                        Active Triggers
                    </div>
                    <div
                        class="min-h-12 p-2 border border-[#2e2e2e] rounded bg-[#252525]/30"
                        use:dndzone={{
                            items: activeTriggers,
                            flipDurationMs,
                            dropTargetStyle: {
                                outline: "2px solid #eab308",
                                "outline-offset": "2px",
                                "background-color": "rgba(234, 179, 8, 0.1)",
                                "border-radius": "4px",
                            },
                            morphDisabled: true,
                            dropFromOthersDisabled: true,
                        }}
                        onconsider={handleActiveTriggersDndConsider}
                        onfinalize={handleActiveTriggersDndFinalize}
                        ondrop={(e) => {
                            e.preventDefault();
                            const data = e.dataTransfer.getData("text/plain");
                            if (data) {
                                try {
                                    const trigger = JSON.parse(data);
                                    // Check if it's a trigger (not a code block)
                                    if (
                                        trigger.type &&
                                        trigger.type.startsWith("on")
                                    ) {
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
                        ondragover={(e) => e.preventDefault()}
                    >
                        {#if activeTriggers.length === 0}
                            <div class="text-[#666] text-xs text-center py-2">
                                Drop triggers here to activate the code below
                            </div>
                        {:else}
                            <div class="flex flex-wrap gap-1">
                                {#each activeTriggers as trigger (trigger.id)}
                                    <div
                                        animate:flip={{
                                            duration: flipDurationMs,
                                        }}
                                    >
                                        <div
                                            class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 py-1 rounded text-xs font-medium shadow-sm"
                                        >
                                            {trigger.name}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                <Separator class="my-2" />

                <div
                    class="p-3 h-[calc(100vh-220px)] overflow-y-auto"
                    use:dndzone={{
                        items: items,
                        flipDurationMs,
                        dropTargetStyle: {
                            outline: "1px solid #3b82f6",
                            "outline-offset": "1px",
                            "background-color": "rgba(59, 130, 246, 0.08)",
                            "border-radius": "4px",
                            "transition-duration": "1s",
                        },
                        morphDisabled: true,
                    }}
                    onconsider={handleDndConsider}
                    onfinalize={handleDndFinalize}
                    ondrop={(e) => {
                        e.preventDefault();
                        const data = e.dataTransfer.getData("text/plain");
                        if (data) {
                            try {
                                const block = JSON.parse(data);
                                const newItem = {
                                    ...block,
                                    id: Date.now() + Math.random(),
                                };
                                items = [...items, newItem];
                            } catch (err) {
                                console.error(
                                    "Failed to parse dropped data:",
                                    err
                                );
                            }
                        }
                    }}
                    ondragover={(e) => e.preventDefault()}
                >
                    {#each items as item, i (item.id)}
                        <div animate:flip={{ duration: flipDurationMs }}>
                            <CodeBlock
                                {item}
                                onIfDndConsider={handleIfDndConsider}
                                onIfDndFinalize={handleIfDndFinalize}
                                onUpdate={(updatedItem) => {
                                    const beforeCount = countNestedChips(items);
                                    console.log(
                                        `🔄 BLOCK UPDATE - Before: ${beforeCount} chips`
                                    );
                                    const mainIndex = items.findIndex(
                                        (i) => i.id === updatedItem.id
                                    );
                                    if (mainIndex !== -1) {
                                        items[mainIndex] = updatedItem;
                                        items = [...items];
                                        const afterCount =
                                            countNestedChips(items);
                                        console.log(
                                            `🔄 BLOCK UPDATE - After: ${afterCount} chips`
                                        );
                                        if (beforeCount !== afterCount) {
                                            console.warn(
                                                `❌ CHIP LOSS in onUpdate: ${beforeCount} -> ${afterCount}`
                                            );
                                        }
                                    }
                                }}
                            />
                        </div>
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
