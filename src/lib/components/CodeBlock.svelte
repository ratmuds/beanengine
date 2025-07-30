<script lang="ts">
    import { dndzone } from "svelte-dnd-action";
    import Self from "./CodeBlock.svelte";
    import FieldInput from "./FieldInput.svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Info } from "lucide-svelte";
    import { blockConfig } from "$lib/blockConfig.js";

    let {
        item,
        onIfDndConsider = null,
        onIfDndFinalize = null,
        onUpdate = null,
    } = $props();

    let config = $derived(blockConfig[item.type]);
</script>

<div
    class="bg-muted m-2 p-2 cursor-grab border-l-4 border-l-{config
        ? config.color
        : 'gray-500'} hover:bg-muted transition-colors spacemono w-fit"
>
    {#if config}
        <div class="flex items-center gap-2">
            <p class="text-sm text-foreground">{config.label}</p>
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

        <div class="flex items-start mt-3 gap-1 w-fit min-w-0">
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

        {#if item.type === "if" && onIfDndConsider && onIfDndFinalize}
            <div
                use:dndzone={{
                    items: item.children,
                    flipDurationMs: 300,
                    dropTargetStyle: {
                        outline: "1px solid #3b82f6",
                        "outline-offset": "1px",
                        "border-radius": "4px",
                        "transition-duration": "1s",
                    },
                    morphDisabled: true,
                }}
                onconsider={(e) => onIfDndConsider(e, item.id)}
                onfinalize={(e) => onIfDndFinalize(e, item.id)}
                class="min-h-16 bg-[#1e1e1e] rounded-l-lg m-2 p-2 z-10 w-full"
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
                        class="text-muted-foreground text-sm text-center py-2 h-16 border-dotted border-border hover:border-blue-500 duration-300 border-2 rounded flex items-center justify-center"
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
