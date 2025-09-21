<script lang="ts">
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Select from "$lib/components/ui/select/index.js";
    import Chip from "./Chip.svelte";

    let { field, item, onUpdate = null } = $props();

    let fieldValue = $derived(item[field.bind]);

    function updateFieldValue(newValue: any) {
        if (onUpdate) {
            const updatedItem = {
                ...item,
                [field.bind]: newValue,
            } as any;
            onUpdate(updatedItem);
        }
    }

    function removeChipById(chipId: any) {
        const updatedItem = {
            ...item,
            fields: item.fields.map((f: any) =>
                f.bind === field.bind
                    ? { ...f, inputs: (f.inputs || []).filter((c: any) => c.id !== chipId) }
                    : f
            ),
        };
        onUpdate?.(updatedItem);
    }
</script>

<div
    class="relative min-h-8 min-w-24 w-fit border-2 border-transparent bg-muted hover:border-blue-500 transition-colors rounded-full"
    role="listbox"
    tabindex="0"
    aria-label="Field input drop zone"
    ondragover={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("border-blue-500", "bg-blue-50/10");
        const dt = e.dataTransfer;
        if (dt) {
            const allowed = dt.effectAllowed || "copy";
            dt.dropEffect = allowed === "move" ? "move" : "copy";
        }
    }}
    ondragleave={(e) => {
        e.stopPropagation();
        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/10");
    }}
    ondrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/10");

        try {
            const dt = e.dataTransfer;
            if (!dt) return;
            const json = dt.getData("application/json");
            const source = dt.getData("application/x-chip-source"); // 'palette' | 'field'
            if (!json) return;
            const droppedChip = JSON.parse(json);

            const targetField = item.fields.find((f: any) => f.bind === field.bind);
            const currentInputs = (targetField?.inputs || []).slice();

            const fromItemId = dt.getData("application/x-chip-from-item");
            const fromFieldBind = dt.getData("application/x-chip-from-field");
            const fromChipId = dt.getData("application/x-chip-from-id");

            if (source === "field") {
                // Same field: no-op (avoid duplication), make dragend treat as copy to prevent deletion
                const sameField = String(item.id) === fromItemId && String(field.bind) === fromFieldBind;
                if (sameField) {
                    dt.dropEffect = "copy";
                    return;
                }

                // Move within the same parent item: remove from source and append to target atomically
                if (String(item.id) === fromItemId) {
                    const updatedItem = {
                        ...item,
                        fields: item.fields.map((f: any) => {
                            if (f.bind === fromFieldBind) {
                                return {
                                    ...f,
                                    inputs: (f.inputs || []).filter((c: any) => String(c.id) !== String(fromChipId)),
                                };
                            }
                            if (f.bind === field.bind) {
                                return { ...f, inputs: [...currentInputs, droppedChip] };
                            }
                            return f;
                        }),
                    };
                    // Mark as copy so the source chip's dragend does not perform deletion again
                    dt.dropEffect = "copy";
                    onUpdate?.(updatedItem);
                    return;
                }

                // Different items: append here; let source chip remove itself on dragend (move)
                dt.dropEffect = "move";
                const updatedItem = {
                    ...item,
                    fields: item.fields.map((f: any) =>
                        f.bind === field.bind
                            ? { ...f, inputs: [...currentInputs, droppedChip] }
                            : f
                    ),
                };
                onUpdate?.(updatedItem);
                return;
            }

            // Default: from palette => copy
            dt.dropEffect = "copy";
            const newChip = { ...droppedChip, id: Date.now() + Math.random() };
            const updatedItem = {
                ...item,
                fields: item.fields.map((f: any) =>
                    f.bind === field.bind
                        ? { ...f, inputs: [...currentInputs, newChip] }
                        : f
                ),
            };
            onUpdate?.(updatedItem);
        } catch (err) {
            console.error("Failed to handle dropped chip:", err);
        }
    }}
>
    {#if item.fields.find((f: any) => f.bind === field.bind)?.inputs?.length > 0}
        <!-- Show chips -->
        <div class="flex gap-1 min-h-8">
            {#each item.fields.find((f: any) => f.bind === field.bind)?.inputs || [] as chip, index (chip.id)}
                <Chip
                    {chip}
                    dragMeta={{ itemId: item.id, fieldBind: field.bind, index }}
                    onRequestDelete={(c: any) => removeChipById(c.id)}
                    onUpdate={(updatedChip: any) => {
                        const currentInputs =
                            item.fields.find((f: any) => f.bind === field.bind)?.inputs || [];
                        const updatedInputs = currentInputs.map((input: any) =>
                            input.id === updatedChip.id ? updatedChip : input
                        );

                        const updatedItem = {
                            ...item,
                            fields: item.fields.map((f: any) => ({
                                ...f,
                                inputs: f.bind === field.bind ? updatedInputs : f.inputs,
                            })),
                        };

                        onUpdate?.(updatedItem);
                    }}
                />
            {/each}
        </div>
    {:else}
        <!-- Input when no chips -->
        {#if field.type === "dropdown" && field.options}
            <!-- Dropdown Select -->
            <Select.Root 
                type="single" 
                value={fieldValue || field.defaultValue || ""} 
                onValueChange={(newValue) => updateFieldValue(newValue)}
            >
                <Select.Trigger class="rounded-full h-8 min-w-8 w-fit px-3 text-sm">
                    {field.options.find((opt: any) => opt.value === (fieldValue || field.defaultValue))?.label || field.placeholder || "Select..."}
                </Select.Trigger>
                <Select.Content>
                    {#each field.options as option (option.value)}
                        <Select.Item value={option.value} label={option.label}>
                            {option.label}
                        </Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        {:else}
            <!-- Regular Input -->
            <Input
                type={field.type}
                class="rounded-full h-8 min-w-8"
                value={fieldValue}
                oninput={(e) => updateFieldValue((e.target as HTMLInputElement)?.value)}
                placeholder={field.placeholder}
            />
        {/if}
    {/if}
</div>
