<script lang="ts">
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

    // Create local state for each field's dnd zone to avoid reactivity conflicts
    let fieldStates = $state({});
</script>

<div
    class="bg-muted m-2 p-2 cursor-grab border-l-4 border-l-{config
        ? config.color
        : 'gray-500'} hover:bg-muted transition-colors spacemono min-w-96 w-fit"
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

        <div class="flex items-center mt-3 gap-1">
            {#each config.fields as field}
                {#if field.label}<p class="mx-1">{field.label}</p>{/if}
                <div class="flex-1 relative">
                    <div
                        class="relative min-h-8"
                        use:dndzone={{
                            items:
                                item.fields.find((f) => f.bind === field.bind)
                                    ?.inputs || [],
                            flipDurationMs: 0,
                            type: "variable",
                            dropTargetStyle: {
                                outline: "2px solid #3b82f6",
                                "outline-offset": "2px",
                                "background-color": "rgba(59, 130, 246, 0.08)",
                                "border-radius": "32px",
                            },
                            dropFromOthersDisabled: false,
                        }}
                        onconsider={(e) => {
                            console.log(
                                `CONSIDER - Field ${field.bind}:`,
                                JSON.stringify(e.detail.items)
                            );
                            console.log(
                                `CONSIDER - Current item.fields:`,
                                JSON.stringify(item.fields)
                            );

                            if (onUpdate) {
                                const updatedItem = {
                                    ...item,
                                    fields: item.fields.map((f) => ({
                                        ...f,
                                        inputs:
                                            f.bind === field.bind
                                                ? [...e.detail.items]
                                                : [...f.inputs],
                                    })),
                                };
                                onUpdate(updatedItem);
                            }
                        }}
                        onfinalize={(e) => {
                            console.log(
                                `FINALIZE - Field ${field.bind}:`,
                                e.detail.items
                            );
                            console.log(
                                `FINALIZE - Current item.fields before update:`,
                                item.fields
                            );
                            if (onUpdate) {
                                // Create updated item without modifying original
                                const updatedItem = {
                                    ...item,
                                    fields: item.fields.map((f) => ({
                                        ...f,
                                        inputs:
                                            f.bind === field.bind
                                                ? [...e.detail.items]
                                                : [...f.inputs],
                                    })),
                                };
                                console.log(
                                    `FINALIZE - About to call onUpdate with:`,
                                    updatedItem
                                );
                                onUpdate(updatedItem);
                            }
                        }}
                    >
                        {#if item.fields.find((f) => f.bind === field.bind)?.inputs.length > 0}
                            <!-- Show variable chip -->
                            {#each item.fields.find((f) => f.bind === field.bind)?.inputs as variable (variable.id)}
                                {@const _ = console.log(
                                    `RENDER - Showing variable chip for ${field.bind}:`,
                                    variable
                                )}
                                <div
                                    class="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium inline-block max-w-32 truncate"
                                    title={variable.name}
                                >
                                    {variable.name}
                                </div>
                            {/each}
                        {:else}
                            <!-- Show input when no variable -->
                            <Input
                                type={field.type}
                                class="rounded-full h-8 w-full"
                                placeholder={field.placeholder}
                                value={item[field.bind]}
                            />
                        {/if}
                    </div>
                </div>
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
