<script lang="ts">
    import "../app.css";
    import { ModeWatcher } from "mode-watcher";
    import { Toaster } from "$lib/components/ui/sonner/index.js";
    import { onMount } from "svelte";

    let { children } = $props();
</script>

<ModeWatcher />
<Toaster richColors />
{@render children?.()}
