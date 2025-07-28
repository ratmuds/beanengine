<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import { draggable } from "@neodrag/svelte";
    import CodeBlock from "$lib/components/CodeBlock.svelte";
    import { GripVertical } from "lucide-svelte";

    let items = [
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
    ];

    let variables = [
        { id: "var1", name: "score", type: "number", value: 100 },
        { id: "var2", name: "playerName", type: "string", value: "Player" },
        { id: "var3", name: "isGameOver", type: "boolean", value: false },
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
    class="min-h-screen bg-[#181818] p-6 font-mono relative overflow-hidden flex gap-6"
>
    <!-- Grid background -->
    <div
        class="absolute inset-0"
        style="background-image: radial-gradient(circle, #444 1.5px, transparent 1.5px); background-size: 40px 40px; opacity: 0.4;"
    ></div>

    <!-- Variables Panel -->
    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg w-64 relative z-10"
    >
        <div
            class="bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 rounded-t-md"
        >
            <span class="text-[#ccc] text-sm font-medium">Variables</span>
        </div>
        <div
            class="p-3 space-y-2"
            use:dndzone={{
                items: variables,
                flipDurationMs: 0,
                dragDisabled: false,
                dropFromOthersDisabled: true,
                type: "variable",
                morphDisabled: true,
            }}
            on:consider={(e) => {
                variables = e.detail.items;
            }}
            on:finalize={(e) => {
                variables = e.detail.items;
            }}
        >
            {#each variables as variable (variable.id)}
                <div
                    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium cursor-grab hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm inline-block"
                >
                    {variable.name}
                </div>
            {/each}
        </div>
    </div>

    <div
        class="bg-[#1e1e1e] border border-[#2e2e2e] rounded-md shadow-lg min-w-96 w-fit relative z-10"
        use:draggable={{ handle: ".drag-handle", grid: [40, 40] }}
    >
        <div
            class="drag-handle bg-[#252525] border-b border-[#2e2e2e] px-3 py-2 cursor-grab active:cursor-grabbing flex items-center gap-2 rounded-t-md"
        >
            <GripVertical class="w-4 h-4 text-[#666]" />
            <span class="text-[#ccc] text-sm font-medium">Code List</span>
        </div>

        <div
            class="p-3 min-h-[200px]"
            use:dndzone={{
                items,
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
            on:consider={handleDndConsider}
            on:finalize={handleDndFinalize}
        >
            {#each items as item (item.id)}
                <div animate:flip={{ duration: flipDurationMs }}>
                    <CodeBlock
                        {item}
                        onIfDndConsider={handleIfDndConsider}
                        onIfDndFinalize={handleIfDndFinalize}
                        onUpdate={(updatedItem) => {
                            const index = items.findIndex(
                                (i) => i.id === updatedItem.id
                            );
                            if (index !== -1) {
                                items[index] = { ...updatedItem };
                                items = [...items];
                            } else {
                                console.warn(
                                    `PARENT - Item with id ${updatedItem.id} not found`
                                );
                            }
                        }}
                    />
                </div>
            {/each}
        </div>
    </div>
</div>
