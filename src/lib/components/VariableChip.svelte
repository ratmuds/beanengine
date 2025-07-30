<script lang="ts">
    let { variable } = $props();
</script>

<div
    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium h-8 flex items-center justify-center min-w-0 flex-1 cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all"
    title={variable.name}
    draggable="true"
    ondragstart={(e) => {
        console.log("Dragging variable:", variable.name);
        e.stopPropagation();
        e.dataTransfer.setData("application/json", JSON.stringify(variable));
        e.dataTransfer.effectAllowed = "move";
    }}
    onmousedown={(e) => {
        console.log("VariableChip clicked:", variable.name);
        e.stopPropagation();
    }}
>
    <span class="truncate">{variable.name}</span>
</div>
