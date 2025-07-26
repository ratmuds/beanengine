<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import CodeBlock from "$lib/components/CodeBlock.svelte";

    let items = [
        { id: 1, type: "say", text: "", duration: "" },
        { id: 2, type: "if", condition: "", children: [] },
    ];

    const flipDurationMs = 300;

    function handleDndConsider(e) {
        items = e.detail.items;
    }

    function handleDndFinalize(e) {
        items = e.detail.items;
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
</script>

<div
    use:dndzone={{ 
        items, 
        flipDurationMs,
        dropTargetStyle: { "outline": "2px solid #3b82f6", "outline-offset": "2px" }
    }}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
    class="min-h-[200px] p-4"
>
    {#each items as item (item.id)}
        <div animate:flip={{ duration: flipDurationMs }}>
            <CodeBlock
                {item}
                onIfDndConsider={handleIfDndConsider}
                onIfDndFinalize={handleIfDndFinalize}
                onUpdate={(updatedItem) => {
                    const index = items.findIndex(i => i.id === updatedItem.id);
                    if (index !== -1) {
                        items[index] = updatedItem;
                        items = [...items];
                    }
                }}
            />
        </div>
    {/each}
</div>
