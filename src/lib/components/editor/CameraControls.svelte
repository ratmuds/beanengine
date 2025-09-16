<script lang="ts">
    let {
        camera = $bindable({ x: 0, y: 0, zoom: 1 }),
        isDragging = $bindable(false),
    } = $props();

    let lastMousePos = $state({ x: 0, y: 0 });

    function handleMouseDown(e: MouseEvent) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            // Middle mouse or Ctrl+left click
            isDragging = true;
            lastMousePos = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (isDragging) {
            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;

            camera.x += deltaX;
            camera.y += deltaY;

            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    }

    function handleMouseUp(e: MouseEvent) {
        if (e.button === 1 || e.button === 0) {
            isDragging = false;
        }
    }

    function handleWheel(e: WheelEvent) {
        if (e.ctrlKey) {
            e.preventDefault();
            const zoomFactor = 0.1;
            const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
            const newZoom = Math.max(0.25, Math.min(3, camera.zoom + delta));

            // Zoom towards mouse position
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomRatio = newZoom / camera.zoom;
            camera.x = mouseX - (mouseX - camera.x) * zoomRatio;
            camera.y = mouseY - (mouseY - camera.y) * zoomRatio;
            camera.zoom = newZoom;
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="h-full relative overflow-hidden"
    role="application"
    aria-label="Code editor canvas"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onwheel={handleWheel}
    style="cursor: {isDragging ? 'grabbing' : 'grab'}"
>
    <slot />
</div>
