<script lang="ts">
    import Input from "$lib/components/ui/input/input.svelte";
    import VariableChip from "./VariableChip.svelte";

    let {
        field,
        item,
        onUpdate = null,
    } = $props();
</script>

<div
    class="flex-1 relative min-h-8 border-2 border-transparent hover:border-blue-500 transition-colors rounded-full"
    ondragover={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add(
            "border-blue-500",
            "bg-blue-50/10"
        );
        console.log("Drag over field:", field.bind);
    }}
    ondragleave={(e) => {
        e.currentTarget.classList.remove(
            "border-blue-500",
            "bg-blue-50/10"
        );
    }}
    ondrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove(
            "border-blue-500",
            "bg-blue-50/10"
        );
        console.log("Drop on field:", field.bind);

        try {
            const data =
                e.dataTransfer.getData("application/json");
            console.log("Drop data:", data);
            if (data) {
                const variable = JSON.parse(data);
                console.log("Parsed variable:", variable);

                if (onUpdate) {
                    const currentInputs =
                        item.fields.find(
                            (f) => f.bind === field.bind
                        )?.inputs || [];
                    const newVariable = {
                        ...variable,
                        id: Date.now() + Math.random(),
                    };

                    const updatedItem = {
                        ...item,
                        fields: item.fields.map((f) => ({
                            ...f,
                            inputs:
                                f.bind === field.bind
                                    ? [
                                          ...currentInputs,
                                          newVariable,
                                      ]
                                    : [...f.inputs],
                        })),
                    };

                    console.log(
                        "Calling onUpdate with:",
                        updatedItem
                    );
                    onUpdate(updatedItem);
                }
            }
        } catch (err) {
            console.error(
                "Failed to parse dropped variable:",
                err
            );
        }
    }}
>
    {#if item.fields.find((f) => f.bind === field.bind)?.inputs.length > 0}
        <!-- Show variable chips -->
        <div class="flex gap-1 h-8">
            {#each item.fields.find((f) => f.bind === field.bind)?.inputs as variable (variable.id)}
                {@const _ = console.log(
                    `RENDER - Showing variable chip for ${field.bind}:`,
                    variable
                )}
                <VariableChip {variable} />
            {/each}
        </div>
    {:else}
        <!-- Input when no variables -->
        <Input
            type={field.type}
            class="rounded-full h-8 w-full"
            bind:value={item[field.bind]}
            placeholder={field.placeholder}
        />
    {/if}
</div>