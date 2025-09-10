<script lang="ts">
    import { Plus } from "lucide-svelte";
    import { generateAvailableBlocks } from "$lib/blockConfig.js";
    import { generateAvailableChips, generateChip } from "$lib/chipConfig.js";
    import * as Dialog from "./ui/dialog";
    import Button from "./ui/button/button.svelte";
    import Input from "./ui/input/input.svelte";
    import * as ContextMenu from "./ui/context-menu";
    import { sceneStore } from "$lib/sceneStore.js";
    import { slide, fade } from "svelte/transition";

    // Available code block templates - generated from config
    let availableBlocks = $state(generateAvailableBlocks());
    // Available chip templates - generated from config
    let availableChips = $state(generateAvailableChips());

    // Available trigger templates for dragging
    let availableTriggers = $state([
        { id: "trigger1", type: "onStart", name: "On Start" },
        { id: "trigger2", type: "onUpdate", name: "On Update" },
        { id: "trigger3", type: "onKeyPress", name: "On Key Press" },
    ]);

    // Variable creation modal state
    let isAddingVariable = $state(false);
    let newVariableName = $state("");
    let newVariableType = $state("string");
    let newVariableValue = $state("");

    // Variable editing modal state
    let isEditingVariable = $state(false);
    let editingVariable = $state(null);

    // Search functionality
    let searchQuery = $state("");

    // Drag state for disintegration effect
    let draggedChipId = $state(null);
    let dragStartTime = $state(0);

    // Filter functions
    let filteredBlocks = $derived(
        availableBlocks.filter((block) =>
            block.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    let filteredTriggers = $derived(
        availableTriggers.filter((trigger) =>
            trigger.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    let filteredChips = $derived(
        availableChips.filter((chip) =>
            chip.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

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

<div class="w-full p-5 relative z-10 flex flex-col gap-4 h-full">
    <h2 class="text-foreground font-semibold text-lg">Code Palette</h2>

    <!-- Sticky Search Bar -->
    <div class="w-full sticky top-0 z-20 bg-[#181818] pb-2">
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search blocks, triggers, chips..."
            class="w-full px-3 py-2 bg-[#1e1e1e] border border-[#2e2e2e] rounded-md text-[#ccc] text-sm placeholder-[#666] focus:outline-none focus:border-blue-500 transition-colors"
        />
    </div>

    <!-- Code Blocks Palette -->
    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg flex-1"
    >
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
        >
            <span class="text-[#ccc] text-sm font-medium">Code Blocks</span>
        </div>
        <div class="p-3 space-y-2 max-h-[calc(25vh-50px)] overflow-y-auto">
            {#each filteredBlocks as block (block.id)}
                <div
                    transition:slide={{ duration: 200 }}
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
            {#if filteredBlocks.length === 0}
                <div class="text-[#666] text-xs text-center py-4">
                    No blocks found
                </div>
            {/if}
        </div>
    </div>

    <!-- Triggers Palette -->
    <div class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg">
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
        >
            <span class="text-[#ccc] text-sm font-medium">Triggers</span>
        </div>
        <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
            {#each filteredTriggers as trigger (trigger.id)}
                <div
                    transition:slide={{ duration: 200 }}
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
            {#if filteredTriggers.length === 0}
                <div class="text-[#666] text-xs text-center py-4">
                    No triggers found
                </div>
            {/if}
        </div>
    </div>

    <!-- Chips Panel -->
    <div class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg h-32">
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
        >
            <span class="text-[#ccc] text-xs font-medium">Chips</span>
        </div>
        <div class="p-2 space-y-1 h-20 overflow-y-auto">
            {#each filteredChips as chip (chip.id)}
                <div
                    transition:fade={{ duration: 200 }}
                    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm inline-block mr-1 {draggedChipId ===
                    chip.id
                        ? 'opacity-50 scale-95'
                        : ''}"
                    draggable="true"
                    ondragstart={(e) => {
                        draggedChipId = chip.id;
                        dragStartTime = Date.now();
                        e.dataTransfer.setData(
                            "application/json",
                            JSON.stringify(chip)
                        );
                        e.dataTransfer.effectAllowed = "move";
                    }}
                    ondragend={(e) => {
                        // Use a small delay to check if the chip was successfully dropped
                        // If the drag was very short or the drop effect is "none", it likely failed
                        const dragDuration = Date.now() - dragStartTime;
                        const wasSuccessful =
                            e.dataTransfer.dropEffect !== "none" &&
                            dragDuration > 100;

                        if (!wasSuccessful && draggedChipId === chip.id) {
                            // Add a small animation delay before removing
                            setTimeout(() => {
                                availableChips = availableChips.filter(
                                    (c) => c.id !== chip.id
                                );
                            }, 150);
                        }
                        draggedChipId = null;
                    }}
                >
                    {chip.type}
                </div>
            {/each}
            {#if filteredChips.length === 0}
                <div class="text-[#666] text-xs text-center py-4">
                    No chips found
                </div>
            {/if}
        </div>
    </div>

    <!-- Variables Panel -->
    <div class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg">
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
        >
            <span class="text-[#ccc] text-xs font-medium">Variables</span>
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
                                const variableChip = generateChip("variable", {
                                    name: variable.name,
                                });
                                e.dataTransfer.setData(
                                    "application/json",
                                    JSON.stringify(variableChip)
                                );
                                e.dataTransfer.effectAllowed = "copy";
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
                        type={newVariableType === "number" ? "number" : "text"}
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
                        type={newVariableType === "number" ? "number" : "text"}
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
