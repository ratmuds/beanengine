<script lang="ts">
    import * as Types from "$lib/types";
    import { runtimeStore } from "$lib/runtimeStore";
    import type { GameObject } from "$lib/runtime";
    import RuntimeUIElement from "$lib/runtime/RuntimeUIElement.svelte";
    let { node, version = 0 } = $props();

    // Helper to read runtime override for a given bObject id
    function ov<T>(key: string, fallback: T): T {
        const id = node?.bObject?.id as string;
        const v = (runtimeStore as any).getPropertyOverride?.(id, key) as
            | T
            | undefined;
        return v === undefined ? fallback : v;
    }

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

        const rotation = ov<number | undefined>("rotation", ui.rotation);
        if (rotation) style.transform = `rotate(${rotation}deg)`;
        style["z-index"] = String(
            ov<number | undefined>("zIndex", ui.zIndex) ?? 0
        );
        const pad = ov<{ x: number; y: number }>("padding", ui.padding);
        const mar = ov<{ x: number; y: number }>("margin", ui.margin);
        style.padding = `${pad.y}px ${pad.x}px`;
        style.margin = `${mar.y}px ${mar.x}px`;
        const vis = ov<boolean>("visible", ui.visible);
        style.display = vis ? "block" : "none";

        if (ui instanceof Types.BContainerUI) {
            const bg = ov<string>("backgroundColor", ui.backgroundColor);
            const borderColor = ov<string>("borderColor", ui.borderColor);
            const borderSize = ov<number>("borderSize", ui.borderSize);
            const radius = ov<number>("borderRadius", ui.borderRadius);
            style["background-color"] = bg;
            style["border"] = `${borderSize}px solid ${borderColor}`;
            style["border-radius"] = `${radius}px`;
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
            style.color = ov<string>("color", ui.color);
            style["font-size"] = `${ov<number>("fontSize", ui.fontSize)}px`;
            style["font-family"] = ov<string>("fontFamily", ui.fontFamily);
            style["font-weight"] = `${ov<number>("fontWeight", ui.fontWeight)}`;
            style["text-align"] = ov<any>("textAlign", ui.textAlign);
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
    let styles = $state(styleString(computeStyles(b())));
    let children = $derived(getChildren(node));
    $effect(() => {
        void version;
        styles = styleString(computeStyles(b()));
    });
    // No transitions for now
</script>

{#if b().type === "button"}
    <button class="ui-absolute button-reset" style={styles}>
        {#if b() instanceof Types.BTextUI}
            {ov<string>("text", (b() as Types.BTextUI).text)}
        {:else}
            {ov<string>("name", b().name)}
        {/if}
        {#each children as c (c.id)}
            <RuntimeUIElement node={c} {version} />
        {/each}
    </button>
{:else}
    <div class="ui-absolute" style={styles}>
        {#if b() instanceof Types.BTextUI}
            {ov<string>("text", (b() as Types.BTextUI).text)}
        {/if}
        {#each children as c (c.id)}
            <RuntimeUIElement node={c} {version} />
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
