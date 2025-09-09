<script lang="ts">
    import { draggable } from "@neodrag/svelte";
    import { dndzone, dragHandleZone, type DndEvent } from "svelte-dnd-action";
    import Separator from "./ui/separator/separator.svelte";
    import CodeBlock from "$lib/components/CodeBlock.svelte";
    import { GripVertical, Edit3, Trash2, Plus, X } from "lucide-svelte";
    import { generateAvailableBlocks } from "$lib/blockConfig.js";
    import { generateAvailableChips, generateChip } from "$lib/chipConfig.js";
    import { compileScript } from "$lib/compiler.js";
    import * as Dialog from "./ui/dialog";
    import Button from "./ui/button/button.svelte";
    import Input from "./ui/input/input.svelte";
    import * as ContextMenu from "./ui/context-menu";
    import { sceneStore } from "$lib/sceneStore.js";

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

    // Available code block templates - generated from config
    let availableBlocks = $state(generateAvailableBlocks());
    // Available chip templates - generated from config
    let availableChips = $state(generateAvailableChips());

    let codeListTitle = $state("Code List");
    let isEditingTitle = $state(false);

    // Variable creation modal state
    let isAddingVariable = $state(false);
    let newVariableName = $state("");
    let newVariableType = $state("string");
    let newVariableValue = $state("");

    // Variable editing modal state
    let isEditingVariable = $state(false);
    let editingVariable = $state(null);

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
    function handleDndConsider(e: CustomEvent<DndEvent<any>>) {
        items = e.detail.items;
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<any>>) {
        items = e.detail.items;
    }

    // Keep HTML drag for triggers since they need different behavior
    let draggedItem: any = null;
    let dragSource: string | null = null;
    let validDropOccurred = false;

    function handleDragStart(
        e: DragEvent,
        item: any,
        index: number,
        source = "items"
    ) {
        draggedItem = { item, index, source };
        dragSource = source;
        validDropOccurred = false;
        e.dataTransfer!.effectAllowed = "move";
        e.dataTransfer!.setData("text/plain", JSON.stringify(item));
        e.dataTransfer!.setData("application/x-source", source);
        e.dataTransfer!.setData("application/x-index", index.toString());
    }

    function handleDragEnd(e: DragEvent) {
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

    // Available trigger templates for dragging
    let availableTriggers = $state([
        { id: "trigger1", type: "onStart", name: "On Start" },
        { id: "trigger2", type: "onUpdate", name: "On Update" },
        { id: "trigger3", type: "onKeyPress", name: "On Key Press" },
    ]);

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

    function openAddVariableModal() {
        isAddingVariable = true;
        newVariableName = "";
        newVariableType = "string";
        newVariableValue = "";
    }

    function closeAddVariableModal() {
        isAddingVariable = false;
        newVariableName = "";
        newVariableType = "string";
        newVariableValue = "";
    }

    function addVariable() {
        if (!newVariableName.trim()) return;

        let parsedValue = newVariableValue;

        // Parse value based on type
        if (newVariableType === "number") {
            parsedValue = parseFloat(newVariableValue) || 0;
        } else if (newVariableType === "boolean") {
            parsedValue = newVariableValue.toLowerCase() === "true";
        }

        // Add to sceneStore immediately
        sceneStore.updateVariable(newVariableName, parsedValue);

        closeAddVariableModal();
    }

    function removeVariable(variableName) {
        const currentVariables = $sceneStore.variables;
        const filteredVariables = currentVariables.filter(
            (v) => v.name !== variableName
        );
        sceneStore.setVariables(filteredVariables);
    }

    function editVariable(variable) {
        editingVariable = { ...variable };
        newVariableName = editingVariable.name;
        newVariableType = editingVariable.type;
        newVariableValue = editingVariable.value.toString();
        isEditingVariable = true;
    }

    function deleteVariable(variable) {
        removeVariable(variable.name);
    }

    function closeEditVariableModal() {
        isEditingVariable = false;
        editingVariable = null;
        newVariableName = "";
        newVariableType = "string";
        newVariableValue = "";
    }

    function saveEditedVariable() {
        if (!newVariableName.trim() || !editingVariable) return;

        let parsedValue = newVariableValue;

        // Parse value based on type
        if (newVariableType === "number") {
            parsedValue = parseFloat(newVariableValue) || 0;
        } else if (newVariableType === "boolean") {
            parsedValue = newVariableValue.toLowerCase() === "true";
        }

        // Remove old variable if name changed
        if (editingVariable.name !== newVariableName) {
            removeVariable(editingVariable.name);
        }

        // Update/add variable
        sceneStore.updateVariable(newVariableName, parsedValue);

        closeEditVariableModal();
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
                        const result = compileScript(items);
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

                <!-- Variables Panel -->
                <div
                    class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg"
                >
                    <div
                        class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
                    >
                        <span class="text-[#ccc] text-xs font-medium"
                            >Variables</span
                        >
                    </div>
                    <div class="p-2 space-y-1 max-h-32 overflow-y-auto">
                        {#each $sceneStore.variables as variable (variable.name)}
                            <ContextMenu.Root>
                                <ContextMenu.Trigger>
                                    <div
                                        class="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm inline-block mr-1 cursor-grab hover:from-green-600 hover:to-green-700 transition-all"
                                        draggable="true"
                                        ondragstart={(e) => {
                                            // Generate a variable chip with the variable name pre-filled
                                            const variableChip = generateChip(
                                                "variable",
                                                {
                                                    name: variable.name,
                                                }
                                            );
                                            e.dataTransfer.setData(
                                                "application/json",
                                                JSON.stringify(variableChip)
                                            );
                                            e.dataTransfer.effectAllowed =
                                                "copy";
                                        }}
                                    >
                                        {variable.name}
                                    </div>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Item
                                        onclick={() => editVariable(variable)}
                                    >
                                        Edit Variable
                                    </ContextMenu.Item>
                                    <ContextMenu.Item
                                        onclick={() => deleteVariable(variable)}
                                        class="text-red-600"
                                    >
                                        Delete Variable
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        {/each}
                        <!-- Add Variable Button -->
                        <button
                            onclick={openAddVariableModal}
                            class="border border-dashed border-green-500 text-green-500 px-2 py-1 rounded-full text-xs font-medium hover:bg-green-500/10 transition-colors inline-block mr-1"
                        >
                            <Plus class="w-3 h-3 inline mr-1" />
                            Add Variable
                        </button>
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
                                        class="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 py-1 rounded text-xs font-medium shadow-sm cursor-move"
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
                        dragHandleSelector: ".dnd-drag-handle",
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

                        // Handle variable chips (application/json)
                        if (jsonData) {
                            try {
                                const chip = JSON.parse(jsonData);
                                if (chip.type === "variable") {
                                    // Create a new variable chip
                                    const newChip = {
                                        ...chip,
                                        id: Date.now() + Math.random(),
                                    };
                                    items = [...items, newChip];
                                }
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

    <!-- Add Variable Modal -->
    <Dialog.Root bind:open={isAddingVariable}>
        <Dialog.Content class="max-w-md">
            <Dialog.Header>
                <Dialog.Title>Add New Variable</Dialog.Title>
                <Dialog.Description>
                    Create a new global variable for your scripts.
                </Dialog.Description>
            </Dialog.Header>

            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <label for="variableName" class="text-sm font-medium"
                        >Name</label
                    >
                    <Input
                        id="variableName"
                        bind:value={newVariableName}
                        placeholder="Enter variable name"
                        class="w-full"
                    />
                </div>

                <div class="space-y-2">
                    <label for="variableType" class="text-sm font-medium"
                        >Type</label
                    >
                    <select
                        id="variableType"
                        bind:value={newVariableType}
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                    </select>
                </div>

                <div class="space-y-2">
                    <label for="variableValue" class="text-sm font-medium"
                        >Initial Value</label
                    >
                    {#if newVariableType === "boolean"}
                        <select
                            id="variableValue"
                            bind:value={newVariableValue}
                            class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                        >
                            <option value="false">false</option>
                            <option value="true">true</option>
                        </select>
                    {:else}
                        <Input
                            id="variableValue"
                            bind:value={newVariableValue}
                            placeholder={newVariableType === "number"
                                ? "Enter number"
                                : "Enter text"}
                            type={newVariableType === "number"
                                ? "number"
                                : "text"}
                            class="w-full"
                        />
                    {/if}
                </div>
            </div>

            <Dialog.Footer>
                <Button variant="outline" onclick={closeAddVariableModal}
                    >Cancel</Button
                >
                <Button onclick={addVariable} disabled={!newVariableName.trim()}
                    >Add Variable</Button
                >
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>

    <!-- Edit Variable Modal -->
    <Dialog.Root bind:open={isEditingVariable}>
        <Dialog.Content class="max-w-md">
            <Dialog.Header>
                <Dialog.Title>Edit Variable</Dialog.Title>
                <Dialog.Description>
                    Modify the variable's properties.
                </Dialog.Description>
            </Dialog.Header>

            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <label for="editVariableName" class="text-sm font-medium"
                        >Name</label
                    >
                    <Input
                        id="editVariableName"
                        bind:value={newVariableName}
                        placeholder="Enter variable name"
                        class="w-full"
                    />
                </div>

                <div class="space-y-2">
                    <label for="editVariableType" class="text-sm font-medium"
                        >Type</label
                    >
                    <select
                        id="editVariableType"
                        bind:value={newVariableType}
                        class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                    </select>
                </div>

                <div class="space-y-2">
                    <label for="editVariableValue" class="text-sm font-medium"
                        >Value</label
                    >
                    {#if newVariableType === "boolean"}
                        <select
                            id="editVariableValue"
                            bind:value={newVariableValue}
                            class="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                        >
                            <option value="false">false</option>
                            <option value="true">true</option>
                        </select>
                    {:else}
                        <Input
                            id="editVariableValue"
                            bind:value={newVariableValue}
                            placeholder={newVariableType === "number"
                                ? "Enter number"
                                : "Enter text"}
                            type={newVariableType === "number"
                                ? "number"
                                : "text"}
                            class="w-full"
                        />
                    {/if}
                </div>
            </div>

            <Dialog.Footer>
                <Button variant="outline" onclick={closeEditVariableModal}
                    >Cancel</Button
                >
                <Button
                    onclick={saveEditedVariable}
                    disabled={!newVariableName.trim()}>Save Changes</Button
                >
            </Dialog.Footer>
        </Dialog.Content>
    </Dialog.Root>
</div>
