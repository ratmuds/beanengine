<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import * as Select from "$lib/components/ui/select";

    let {
        options,
        value = $bindable(),
        label,
        placeholder = "Select an option",
        disabled = false,
    } = $props();

    const dispatch = createEventDispatcher();

    let selectedOption = $derived(
        (typeof options === "function" ? options() : options)?.find(
            (option) => option.id === value
        )
    );

    $effect(() => {
        console.log(selectedOption);
    });

    // Convert null to undefined for the Select component
    let selectValue = $derived(value ?? undefined);

    function handleValueChange(newValue) {
        console.log("AAAAAAAAAAAAAAAAAAAA");
        if (newValue !== value) {
            const option = (
                typeof options === "function" ? options() : options
            )?.find((opt) => opt.id === newValue);
            if (option) {
                value = newValue;
                dispatch("change", { value: newValue, option });
            }
        }
    }

    // Sync selectValue back to value when it changes
    $effect(() => {
        if (selectValue !== value) {
            value = selectValue;
        }
    });
</script>

<div class="space-y-2">
    {#if label}
        <label class="text-sm font-medium text-foreground">
            {label}
        </label>
    {/if}

    <Select.Root
        bind:value={selectValue}
        onValueChange={handleValueChange}
        {disabled}
        type="single"
    >
        <Select.Trigger class="w-full">
            <span class="truncate">{selectedOption?.label || placeholder}</span>
        </Select.Trigger>
        <Select.Content>
            <Select.Label>{label}</Select.Label>
            {#each (typeof options === "function" ? options() : options) || [] as option (option.id)}
                <Select.Item value={option.id}>
                    <span class="truncate">{option.label}</span>
                </Select.Item>
            {/each}
        </Select.Content>
    </Select.Root>
</div>

<style>
    .property-dropdown {
        @apply relative;
    }

    .rotate-180 {
        transform: rotate(180deg);
    }
</style>
