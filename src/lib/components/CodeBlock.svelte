<script lang="ts">
    import { dndzone, dragHandle } from "svelte-dnd-action";
    import Self from "./CodeBlock.svelte";
    import FieldInput from "./FieldInput.svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Info, GripVertical } from "lucide-svelte";
    import { blockConfig } from "$lib/blockConfig.js";

    let {
        item,
        onChildDndConsider = null,
        onChildDndFinalize = null,
        onUpdate = null,
    } = $props();

    let config = $derived(blockConfig[item.type]);
</script>

<div
    style="border-color: {config?.color};"
    class="bg-muted relative m-2 p-2 pl-0 border-l-4 hover:bg-muted transition-colors spacemono w-fit"
>
    {#if config}
        <div
            use:dragHandle
            class="absolute l-0 w-6 h-5/6 flex items-center justify-center text-gray-500 hover:text-gray-300"
        >
            <GripVertical class="w-5 h-5" />
        </div>

        <div class="ml-7 flex items-center gap-2 cursor-grab" use:dragHandle>
            <p class="text-lg text-foreground font-semibold">{config.label}</p>
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Info class="w-4 h-4 text-muted-foreground" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>{config.info}</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>

        <div class="ml-6 flex items-start mt-3 gap-1 w-fit min-w-0">
            {#each config.fields as field}
                {#if field.label}<p class="mx-1">{field.label}</p>{/if}
                <FieldInput {field} {item} {onUpdate} />
                <svelte:component
                    this={field.icon}
                    class="w-8 h-8 p-2 rounded-full outline"
                />
            {/each}

            {#if config.end}<p class="ml-1">{config.end}</p>{/if}
        </div>

        {#if item.children && onChildDndConsider && onChildDndFinalize}
            <div
                use:dndzone={{
                    items: item.children,
                    flipDurationMs: 300,
                    dropTargetStyle: {
                        outline: "2px solid #3b82f6",
                        "outline-offset": "2px",
                    },
                }}
                on:consider={(e) => onChildDndConsider?.(e, item.id)}
                on:finalize={(e) => onChildDndFinalize?.(e, item.id)}
                class="min-h-32 bg-[#1e1e1e] rounded-l-lg m-2 ml-6 p-2 z-10 w-full"
            >
                {#each item.children as child (child.id)}
                    <Self
                        item={child}
                        {onChildDndConsider}
                        {onChildDndFinalize}
                        {onUpdate}
                    />
                {/each}
                {#if item.children.length === 0}
                    <div
                        class="text-muted-foreground text-sm text-center py-2 mr-4 h-32 border-dotted border-border hover:border-blue-500 duration-300 border-2 rounded flex items-center justify-center"
                    >
                        Drop blocks here
                    </div>
                {/if}
            </div>
        {/if}
    {:else}
        <div
            class="spacemono bg-muted m-1 p-2 rounded-l text-sm text-foreground cursor-grab"
        >
            {item.type} block
            <p class="text-red-500">No info available for this block.</p>
            <p class="text-muted-foreground">
                There could be an issue with the block configuration, or this
                page had a fatal error.
            </p>
        </div>
    {/if}
</div>
