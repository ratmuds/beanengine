<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Copy, Clipboard } from "lucide-svelte";
    import { BVector3 } from "$lib/types";

    let {
        value = $bindable(new BVector3(0, 0, 0)),
        label = "",
        precision = 3,
        step = 0.1,
        disabled = false,
    } = $props();

    const dispatch = createEventDispatcher();

    let showCopied = $state(false);

    function formatNumber(num: number) {
        return Number(num.toFixed(precision)).toString();
    }

    function handleInputChange(axis: string, newValue: string) {
        const numValue = parseFloat(newValue) || 0;
        const updatedValue = new BVector3(value.x, value.y, value.z);
        updatedValue[axis] = numValue;
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
                const updatedValue = new BVector3(
                    values[0],
                    values[1],
                    values[2]
                );
                value = updatedValue;
                dispatch("change", { value: updatedValue });
            }
        } catch (err) {
            console.error("Failed to paste vector:", err);
        }
    }
</script>

<div class="space-y-2">
    {#if label}
        <p class="text-sm font-medium text-foreground/90">{label}</p>
    {/if}

    <div
        class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-full shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
        <!-- Simple pill container -->
        <div class="px-4 py-3">
            <div class="flex items-center gap-2">
                <!-- X Input -->
                <div
                    class="group flex-1 bg-red-500/8 border border-red-400/25 rounded-full px-4 py-2.5 transition-all duration-300 ease-out hover:border-red-400/40 hover:bg-red-500/12 hover:scale-105 focus-within:border-red-400/50 focus-within:bg-red-500/15 focus-within:scale-105"
                >
                    <input
                        type="number"
                        value={value.x}
                        {step}
                        {disabled}
                        class="w-full text-center text-sm font-mono text-foreground bg-transparent border-0 p-0 focus:outline-none transition-all duration-200 group-hover:font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        oninput={(e) => handleInputChange("x", (e.target as HTMLInputElement).value)}
                    />
                </div>

                <!-- Y Input -->
                <div
                    class="group flex-1 bg-green-500/8 border border-green-400/25 rounded-full px-4 py-2.5 transition-all duration-300 ease-out hover:border-green-400/40 hover:bg-green-500/12 hover:scale-105 focus-within:border-green-400/50 focus-within:bg-green-500/15 focus-within:scale-105"
                >
                    <input
                        type="number"
                        value={value.y}
                        {step}
                        {disabled}
                        class="w-full text-center text-sm font-mono text-foreground bg-transparent border-0 p-0 focus:outline-none transition-all duration-200 group-hover:font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        oninput={(e) => handleInputChange("y", (e.target as HTMLInputElement).value)}
                    />
                </div>

                <!-- Z Input -->
                <div
                    class="group flex-1 bg-blue-500/8 border border-blue-400/25 rounded-full px-4 py-2.5 transition-all duration-300 ease-out hover:border-blue-400/40 hover:bg-blue-500/12 hover:scale-105 focus-within:border-blue-400/50 focus-within:bg-blue-500/15 focus-within:scale-105"
                >
                    <input
                        type="number"
                        value={value.z}
                        {step}
                        {disabled}
                        class="w-full text-center text-sm font-mono text-foreground bg-transparent border-0 p-0 focus:outline-none transition-all duration-200 group-hover:font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        oninput={(e) => handleInputChange("z", (e.target as HTMLInputElement).value)}
                    />
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-1 ml-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        class="group h-8 w-8 p-0 rounded-full bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-300 ease-out relative overflow-hidden"
                        onclick={copyVector}
                        {disabled}
                        title="Copy vector"
                    >
                        <!-- Ripple effect -->
                        <div
                            class="absolute inset-0 bg-foreground/10 rounded-full scale-0 group-active:scale-100 transition-transform duration-200 ease-out"
                        ></div>
                        <Copy
                            class="w-3.5 h-3.5 relative z-10 group-hover:animate-pulse"
                        />
                        {#if showCopied}
                            <div
                                class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-3 py-1.5 rounded-full shadow-2xl shadow-green-500/30 whitespace-nowrap animate-bounce"
                            >
                                ✨ Copied!
                            </div>
                        {/if}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        class="group h-8 w-8 p-0 rounded-full bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-300 ease-out relative overflow-hidden"
                        onclick={pasteVector}
                        {disabled}
                        title="Paste vector"
                    >
                        <!-- Ripple effect -->
                        <div
                            class="absolute inset-0 bg-foreground/10 rounded-full scale-0 group-active:scale-100 transition-transform duration-200 ease-out"
                        ></div>
                        <Clipboard
                            class="w-3.5 h-3.5 relative z-10 group-hover:animate-pulse"
                        />
                    </Button>
                </div>
            </div>
        </div>
    </div>
</div>
