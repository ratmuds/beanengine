<script lang="ts">
    let { variable } = $props();
</script>

<div
    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium h-8 flex items-center justify-center min-w-0 flex-1"
    title={variable.name}
>
    <span class="truncate">{variable.name}</span>
</div>
