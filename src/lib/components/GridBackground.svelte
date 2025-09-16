<script lang="ts">
    let { camera } = $props();
</script>

<div
    class="absolute inset-0"
    style="background-image: radial-gradient(circle, #444 1.5px, transparent 1.5px); background-size: {40 *
        camera.zoom}px {40 *
        camera.zoom}px; opacity: 0.4; transform: translate({camera.x}px, {camera.y}px);"
></div>
