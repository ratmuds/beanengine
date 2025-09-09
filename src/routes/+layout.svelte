<script lang="ts">
    import "../app.css";
    import { ModeWatcher } from "mode-watcher";
    import { Toaster } from "$lib/components/ui/sonner/index.js";
    import { setupGlobalErrorHandler } from "$lib/errorHandler";
    import { onMount } from "svelte";

    let { children } = $props();

    onMount(() => {
        setupGlobalErrorHandler();
    });
</script>

<ModeWatcher />
<Toaster richColors />
{@render children?.()}
