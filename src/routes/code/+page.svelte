<script>
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";

    let codeBlocks = [
        {
            id: 1,
            type: "function",
            name: "calculateTotal",
            args: ["price", "tax"],
            color: "#7aa2f7",
            x: 50,
            y: 50,
        },
        {
            id: 2,
            type: "variable",
            name: "userEmail",
            value: "user@example.com",
            color: "#9ece6a",
            x: 50,
            y: 120,
        },
        {
            id: 3,
            type: "condition",
            name: "if user.isActive",
            nested: [
                {
                    id: 31,
                    type: "function",
                    name: "sendWelcomeEmail",
                    args: ["user"],
                },
                {
                    id: 32,
                    type: "variable",
                    name: "lastLogin",
                    value: "Date.now()",
                },
            ],
            color: "#f7768e",
            x: 50,
            y: 190,
        },
        {
            id: 4,
            type: "loop",
            name: "for item in cart",
            nested: [
                {
                    id: 41,
                    type: "function",
                    name: "addToTotal",
                    args: ["item.price"],
                },
            ],
            color: "#e0af68",
            x: 350,
            y: 50,
        },
        {
            id: 5,
            type: "return",
            name: "return total",
            color: "#bb9af7",
            x: 350,
            y: 120,
        },
    ];

    let insertionPoints = [];
    let hoveredInsertion = null;

    const flipDurationMs = 200;

    function handleDndConsider(e) {
        codeBlocks = e.detail.items;
    }

    function handleDndFinalize(e) {
        codeBlocks = e.detail.items;
    }

    function handleMouseMove(e) {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find nearby blocks to show insertion points
        let nearbyBlocks = codeBlocks.filter((block) => {
            const blockCenterY = block.y + 30; // approximate block height/2
            return (
                Math.abs(y - blockCenterY) < 20 && Math.abs(x - block.x) < 300
            );
        });

        if (nearbyBlocks.length > 0) {
            hoveredInsertion = { x, y };
        } else {
            hoveredInsertion = null;
        }
    }
</script>

<div class="editor-container">
    <div class="editor-header">
        <h1 class="editor-title">Visual Code Editor</h1>
        <div class="editor-actions">
            <button class="action-btn">⚙️</button>
            <button class="action-btn">▶️</button>
        </div>
    </div>

    <div class="editor-body">
        <div class="code-grid">
            <div class="line-numbers">
                {#each codeBlocks as _, index}
                    <div class="line-number">{index + 1}</div>
                {/each}
            </div>

            <section
                class="code-blocks-area"
                use:dndzone={{ 
                    items: codeBlocks, 
                    flipDurationMs,
                    dropTargetStyle: { "outline": "2px solid #3b82f6", "outline-offset": "2px" }
                }}
                on:consider={handleDndConsider}
                on:finalize={handleDndFinalize}
            >
                {#each codeBlocks as block (block.id)}
                    <div
                        class="code-block {block.type}"
                        style="--accent-color: {block.color}"
                        animate:flip={{ duration: flipDurationMs }}
                    >
                        <div class="block-header">
                            <span class="block-type"
                                >{block.type.toUpperCase()}</span
                            >
                            <div class="block-actions">
                                <button class="block-action">⋮</button>
                                <button class="block-action">×</button>
                            </div>
                        </div>

                        <div class="block-content">
                            {#if block.type === "function"}
                                <input class="block-input" value={block.name} />
                                <span class="syntax">(</span>
                                {#each block.args as arg, i}
                                    <input class="arg-input" value={arg} />
                                    {#if i < block.args.length - 1}<span
                                            class="syntax"
                                            >,
                                        </span>{/if}
                                {/each}
                                <span class="syntax">)</span>
                            {:else if block.type === "variable"}
                                <input class="block-input" value={block.name} />
                                <span class="syntax"> = </span>
                                <input
                                    class="value-input"
                                    value={block.value}
                                />
                            {:else if block.type === "condition"}
                                <input class="block-input" value={block.name} />
                                <span class="syntax">:</span>
                            {:else if block.type === "loop"}
                                <input class="block-input" value={block.name} />
                                <span class="syntax">:</span>
                            {:else if block.type === "return"}
                                <input class="block-input" value={block.name} />
                            {/if}
                        </div>

                        {#if block.nested}
                            <div class="nested-blocks">
                                {#each block.nested as nestedBlock}
                                    <div
                                        class="code-block nested {nestedBlock.type}"
                                    >
                                        <div class="block-content">
                                            {#if nestedBlock.type === "function"}
                                                <input
                                                    class="block-input small"
                                                    value={nestedBlock.name}
                                                />
                                                <span class="syntax">(</span>
                                                {#each nestedBlock.args as arg, i}
                                                    <input
                                                        class="arg-input small"
                                                        value={arg}
                                                    />
                                                    {#if i < nestedBlock.args.length - 1}<span
                                                            class="syntax"
                                                            >,
                                                        </span>{/if}
                                                {/each}
                                                <span class="syntax">)</span>
                                            {:else}
                                                <input
                                                    class="block-input small"
                                                    value={nestedBlock.name}
                                                />
                                                {#if nestedBlock.value}
                                                    <span class="syntax">
                                                        =
                                                    </span>
                                                    <input
                                                        class="value-input small"
                                                        value={nestedBlock.value}
                                                    />
                                                {/if}
                                            {/if}
                                        </div>
                                    </div>
                                {/each}

                                <button class="add-nested-block">
                                    <span class="add-icon">+</span>
                                    <span>Add block</span>
                                </button>
                            </div>
                        {/if}
                    </div>
                {/each}

                <button class="add-block">
                    <span class="add-icon">+</span>
                    <span>Add new block</span>
                </button>
            </section>
        </div>
    </div>
</div>

<style>
    .editor-container {
        background: #1a1b26;
        color: #c0caf5;
        font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
            "Courier New", monospace;
        font-size: 13px;
        line-height: 1.5;
        overflow: hidden;
        max-width: 800px;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .editor-header {
        background: #1f2335;
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #3b4261;
        position: relative;
        overflow: hidden;
    }

    .editor-header::before {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100px;
        background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            rgba(122, 162, 247, 0.1) 2px,
            rgba(122, 162, 247, 0.1) 4px
        );
    }

    .editor-title {
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        letter-spacing: 0.5px;
    }

    .editor-actions {
        display: flex;
        gap: 8px;
        position: relative;
        z-index: 1;
    }

    .action-btn {
        width: 32px;
        height: 32px;
        background: rgba(26, 27, 38, 0.8);
        border: 1px solid #3b4261;
        color: #c0caf5;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .action-btn:hover {
        background: rgba(122, 162, 247, 0.2);
        border-color: #7aa2f7;
    }

    .editor-body {
        padding: 24px;
        background: #24283b;
    }

    .code-grid {
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 16px;
    }

    .line-numbers {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .line-number {
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #565f89;
        font-size: 11px;
    }

    .code-blocks-area {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .code-block {
        background: #292e42;
        border-left: 3px solid var(--accent-color);
        padding: 12px 16px;
        cursor: move;
        transition: all 0.2s ease;
        position: relative;
        min-height: 40px;
    }

    .code-block:hover {
        background: #2e3348;
        transform: translateX(2px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .code-block.nested {
        margin-left: 24px;
        margin-top: 8px;
        background: #1f2335;
        border-left-width: 2px;
    }

    .code-block.nested:hover {
        background: #252a3f;
    }

    .block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .block-type {
        font-size: 11px;
        color: #565f89;
        letter-spacing: 0.5px;
        font-weight: 500;
    }

    .block-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .code-block:hover .block-actions {
        opacity: 1;
    }

    .block-action {
        width: 20px;
        height: 20px;
        background: rgba(26, 27, 38, 0.8);
        border: 1px solid #3b4261;
        color: #a9b1d6;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        transition: all 0.2s ease;
    }

    .block-action:hover {
        background: rgba(122, 162, 247, 0.2);
        border-color: #7aa2f7;
    }

    .block-content {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
    }

    .block-input {
        background: #1a1b26;
        border: 1px solid #3b4261;
        padding: 4px 8px;
        color: #c0caf5;
        font-family: inherit;
        font-size: inherit;
        min-width: 120px;
        transition: all 0.2s ease;
    }

    .block-input:focus {
        outline: none;
        border-color: #7aa2f7;
        box-shadow: 0 0 0 2px rgba(122, 162, 247, 0.2);
    }

    .block-input.small {
        min-width: 100px;
        font-size: 12px;
        padding: 3px 6px;
    }

    .arg-input,
    .value-input {
        background: #1a1b26;
        border: 1px solid #3b4261;
        padding: 2px 6px;
        color: #9ece6a;
        font-family: inherit;
        font-size: inherit;
        min-width: 60px;
        transition: all 0.2s ease;
    }

    .value-input {
        color: #bb9af7;
    }

    .arg-input.small,
    .value-input.small {
        font-size: 12px;
        padding: 2px 4px;
        min-width: 50px;
    }

    .arg-input:focus,
    .value-input:focus {
        outline: none;
        border-color: #7aa2f7;
        box-shadow: 0 0 0 2px rgba(122, 162, 247, 0.2);
    }

    .syntax {
        color: #a9b1d6;
        font-weight: 500;
    }

    .nested-blocks {
        margin-top: 12px;
        padding-left: 8px;
        border-left: 1px solid #3b4261;
    }

    .add-block,
    .add-nested-block {
        background: transparent;
        border: 2px dashed #3b4261;
        padding: 12px;
        color: #565f89;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
        font-size: 12px;
        transition: all 0.2s ease;
        margin-top: 8px;
    }

    .add-nested-block {
        margin-left: 24px;
        padding: 8px;
        font-size: 11px;
    }

    .add-block:hover,
    .add-nested-block:hover {
        border-color: #7aa2f7;
        color: #7aa2f7;
        background: rgba(122, 162, 247, 0.05);
    }

    .add-icon {
        font-size: 14px;
        font-weight: bold;
    }

    .function {
        --accent-color: #7aa2f7;
    }
    .variable {
        --accent-color: #9ece6a;
    }
    .condition {
        --accent-color: #f7768e;
    }
    .loop {
        --accent-color: #e0af68;
    }
    .return {
        --accent-color: #bb9af7;
    }
</style>
