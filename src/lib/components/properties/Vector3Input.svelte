<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import { Copy, Clipboard, ChevronDown, ChevronRight } from "lucide-svelte";

    interface Vector3 {
        x: number;
        y: number;
        z: number;
    }

    export let value: Vector3 = { x: 0, y: 0, z: 0 };
    export let label: string = "";
    export let precision: number = 3;
    export let step: number = 0.1;
    export let disabled: boolean = false;

    const dispatch = createEventDispatcher<{
        change: { value: Vector3 };
    }>();

    let expanded = false;
    let showCopied = false;

    function formatNumber(num: number): string {
        return Number(num.toFixed(precision)).toString();
    }

    function handleInputChange(axis: "x" | "y" | "z", newValue: string) {
        const numValue = parseFloat(newValue) || 0;
        const updatedValue = { ...value, [axis]: numValue };
        value = updatedValue;
        dispatch("change", { value: updatedValue });
    }

    async function copyVector() {
        const vectorString = `${formatNumber(value.x)}, ${formatNumber(value.y)}, ${formatNumber(value.z)}`;
        try {
            await navigator.clipboard.writeText(vectorString);
            showCopied = true;
            setTimeout(() => (showCopied = false), 1000);
        } catch (err) {
            console.error("Failed to copy vector:", err);
        }
    }

    async function pasteVector() {
        try {
            const text = await navigator.clipboard.readText();
            const values = text.split(",").map((v) => parseFloat(v.trim()));
            if (values.length === 3 && values.every((v) => !isNaN(v))) {
                const updatedValue = {
                    x: values[0],
                    y: values[1],
                    z: values[2],
                };
                value = updatedValue;
                dispatch("change", { value: updatedValue });
            }
        } catch (err) {
            console.error("Failed to paste vector:", err);
        }
    }

    function toggleExpanded() {
        expanded = !expanded;
    }
</script>

<div>
    {#if label}
        <p class="text-xs text-muted-foreground">{label}</p>
    {/if}

    <div
        class="bg-gray-800/30 border border-gray-700/30 rounded text-xs overflow-hidden"
    >
        <!-- Compact view -->
        <div class="flex items-center p-1 gap-1">
            <Button
                variant="ghost"
                size="sm"
                class="h-4 w-4 p-0 text-gray-500 hover:text-gray-300"
                on:click={toggleExpanded}
                {disabled}
            >
                {#if expanded}
                    <ChevronDown class="w-3 h-3" />
                {:else}
                    <ChevronRight class="w-3 h-3" />
                {/if}
            </Button>

            <div class="flex-1 grid grid-cols-3 gap-0.5 text-xs font-mono">
                <input
                    type="number"
                    value={value.x}
                    {step}
                    {disabled}
                    class="text-center text-gray-300 bg-transparent border-0 px-1 py-0.5 w-full focus:bg-red-500/10 focus:outline-none"
                    on:input={(e) => handleInputChange("x", e.target.value)}
                />
                <input
                    type="number"
                    value={value.y}
                    {step}
                    {disabled}
                    class="text-center text-gray-300 bg-transparent border-0 px-1 py-0.5 w-full focus:bg-green-500/10 focus:outline-none"
                    on:input={(e) => handleInputChange("y", e.target.value)}
                />
                <input
                    type="number"
                    value={value.z}
                    {step}
                    {disabled}
                    class="text-center text-gray-300 bg-transparent border-0 px-1 py-0.5 w-full focus:bg-blue-500/10 focus:outline-none"
                    on:input={(e) => handleInputChange("z", e.target.value)}
                />
            </div>

            <div class="flex gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-5 w-5 p-0 text-gray-500 hover:text-blue-400 relative"
                    on:click={copyVector}
                    {disabled}
                    title="Copy vector"
                >
                    <Copy class="w-2.5 h-2.5" />
                    {#if showCopied}
                        <div
                            class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
                        >
                            Copied!
                        </div>
                    {/if}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-5 w-5 p-0 text-gray-500 hover:text-green-400"
                    on:click={pasteVector}
                    {disabled}
                    title="Paste vector"
                >
                    <Clipboard class="w-2.5 h-2.5" />
                </Button>
            </div>
        </div>
    </div>
</div>
