<script lang="ts">
    import FieldInput from "./FieldInput.svelte";

    // Accept drag metadata so we can encode the origin of this chip when dragging from a field
    // dragMeta: information about the parent item/field/index if this chip lives inside a field
    let {
        chip,
        onUpdate = null,
        dragMeta = null, // { itemId, fieldBind, index }
        onRequestDelete = null, // callback to remove this chip from its parent when needed
    } = $props();
</script>

<div
    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium {chip.fields &&
    chip.fields.length > 0
        ? 'min-h-8'
        : 'h-8'} flex items-center justify-center min-w-0 w-fit cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all"
    title={chip.name}
    role="button"
    tabindex="0"
    draggable="true"
    ondragstart={(e) => {
        e.stopPropagation();
        if (e.dataTransfer) {
            // Always provide the chip payload
            e.dataTransfer.setData("application/json", JSON.stringify(chip));
            // Mark the source of this drag so drop targets can decide copy vs move
            e.dataTransfer.setData(
                "application/x-chip-source",
                dragMeta ? "field" : "palette"
            );
            if (dragMeta) {
                e.dataTransfer.setData(
                    "application/x-chip-from-item",
                    String(dragMeta.itemId)
                );
                e.dataTransfer.setData(
                    "application/x-chip-from-field",
                    String(dragMeta.fieldBind)
                );
                e.dataTransfer.setData(
                    "application/x-chip-from-id",
                    String(chip.id)
                );
                e.dataTransfer.setData(
                    "application/x-chip-from-index",
                    String(dragMeta.index)
                );
            }
            // Field chips move by default; palette chips copy by default
            e.dataTransfer.effectAllowed = dragMeta ? "move" : "copy";
        }
    }}
    ondragend={(e) => {
        const dropEffect = e.dataTransfer?.dropEffect;
        // If dropped into void (none) OR a successful move, remove from source
        if ((dropEffect === "none" || dropEffect === "move") && onRequestDelete) {
            onRequestDelete(chip);
        }
    }}
    onmousedown={(e) => {
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
                onUpdate={(updatedChip: any) => {
                    chip = updatedChip;
                    if (onUpdate) onUpdate(updatedChip);
                }}
            />
        </div>
    {/each}
</div>