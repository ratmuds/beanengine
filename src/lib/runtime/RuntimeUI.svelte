<script lang="ts">
    import { sceneStore } from "$lib/sceneStore";
    import * as Types from "$lib/types";
    import RuntimeUIElement from "$lib/runtime/RuntimeUIElement.svelte";
    import { runtimeStore } from "$lib/runtimeStore";
    import { GameObjectManager } from "$lib/runtime";

    // Live UI roots from runtime manager (scripts can modify during play)
    let uiRoots: any[] = [];
    let manager: GameObjectManager | null = null;
    function updateUIRoots() {
        manager = (runtimeStore as any).getGameObjectManager?.() || manager;
        if (manager && (manager as any).getUIRoots) {
            uiRoots = manager.getUIRoots();
        } else {
            uiRoots = [];
        }
    }

    function anchorToCssX(anchor: Types.BUI["positionXAnchor"]) {
        switch (anchor) {
            case "left":
                return "flex-start";
            case "center":
                return "center";
            case "right":
                return "flex-end";
        }
    }

    function anchorToCssY(anchor: Types.BUI["positionYAnchor"]) {
        switch (anchor) {
            case "top":
                return "flex-start";
            case "center":
                return "center";
            case "bottom":
                return "flex-end";
        }
    }

    function computeStyles(ui: Types.BUI): Record<string, string> {
        // Base size & position
        const posX = ui.positionPercent.x * 100;
        const posY = ui.positionPercent.y * 100;
        const offX = ui.positionOffset.x;
        const offY = ui.positionOffset.y;
        const sizeX = ui.sizePercent.x * 100;
        const sizeY = ui.sizePercent.y * 100;
        const sizeOffX = ui.sizeOffset.x;
        const sizeOffY = ui.sizeOffset.y;

        // If autoLayout, let browser handle flow; otherwise absolute position
        const style: Record<string, string> = ui.autoLayout
            ? {
                  position: "relative",
              }
            : {
                  position: "absolute",
                  left: `calc(${posX}% + ${offX}px)`,
                  top: `calc(${posY}% + ${offY}px)`,
              };

        // Sizing
        if (ui.autoLayout) {
            // allow content-driven sizing unless explicit size provided
            if (ui.sizePercent.x !== 0 || ui.sizeOffset.x !== 0)
                style.width = `calc(${sizeX}% + ${sizeOffX}px)`;
            if (ui.sizePercent.y !== 0 || ui.sizeOffset.y !== 0)
                style.height = `calc(${sizeY}% + ${sizeOffY}px)`;
        } else {
            style.width = `calc(${sizeX}% + ${sizeOffX}px)`;
            style.height = `calc(${sizeY}% + ${sizeOffY}px)`;
        }

        // Rotation
        if (ui.rotation) style.transform = `rotate(${ui.rotation}deg)`;

        // Z-order
        style["z-index"] = String(ui.zIndex ?? 0);

        // Padding & margin
        style.padding = `${ui.padding.y}px ${ui.padding.x}px`;
        style.margin = `${ui.margin.y}px ${ui.margin.x}px`;

        // Visibility
        style.display = ui.visible ? "block" : "none";

        // For containers add common styles
        if (ui instanceof Types.BContainerUI) {
            style["background-color"] = ui.backgroundColor;
            style["border"] = `${ui.borderSize}px solid ${ui.borderColor}`;
            style["border-radius"] = `${ui.borderRadius}px`;

            // Scrolling
            const scroll = ui.scroll;
            if (scroll === "both") style.overflow = "auto";
            else if (scroll === "horizontal") {
                style["overflow-x"] = "auto";
                style["overflow-y"] = "hidden";
            } else if (scroll === "vertical") {
                style["overflow-y"] = "auto";
                style["overflow-x"] = "hidden";
            } else style.overflow = "hidden";
        }

        // Text specifics
        if (ui instanceof Types.BTextUI) {
            style.color = ui.color;
            style["font-size"] = `${ui.fontSize}px`;
            style["font-family"] = ui.fontFamily;
            style["font-weight"] = `${ui.fontWeight}`;
            style["text-align"] = ui.textAlign;
            // Vertical alignment simulated via flex
            style.display = style.display === "none" ? "none" : "flex";
            style["align-items"] = anchorToCssY(ui.textVerticalAlign);
            style["justify-content"] = anchorToCssX(ui.textAlign as any);

            if (ui.overflow === "ellipsis") {
                style["white-space"] = "nowrap";
                style["overflow"] = "hidden";
                style["text-overflow"] = "ellipsis";
            } else if (ui.overflow === "wrap") {
                style["white-space"] = "normal";
                style["word-break"] = "break-word";
            } else {
                style["white-space"] = "pre";
            }
        }

        return style;
    }

    // Recursively render UI tree
    function getChildren(ui: Types.BObject) {
        return (ui.children || []).filter((c) =>
            ["ui", "container", "text", "button", "image"].includes(c.type)
        ) as Types.BUI[];
    }
    // Track overlay style to align with the renderer canvas
    import { onMount } from "svelte";
    let overlayStyle =
        "position: fixed; inset: 0; pointer-events: none; z-index: 1000;";
    // Trigger rerenders when runtime store updates (e.g., property overrides)
    let uiVersion = 0;

    function updateOverlayRect() {
        const el = (runtimeStore as any).inputState
            ?.canvasElement as HTMLCanvasElement | null;
        if (!el) {
            overlayStyle =
                "position: fixed; inset: 0; pointer-events: none; z-index: 1000;";
            return;
        }
        const rect = el.getBoundingClientRect();
        const left = Math.max(0, rect.left + window.scrollX);
        const top = Math.max(0, rect.top + window.scrollY);
        const width = Math.max(0, rect.width);
        const height = Math.max(0, rect.height);
        overlayStyle = `position: absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; pointer-events: none; z-index: 1000;`;
    }

    onMount(() => {
        updateOverlayRect();
        updateUIRoots();
        const unsub = runtimeStore.subscribe(() => {
            uiVersion += 1;
        });
        const onResize = () => updateOverlayRect();
        const onScroll = () => updateOverlayRect();
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, { passive: true });
        const interval = window.setInterval(() => {
            updateOverlayRect();
            updateUIRoots();
        }, 200);
        return () => {
            unsub?.();
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll);
            window.clearInterval(interval);
        };
    });
</script>

<svelte:window
    on:resize={() => {
        /* overlay recalculated in onMount listeners */
    }}
/>

<div class="runtime-ui-overlay" style={overlayStyle}>
    <!-- Render each root under UIStorage -->
    {#each uiRoots as root (root.id)}
        <RuntimeUIElement node={root} version={uiVersion} />
    {/each}
</div>

<style>
    .runtime-ui-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none; /* let canvas receive events by default */
        z-index: 1000;
    }
</style>
