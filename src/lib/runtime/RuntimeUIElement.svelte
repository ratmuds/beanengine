<script lang="ts">
    import * as Types from "$lib/types";
    import type { GameObject } from "$lib/runtime";
    let { node } = $props();

    // Compute base inline styles for the UI node
    function computeStyles(ui: Types.BUI): Record<string, string> {
        const posX = ui.positionPercent.x * 100;
        const posY = ui.positionPercent.y * 100;
        const offX = ui.positionOffset.x;
        const offY = ui.positionOffset.y;
        const sizeX = ui.sizePercent.x * 100;
        const sizeY = ui.sizePercent.y * 100;
        const sizeOffX = ui.sizeOffset.x;
        const sizeOffY = ui.sizeOffset.y;

        const style: Record<string, string> = ui.autoLayout
            ? { position: "relative" }
            : {
                  position: "absolute",
                  left: `calc(${posX}% + ${offX}px)`,
                  top: `calc(${posY}% + ${offY}px)`,
              };

        if (ui.autoLayout) {
            if (ui.sizePercent.x !== 0 || ui.sizeOffset.x !== 0)
                style.width = `calc(${sizeX}% + ${sizeOffX}px)`;
            if (ui.sizePercent.y !== 0 || ui.sizeOffset.y !== 0)
                style.height = `calc(${sizeY}% + ${sizeOffY}px)`;
        } else {
            style.width = `calc(${sizeX}% + ${sizeOffX}px)`;
            style.height = `calc(${sizeY}% + ${sizeOffY}px)`;
        }

        if (ui.rotation) style.transform = `rotate(${ui.rotation}deg)`;
        style["z-index"] = String(ui.zIndex ?? 0);
        style.padding = `${ui.padding.y}px ${ui.padding.x}px`;
        style.margin = `${ui.margin.y}px ${ui.margin.x}px`;
        style.display = ui.visible ? "block" : "none";

        if (ui instanceof Types.BContainerUI) {
            style["background-color"] = ui.backgroundColor;
            style["border"] = `${ui.borderSize}px solid ${ui.borderColor}`;
            style["border-radius"] = `${ui.borderRadius}px`;
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

        if (ui instanceof Types.BTextUI) {
            style.color = ui.color;
            style["font-size"] = `${ui.fontSize}px`;
            style["font-family"] = ui.fontFamily;
            style["font-weight"] = `${ui.fontWeight}`;
            style["text-align"] = ui.textAlign;
        }

        return style;
    }

    // Children filter
    function getChildren(go: GameObject) {
        return go.getChildren().filter((c) => c.bObject instanceof Types.BUI);
    }

    function styleString(styles: Record<string, string>): string {
        return Object.entries(styles)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
    }
    const b = () => node?.bObject as Types.BUI;
    let styles = $derived(styleString(computeStyles(b())));
    let children = $derived(getChildren(node));
    // No transitions for now
</script>

{#if b().type === "button"}
    <button class="ui-absolute button-reset" style={styles}>
        {b() instanceof Types.BTextUI ? (b() as Types.BTextUI).text : b().name}
        {#each children as c (c.id)}
            <svelte:self node={c} />
        {/each}
    </button>
{:else}
    <div class="ui-absolute" style={styles}>
        {b() instanceof Types.BTextUI ? (b() as Types.BTextUI).text : null}
        {#each children as c (c.id)}
            <svelte:self node={c} />
        {/each}
    </div>
{/if}

<style>
    .ui-absolute {
        pointer-events: auto;
    }
    .button-reset {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    :global(.runtime-ui-overlay) {
        pointer-events: none;
    }
    :global(.runtime-ui-overlay .ui-absolute) {
        pointer-events: auto;
    }
</style>
