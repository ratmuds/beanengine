<script lang="ts">
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Plus, Info, Search, Diamond, Code } from "lucide-svelte";
    import { generateAvailableBlocks } from "$lib/blockConfig.js";
    import { generateAvailableChips, generateChip } from "$lib/chipConfig.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import * as ContextMenu from "$lib/components/ui/context-menu/index.js";
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
    let newVariableName: string = $state("");
    let newVariableType: string = $state("string");
    let newVariableValue: string = $state("");

    // Variable editing modal state
    let isEditingVariable = $state(false);
    let editingVariable: null | { name: string; type: string; value: any } = $state(null);

    // Search functionality
    let searchQuery = $state("");

    // Drag state for disintegration effect
    let draggedChipId: string | null = $state(null);

    // Filter functions
    let filteredBlocks = $derived(
        availableBlocks.filter((block: any) =>
            block.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    let filteredTriggers = $derived(
        availableTriggers.filter((trigger: any) =>
            trigger.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    let filteredChips = $derived(
        availableChips.filter((chip: any) =>
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

        let parsedValue: any = newVariableValue;

        if (newVariableType === "number") {
            parsedValue = parseFloat(newVariableValue) || 0;
        } else if (newVariableType === "boolean") {
            parsedValue = newVariableValue.toLowerCase() === "true";
        }

        sceneStore.updateVariable(newVariableName, parsedValue);

        closeAddVariableModal();
    }

    function removeVariable(variableName: string) {
        const currentVariables = $sceneStore.variables;
        const filteredVariables = currentVariables.filter(
            (v: any) => v.name !== variableName
        );
        sceneStore.setVariables(filteredVariables);
    }

    function editVariable(variable: any) {
        editingVariable = { ...variable };
        newVariableName = editingVariable!.name;
        newVariableType = editingVariable!.type;
        newVariableValue = String(editingVariable!.value);
        isEditingVariable = true;
    }

    function deleteVariable(variable: any) {
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

        let parsedValue: any = newVariableValue;

        if (newVariableType === "number") {
            parsedValue = parseFloat(newVariableValue) || 0;
        } else if (newVariableType === "boolean") {
            parsedValue = newVariableValue.toLowerCase() === "true";
        }

        if (editingVariable.name !== newVariableName) {
            removeVariable(editingVariable.name);
        }

        sceneStore.updateVariable(newVariableName, parsedValue);

        closeEditVariableModal();
    }
</script>

<div class="w-full p-5 relative z-10 flex flex-col gap-4 h-full">
    <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-500/10 rounded-lg">
            <Code class="w-5 h-5 text-blue-400" />
        </div>
        <h2 class="text-foreground font-semibold text-lg">Code Palette</h2>
    </div>

    <!-- Search -->
    <div class="relative">
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <Search class="w-4 h-4 text-muted-foreground" />
        </div>
        <Input
            type="text"
            bind:value={searchQuery}
            placeholder="Search blocks, triggers, chips..."
            class="pl-12 pr-4 py-3 bg-muted/40 border-border/40 text-foreground text-sm rounded-xl h-11 focus:border-blue-400/60 focus:bg-muted/60 focus:outline-none transition-all duration-200 shadow-sm"
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
        <div class="p-3 space-y-2 max-h-64 overflow-y-auto">
            {#each filteredBlocks as block (block.id)}
                <div
                    transition:slide={{ duration: 200 }}
                    style="border-color: {block?.color};"
                    class="text-white bg-muted border-l-6 hover:border-l-12 px-3 py-2 rounded text-sm font-medium cursor-grab hover:opacity-80 transition-all shadow-sm"
                    role="button"
                    tabindex="0"
                    draggable="true"
                    ondragstart={(e) => {
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        dt.setData("text/plain", JSON.stringify(block));
                        dt.effectAllowed = "copy";
                    }}
                >
                    {block.label}

                    <div class="float-right">
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <Info
                                        class="w-4 h-4 mt-0.5 text-zinc-600"
                                    />
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                    <p>{block.info}</p>
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </div>
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
    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg flex-1"
    >
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
        >
            <span class="text-[#ccc] text-sm font-medium">Triggers</span>
        </div>
        <div class="p-3 space-y-2 max-h-48 overflow-y-auto">
            {#each filteredTriggers as trigger (trigger.id)}
                <div
                    transition:slide={{ duration: 200 }}
                    class="border-l-6 hover:border-l-12 border-yellow-500 bg-muted text-white px-3 py-2 rounded text-sm font-medium cursor-grab transition-all shadow-sm"
                    role="button"
                    tabindex="0"
                    draggable="true"
                    ondragstart={(e) => {
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        dt.setData("text/plain", JSON.stringify(trigger));
                        dt.effectAllowed = "copy";
                    }}
                >
                    <Diamond
                        class="w-4 h-4 mr-1 inline-block text-gray-500 -translate-y-0.5"
                    />
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
    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg flex-1"
    >
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-1.5 rounded-t-md"
        >
            <span class="text-[#ccc] text-xs font-medium">Chips</span>
        </div>
        <div class="p-2 space-y-1 max-h-32 overflow-y-auto">
            {#each filteredChips as chip (chip.id)}
                <div
                    transition:fade={{ duration: 200 }}
                    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm inline-block mr-1 {draggedChipId ===
                    chip.id
                        ? 'opacity-50 scale-95'
                        : ''}"
                    role="button"
                    tabindex="0"
                    draggable="true"
                    ondragstart={(e) => {
                        draggedChipId = chip.id as any;
                        const dt = e.dataTransfer;
                        if (!dt) return;
                        dt.setData("application/json", JSON.stringify(chip));
                        dt.setData("application/x-chip-source", "palette");
                        dt.effectAllowed = "copy";
                    }}
                    ondragend={() => {
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
    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg flex-1"
    >
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
                            role="button"
                            tabindex="0"
                            draggable="true"
                            ondragstart={(e) => {
                                const variableChip = generateChip("variable", {
                                    name: variable.name,
                                });
                                const dt = e.dataTransfer;
                                if (!dt) return;
                                dt.setData(
                                    "application/json",
                                    JSON.stringify(variableChip)
                                );
                                dt.setData("application/x-chip-source", "palette");
                                dt.effectAllowed = "copy";
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
