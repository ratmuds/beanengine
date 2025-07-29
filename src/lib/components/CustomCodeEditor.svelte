<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import { draggable } from "@neodrag/svelte";
    import CodeBlock from "$lib/components/CodeBlock.svelte";
    import { GripVertical, Edit3, Trash2 } from "lucide-svelte";

    let {
        items = $bindable([
            {
                id: 1,
                type: "say",
                text: "",
                duration: "",
                fields: [
                    { bind: "text", inputs: [] },
                    { bind: "duration", inputs: [] },
                ],
            },
            {
                id: 2,
                type: "if",
                condition: "",
                children: [],
                fields: [{ bind: "condition", inputs: [] }],
            },
        ]),
        variables = $bindable([
            { id: "var1", name: "score", type: "number", value: 100 },
            { id: "var2", name: "playerName", type: "string", value: "Player" },
            { id: "var3", name: "isGameOver", type: "boolean", value: false },
        ]),
        compiledCode = $bindable([]),
    } = $props();

    // Available code block templates
    let availableBlocks = $state([
        {
            id: "say",
            type: "say",
            text: "",
            duration: "",
            fields: [
                { bind: "text", inputs: [] },
                { bind: "duration", inputs: [] },
            ],
        },
        {
            id: "if",
            type: "if",
            condition: "",
            children: [],
            fields: [{ bind: "condition", inputs: [] }],
        },
        {
            id: "move",
            type: "move",
            direction: "",
            speed: "",
            fields: [
                { bind: "direction", inputs: [] },
                { bind: "speed", inputs: [] },
            ],
        },
        {
            id: "wait",
            type: "wait",
            duration: "",
            fields: [{ bind: "duration", inputs: [] }],
        },
        {
            id: "repeat",
            type: "repeat",
            times: "",
            children: [],
            fields: [{ bind: "times", inputs: [] }],
        },
    ]);

    const flipDurationMs = 300;
    let codeListTitle = $state("Code List");
    let isEditingTitle = $state(false);

    // Temporary/Visual state for drag operations
    let tempVariables = $state([]);
    let tempItems = $state([]);
    let isDragging = $state(false);

    // Derived states for rendering - use temp state during drag, main state otherwise
    let displayVariables = $derived(isDragging ? tempVariables : variables);
    let displayItems = $derived(isDragging ? tempItems : items);

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
        if (!isDragging) {
            isDragging = true;
            tempVariables = [...variables];
            tempItems = [...items];
        }
        tempItems = e.detail.items;
    }

    function handleDndFinalize(e) {
        items = e.detail.items;
        // Check if item was dropped outside of valid zones
        if (e.detail.info && e.detail.info.trigger === "droppedOutside") {
            // Remove the item from the list
            items = items.filter((item) => item.id !== e.detail.info.id);
        }
        isDragging = false;
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

    function handleVariableDndConsider(e) {
        if (!isDragging) {
            // On first consider event, copy current state to temp state
            isDragging = true;
            tempVariables = [...variables];
            tempItems = [...items];
        }
        // Only update the temporary state
        tempVariables = e.detail.items;
    }

    function handleVariableDndFinalize(e) {
        // Commit the final state to the main variables
        variables = e.detail.items;
        
        // Check if variable was dropped outside of valid zones
        if (e.detail.info && e.detail.info.trigger === "droppedOutside") {
            // Remove the variable from the list
            variables = variables.filter(
                (variable) => variable.id !== e.detail.info.id
            );
        }
        
        // Reset the dragging flag
        isDragging = false;
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
</script>

<div
    class="h-full bg-[#181818] font-mono relative overflow-hidden flex gap-6 p-6"
>
    <!-- Grid background -->
    <div
        class="absolute inset-0"
        style="background-image: radial-gradient(circle, #444 1.5px, transparent 1.5px); background-size: 40px 40px; opacity: 0.4;"
    ></div>

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
                <span class="text-[#ccc] text-sm font-medium">Code Blocks</span>
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

        <!-- Variables Panel -->
        <div
            class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg h-32"
        >
            <div
                class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
            >
                <span class="text-[#ccc] text-xs font-medium">Variables</span>
            </div>
            <div
                class="p-2 space-y-1 h-20 overflow-y-auto"
                use:dndzone={{
                    items: displayVariables,
                    flipDurationMs: 0,
                    dragDisabled: false,
                    dropFromOthersDisabled: true,
                    type: "variable",
                    morphDisabled: true,
                }}
                onconsider={handleVariableDndConsider}
                onfinalize={handleVariableDndFinalize}
            >
                {#each displayVariables as variable (variable.id)}
                    <div
                        class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm inline-block mr-1"
                    >
                        {variable.name}
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

        <div
            class="p-3 min-h-[200px]"
            use:dndzone={{
                items: displayItems,
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
                        console.error("Failed to parse dropped data:", err);
                    }
                }
            }}
            ondragover={(e) => e.preventDefault()}
        >
            {#each displayItems as item, i (item.id)}
                <div animate:flip={{ duration: flipDurationMs }}>
                    <CodeBlock
                        item={item}
                        onIfDndConsider={handleIfDndConsider}
                        onIfDndFinalize={handleIfDndFinalize}
                        onUpdate={(updatedItem) => {
                            // Update both main items and display items
                            const mainIndex = items.findIndex(
                                (i) => i.id === updatedItem.id
                            );
                            if (mainIndex !== -1) {
                                items[mainIndex] = { ...updatedItem };
                                items = [...items];
                            }
                            
                            if (isDragging) {
                                const displayIndex = displayItems.findIndex(
                                    (i) => i.id === updatedItem.id
                                );
                                if (displayIndex !== -1) {
                                    tempItems[displayIndex] = { ...updatedItem };
                                    tempItems = [...tempItems];
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
