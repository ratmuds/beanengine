<script lang="ts">
    import { onMount } from "svelte";

    export let isLoading = true;
    export let loadingText = "Loading Bean Engine...";

    import { fade } from "svelte/transition";
</script>

{#if isLoading}
    <div
        class="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"
        transition:fade={{ duration: 500 }}
    >
        <!-- Bean Engine Logo -->
        <div class="text-center space-y-6">
            <h1
                class="text-5xl font-bold tracking-tight flex items-center justify-center"
            >
                <span
                    class="inline-block p-3 rounded-full font-black text-gray-600"
                    >bean</span
                >
                <span class="font-bold text-gray-500">engine</span>
            </h1>

            <!-- Loading Animation -->
            <div class="space-y-3">
                <div class="flex justify-center">
                    <div
                        class="animate-spin rounded-full h-8 w-8 border-2 border-orange-500/30 border-t-orange-500"
                    ></div>
                </div>
                <p class="text-gray-400 text-sm font-medium text-center">
                    {loadingText}
                </p>
            </div>
        </div>
    </div>
{/if}

<style>
    h1 {
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-style: italic;
    }
</style>
