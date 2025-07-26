<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import Self from "./CodeBlock.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Type, Hash, GitBranch, Info } from "lucide-svelte";

    let {
        item,
        onIfDndConsider = null,
        onIfDndFinalize = null,
        onUpdate = null,
    } = $props();

    const blockConfig = {
        say: {
            color: "purple-500",
            label: "Say",
            fields: [
                {
                    type: "text",
                    bind: "text",
                    placeholder: "message",
                    icon: Type,
                },
                {
                    type: "number",
                    bind: "duration",
                    label: "for",
                    placeholder: "seconds",
                    icon: Hash,
                },
            ],
            info: "Shows a message over the object for a duration",
        },
        if: {
            color: "blue-500",
            label: "If",
            fields: [
                {
                    type: "text",
                    bind: "condition",
                    placeholder: "condition",
                    icon: GitBranch,
                },
            ],
            info: "Runs code if condition is true",
            end: "then",
        },
    };

    let config = $derived(blockConfig[item.type]);
</script>

<div
    class="bg-gray-800 m-2 p-2 cursor-grab border-l-4 border-l-{config
        ? config.color
        : 'gray-500'} hover:bg-gray-750 transition-colors spacemono"
>
    {#if config}
        <div class="flex items-center gap-2">
            <p class="text-sm text-gray-300">{config.label}</p>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Info class="w-4 h-4 text-gray-500" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>{config.info}</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>

        <div class="flex items-center mt-3 gap-2">
            {#each config.fields as field}
                {#if field.label}<p>{field.label}</p>{/if}
                <Input
                    type={field.type}
                    class="rounded-full h-8 flex-1"
                    placeholder={field.placeholder}
                    value={item[field.bind]}
                    on:input={(e) => {
                        if (onUpdate) {
                            const updatedItem = { ...item };
                            updatedItem[field.bind] = e.target.value;
                            onUpdate(updatedItem);
                        }
                    }}
                />
                <svelte:component
                    this={field.icon}
                    class="w-8 h-8 p-2 rounded-full outline"
                />
            {/each}

            {#if config.end}<p>{config.end}</p>{/if}
        </div>

        {#if item.type === "if" && onIfDndConsider && onIfDndFinalize}
            <div
                use:dndzone={{ 
                    items: item.children, 
                    flipDurationMs: 300,
                    dropTargetStyle: { "outline": "2px solid #3b82f6", "outline-offset": "2px" }
                }}
                onconsider={(e) => onIfDndConsider(e, item.id)}
                onfinalize={(e) => onIfDndFinalize(e, item.id)}
                class="min-h-16 w-full bg-gray-950 rounded-l-lg m-2 p-2 z-10"
            >
                {#each item.children as child (child.id)}
                    <Self
                        item={child}
                        {onIfDndConsider}
                        {onIfDndFinalize}
                        {onUpdate}
                    />
                {/each}
                {#if item.children.length === 0}
                    <div
                        class="text-gray-500 text-sm text-center py-2 h-16 border-dotted border-gray-600 hover:border-blue-500 duration-300 border-2 rounded flex items-center justify-center"
                    >
                        Drop blocks here
                    </div>
                {/if}
            </div>
        {/if}
    {:else}
        <div
            class="spacemono bg-gray-700 m-1 p-2 rounded-l text-sm text-gray-300 cursor-grab"
        >
            {item.type} block
            <p class="text-red-500">No info available for this block.</p>
            <p class="text-gray-500">
                There could be an issue with the block configuration, or this
                page had a fatal error.
            </p>
        </div>
    {/if}
</div>
