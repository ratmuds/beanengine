<script lang="ts">
    import FieldInput from "./FieldInput.svelte";

    let { chip, onUpdate = null } = $props();
</script>

<div
    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium {chip.fields &&
    chip.fields.length > 0
        ? 'min-h-8'
        : 'h-8'} flex items-center justify-center min-w-0 w-fit cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all"
    title={chip.name}
    draggable="true"
    ondragstart={(e) => {
        console.log("Dragging chip:", chip.name);
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.setData("application/json", JSON.stringify(chip));
            e.dataTransfer.effectAllowed = "move";
        }
    }}
    onmousedown={(e) => {
        console.log("Chip clicked:", chip.name);
        e.stopPropagation();
    }}
>
    <span class="whitespace-nowrap">{chip.label}</span>

    <!-- Fields -->

    {#each chip.fields as field}
        <div class="ml-2">
            <FieldInput
                {field}
                item={chip}
                onUpdate={(updatedChip) => {
                    chip = updatedChip;
                    if (onUpdate) {
                        onUpdate(updatedChip);
                    }
                }}
            />
        </div>
    {/each}
</div>