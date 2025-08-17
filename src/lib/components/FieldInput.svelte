<script lang="ts">
    import Input from "$lib/components/ui/input/input.svelte";
    import Chip from "./Chip.svelte";

    let { field, item, onUpdate = null } = $props();

    let fieldValue = $derived(item[field.bind]);

    function updateFieldValue(newValue) {
        if (onUpdate) {
            const updatedItem = {
                ...item,
                [field.bind]: newValue,
            };
            onUpdate(updatedItem);
        }
    }
</script>

<div
    class="relative min-h-8 min-w-24 w-fit border-2 border-transparent bg-muted hover:border-blue-500 transition-colors rounded-full"
    ondragover={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("border-blue-500", "bg-blue-50/10");
        console.log("Drag over field:", field.bind);
    }}
    ondragleave={(e) => {
        e.stopPropagation();
        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/10");
    }}
    ondrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/10");
        console.log("Drop on field:", field.bind);

        try {
            const data = e.dataTransfer.getData("application/json");
            console.log("Drop data:", data);
            if (data) {
                const chip = JSON.parse(data);
                console.log("Parsed chip:", chip);

                if (onUpdate) {
                    const currentInputs =
                        item.fields.find((f) => f.bind === field.bind)
                            ?.inputs || [];
                    const newChip = {
                        ...chip,
                        id: Date.now() + Math.random(),
                    };

                    const updatedItem = {
                        ...item,
                        fields: item.fields.map((f) => ({
                            ...f,
                            inputs:
                                f.bind === field.bind
                                    ? [...currentInputs, newChip]
                                    : [...f.inputs],
                        })),
                    };

                    console.log("Calling onUpdate with:", updatedItem);
                    onUpdate(updatedItem);
                }
            }
        } catch (err) {
            console.error("Failed to parse dropped chip:", err);
        }
    }}
>
    {#if item.fields.find((f) => f.bind === field.bind)?.inputs?.length > 0}
        <!-- Show chips -->
        <div class="flex gap-1 min-h-8">
            {#each item.fields.find((f) => f.bind === field.bind)?.inputs || [] as chip (chip.id)}
                {@const _ = console.log(
                    `RENDER - Showing chip for ${field.bind}:`,
                    chip
                )}
                <Chip
                    {chip}
                    onUpdate={(updatedChip) => {
                        // Find and update the specific chip in the inputs array
                        const currentInputs =
                            item.fields.find((f) => f.bind === field.bind)
                                ?.inputs || [];
                        const updatedInputs = currentInputs.map((input) =>
                            input.id === updatedChip.id ? updatedChip : input
                        );

                        // Reconstruct the entire parent item with updated inputs
                        const updatedItem = {
                            ...item,
                            fields: item.fields.map((f) => ({
                                ...f,
                                inputs:
                                    f.bind === field.bind
                                        ? updatedInputs
                                        : f.inputs,
                            })),
                        };

                        console.log(
                            `🔄 FieldInput propagating chip update for field ${field.bind}`
                        );

                        // Propagate the fully reconstructed item up to parent
                        if (onUpdate) {
                            onUpdate(updatedItem);
                        }
                    }}
                />
            {/each}
        </div>
    {:else}
        <!-- Input when no chips -->
        <Input
            type={field.type}
            class="rounded-full h-8 min-w-8"
            value={fieldValue}
            oninput={(e) => updateFieldValue(e.target.value)}
            placeholder={field.placeholder}
        />
    {/if}
</div>
