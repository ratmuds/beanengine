<script lang="ts">
    import { onMount } from "svelte";
    import { createEventBlocks, createControlBlocks } from "$lib/scratchBlocks";

    let blocklyWorkspace = null;

    // Define a scratch-blocks toolbox (in XML format)
    const toolboxXml = `
<xml id="toolbox-simple" style="display: none">
  <category name="Motion" colour="#4C97FF" secondaryColour="#3373CC">
    <block type="motion_movesteps">
      <value name="STEPS">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="motion_turnright">
      <value name="DEGREES">
        <shadow type="math_number">
          <field name="NUM">15</field>
        </shadow>
      </value>
    </block>
    <block type="motion_turnleft">
      <value name="DEGREES">
        <shadow type="math_number">
          <field name="NUM">15</field>
        </shadow>
      </value>
    </block>
    <block type="motion_goto">
      <value name="TO">
        <shadow type="motion_goto_menu">
          <field name="TO">_random_</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="Events" colour="#FFD500" secondaryColour="#CCAA00">
    <block type="event_whenflagclicked"></block>
    <block type="event_whenkeypressed">
      <value name="KEY_OPTION">
        <shadow type="event_whenkeypressed_menu">
          <field name="KEY_OPTION">space</field>
        </shadow>
      </value>
    </block>
    <block type="event_when_button_clicked"></block>
    <block type="event_when_sensor_detects"></block>
  </category>
  <category name="Looks" colour="#9966FF" secondaryColour="#774DCB">
    <block type="looks_say">
      <value name="MESSAGE">
        <shadow type="text">
          <field name="TEXT">Hello!</field>
        </shadow>
      </value>
    </block>
    <block type="looks_sayforsecs">
      <value name="MESSAGE">
        <shadow type="text">
          <field name="TEXT">Hello!</field>
        </shadow>
      </value>
      <value name="SECS">
        <shadow type="math_number">
          <field name="NUM">2</field>
        </shadow>
      </value>
    </block>
    <block type="looks_think">
      <value name="MESSAGE">
        <shadow type="text">
          <field name="TEXT">Hmm...</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="Game Objects" colour="#FF6680" secondaryColour="#CC5566">
    <block type="game_getObjectByName"></block>
    <block type="game_setProperty"></block>
    <block type="game_getProperty"></block>
  </category>
  <category name="Control" colour="#FFAB19" secondaryColour="#CF8B17">
    <block type="control_wait">
      <value name="DURATION">
        <shadow type="math_positive_number">
          <field name="NUM">1</field>
        </shadow>
      </value>
    </block>
    <block type="control_repeat">
      <value name="TIMES">
        <shadow type="math_whole_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="control_forever"></block>
  </category>
</xml>
`;

    function initializeBlockly() {
        if (
            typeof window !== "undefined" &&
            window.Blockly &&
            !blocklyWorkspace
        ) {
            try {
                // A map of object types to their available properties
                const objectProperties = {
                    Player: [
                        ["x position", "X"],
                        ["y position", "Y"],
                        ["health", "HEALTH"],
                        ["speed", "SPEED"],
                    ],
                    Enemy: [
                        ["x position", "X"],
                        ["y position", "Y"],
                        ["speed", "SPEED"],
                        ["damage", "DAMAGE"],
                    ],
                    Bullet: [
                        ["x position", "X"],
                        ["y position", "Y"],
                        ["velocity", "VELOCITY"],
                        ["damage", "DAMAGE"],
                    ],
                    default: [["(select property)", "NONE"]],
                };

                // Mock game objects data for demo
                const gameObjects = {
                    player1: "Player",
                    enemy1: "Enemy",
                    enemy2: "Enemy",
                    bullet1: "Bullet",
                    bullet2: "Bullet",
                };

                // Helper function to get object type from name
                function getObjectTypeFromName(objectName) {
                    return gameObjects[objectName] || "default";
                }

                // Add missing scratch-blocks block definitions

                // Math number block
                if (!window.Blockly.Blocks["math_number"]) {
                    window.Blockly.Blocks["math_number"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_number",
                                        name: "NUM",
                                        value: 0,
                                    },
                                ],
                                output: "Number",
                                colour: "#59C059",
                                tooltip: "A number",
                            });
                        },
                    };
                }

                // Motion move steps block
                if (!window.Blockly.Blocks["motion_movesteps"]) {
                    window.Blockly.Blocks["motion_movesteps"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "move %1 steps",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "STEPS",
                                        check: "Number",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#4C97FF",
                                tooltip:
                                    "Move the sprite forward by the specified number of steps",
                            });
                        },
                    };
                }

                // Motion turn right block
                if (!window.Blockly.Blocks["motion_turnright"]) {
                    window.Blockly.Blocks["motion_turnright"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "turn right %1 degrees",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "DEGREES",
                                        check: "Number",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#4C97FF",
                                tooltip:
                                    "Turn the sprite clockwise by the specified degrees",
                            });
                        },
                    };
                }

                // Motion turn left block
                if (!window.Blockly.Blocks["motion_turnleft"]) {
                    window.Blockly.Blocks["motion_turnleft"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "turn left %1 degrees",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "DEGREES",
                                        check: "Number",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#4C97FF",
                                tooltip:
                                    "Turn the sprite counter-clockwise by the specified degrees",
                            });
                        },
                    };
                }

                // Motion goto menu block
                if (!window.Blockly.Blocks["motion_goto_menu"]) {
                    window.Blockly.Blocks["motion_goto_menu"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_dropdown",
                                        name: "TO",
                                        options: [
                                            ["random position", "_random_"],
                                            ["mouse-pointer", "_mouse_"],
                                            ["player", "Player"],
                                            ["enemy", "Enemy"],
                                        ],
                                    },
                                ],
                                output: "String",
                                colour: "#4C97FF",
                                tooltip: "Choose a destination",
                            });
                        },
                    };
                }

                // Motion goto block
                if (!window.Blockly.Blocks["motion_goto"]) {
                    window.Blockly.Blocks["motion_goto"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "go to %1",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "TO",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#4C97FF",
                                tooltip:
                                    "Move the sprite to the specified location",
                            });
                        },
                    };
                }

                // Text block
                if (!window.Blockly.Blocks["text"]) {
                    window.Blockly.Blocks["text"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_input",
                                        name: "TEXT",
                                        text: "",
                                    },
                                ],
                                output: "String",
                                colour: "#59C059",
                                tooltip: "A text string",
                            });
                        },
                    };
                }

                // Create event blocks using our new system
                createEventBlocks();

                // Looks blocks
                if (!window.Blockly.Blocks["looks_say"]) {
                    window.Blockly.Blocks["looks_say"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "say %1",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "MESSAGE",
                                        check: "String",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#9966FF",
                                tooltip: "Display a message",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["looks_sayforsecs"]) {
                    window.Blockly.Blocks["looks_sayforsecs"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "say %1 for %2 seconds",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "MESSAGE",
                                        check: "String",
                                    },
                                    {
                                        type: "input_value",
                                        name: "SECS",
                                        check: "Number",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#9966FF",
                                tooltip:
                                    "Display a message for a specified time",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["looks_think"]) {
                    window.Blockly.Blocks["looks_think"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "think %1",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "MESSAGE",
                                        check: "String",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#9966FF",
                                tooltip: "Display a thought bubble",
                            });
                        },
                    };
                }

                // Create control blocks using our new system
                createControlBlocks();

                // Custom game object getter block
                window.Blockly.Blocks["game_getObjectByName"] = {
                    init: function () {
                        this.jsonInit({
                            message0: "get object named %1",
                            args0: [
                                {
                                    type: "field_dropdown",
                                    name: "NAME",
                                    options: [
                                        ["player1", "player1"],
                                        ["enemy1", "enemy1"],
                                        ["enemy2", "enemy2"],
                                        ["bullet1", "bullet1"],
                                        ["bullet2", "bullet2"],
                                    ],
                                },
                            ],
                            output: "GameObject",
                            colour: "#FF6680",
                            tooltip:
                                "Finds the game object with the given name.",
                            outputShape: window.Blockly.OUTPUT_SHAPE_ROUND,
                        });
                    },

                    // Method to get the object type for context-aware blocks
                    getObjectType: function () {
                        const objectName = this.getFieldValue("NAME");
                        return getObjectTypeFromName(objectName);
                    },
                };

                // Generic property setter block
                window.Blockly.Blocks["game_setProperty"] = {
                    init: function () {
                        this.jsonInit({
                            message0: "set %1 's %2 to %3",
                            args0: [
                                {
                                    type: "input_value",
                                    name: "OBJECT",
                                    check: "GameObject",
                                },
                                {
                                    type: "field_dropdown",
                                    name: "PROPERTY",
                                    options: objectProperties["default"],
                                },
                                {
                                    type: "input_value",
                                    name: "VALUE",
                                },
                            ],
                            previousStatement: null,
                            nextStatement: null,
                            colour: "#59C059",
                            tooltip: "Sets a property of a game object.",
                        });
                    },
                };

                // Generic property getter block
                window.Blockly.Blocks["game_getProperty"] = {
                    init: function () {
                        this.jsonInit({
                            message0: "%1 's %2",
                            args0: [
                                {
                                    type: "input_value",
                                    name: "OBJECT",
                                    check: "GameObject",
                                },
                                {
                                    type: "field_dropdown",
                                    name: "PROPERTY",
                                    options: objectProperties["default"],
                                },
                            ],
                            output: null,
                            colour: "#59C059",
                            tooltip:
                                "Gets a property value from a game object.",
                        });
                    },
                };

                blocklyWorkspace = window.Blockly.inject("blocklyDiv", {
                    // Point to the scratch-blocks media assets
                    media: "./node_modules/scratch-blocks/media/",
                    toolbox: toolboxXml,
                    zoom: {
                        controls: true,
                        startScale: 0.9,
                        maxScale: 3,
                        minScale: 0.3,
                    },
                    sounds: true,
                });

                // Add context-aware property dropdown updates
                blocklyWorkspace.addChangeListener(function (event) {
                    // We only care when blocks are moved/connected
                    if (
                        event.type !== window.Blockly.Events.MOVE &&
                        event.type !== window.Blockly.Events.CHANGE
                    ) {
                        return;
                    }

                    // Helper function to get all blocks of a specific type
                    function getAllBlocksOfType(workspace, blockType) {
                        const blocks = [];
                        const allBlocks = workspace.getAllBlocks();
                        for (let i = 0; i < allBlocks.length; i++) {
                            if (allBlocks[i].type === blockType) {
                                blocks.push(allBlocks[i]);
                            }
                        }
                        return blocks;
                    }

                    // Update property dropdowns when objects are connected
                    function updatePropertyDropdowns(blockType) {
                        const blocks = getAllBlocksOfType(
                            blocklyWorkspace,
                            blockType
                        );
                        blocks.forEach((block) => {
                            const propertyDropdown = block.getField("PROPERTY");
                            const objectInput = block.getInput("OBJECT");

                            if (
                                propertyDropdown &&
                                objectInput &&
                                objectInput.connection
                            ) {
                                const connectedBlock =
                                    objectInput.connection.targetBlock();
                                let properties = objectProperties["default"];

                                if (
                                    connectedBlock &&
                                    connectedBlock.type ===
                                        "game_getObjectByName"
                                ) {
                                    const objectType =
                                        connectedBlock.getObjectType();
                                    if (objectProperties[objectType]) {
                                        properties =
                                            objectProperties[objectType];
                                    }
                                }

                                // Update the dropdown options
                                const currentValue =
                                    propertyDropdown.getValue();
                                propertyDropdown.menuGenerator_ = properties;

                                // Reset to first option if current value is no longer valid
                                const hasValue = properties.some(
                                    (prop) => prop[1] === currentValue
                                );
                                if (!hasValue) {
                                    propertyDropdown.setValue(properties[0][1]);
                                }
                            }
                        });
                    }

                    // Update both setter and getter blocks
                    updatePropertyDropdowns("game_setProperty");
                    updatePropertyDropdowns("game_getProperty");
                });

                // Resize workspace when window resizes
                window.addEventListener("resize", () => {
                    if (blocklyWorkspace) {
                        window.Blockly.svgResize(blocklyWorkspace);
                    }
                });

                console.log(
                    "Scratch-blocks workspace initialized successfully"
                );
            } catch (error) {
                console.error("Error initializing Blockly:", error);
            }
        }
    }

    onMount(() => {
        setTimeout(initializeBlockly, 100);
    });
</script>

<!-- Blockly Workspace -->
<div class="flex-1 relative">
    <div id="blocklyDiv" class="absolute inset-0"></div>
</div>

<style>
    /* Clean modern dark theme for scratch-blocks */

    /* Main workspace and background */
    :global(.blocklyMainBackground) {
        fill: #0f172a !important;
    }

    /* Grid pattern */
    :global(#blocklyGridPattern8195634415750042 line) {
        stroke: #334155 !important;
        stroke-width: 1 !important;
        opacity: 0.3 !important;
    }

    /* Toolbox and flyout styling */
    :global(.blocklyToolboxDiv) {
        background-color: #1e293b !important;
        border-right: 1px solid #334155 !important;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3) !important;
    }

    :global(.scratchCategoryMenu) {
        background-color: #1e293b !important;
    }

    :global(.scratchCategoryMenuItem) {
        border-radius: 8px !important;
        transition: background-color 0.2s ease !important;
    }

    :global(.scratchCategoryMenuItem:hover) {
        background-color: #334155 !important;
    }

    :global(.scratchCategoryMenuItem.categorySelected) {
        background-color: #1e40af !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    :global(.scratchCategoryMenuItemLabel) {
        color: #e2e8f0 !important;
        font-weight: 500 !important;
        font-size: 14px !important;
    }

    :global(.scratchCategoryItemBubble) {
        border-radius: 50% !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    /* Flyout panel */
    :global(.blocklyFlyout) {
        fill: #1e293b !important;
        filter: drop-shadow(2px 0 8px rgba(0, 0, 0, 0.3)) !important;
    }

    :global(.blocklyFlyoutBackground) {
        fill: #1e293b !important;
        stroke: #334155 !important;
        stroke-width: 1 !important;
    }

    :global(.blocklyFlyoutLabel) {
        font-weight: 600 !important;
        font-size: 16px !important;
    }

    :global(.blocklyFlyoutLabelBackground) {
        fill: #334155 !important;
        stroke: #475569 !important;
        stroke-width: 1 !important;
    }

    :global(.blocklyFlyoutLabelText) {
        fill: #e2e8f0 !important;
        font-weight: 600 !important;
    }

    /* Block text and interactions */
    :global(.blocklyText) {
        font-family: "Inter", "Segoe UI", sans-serif !important;
        font-weight: 500 !important;
        font-size: 13px !important;
        color: white !important;
    }

    :global(.blocklyNonEditableText > text) {
        fill: #ffffff !important;
    }

    :global(.blocklyEditableText > text) {
        fill: #ffffff !important;
        font-weight: 500 !important;
    }

    :global(.blocklyDropdownText) {
        fill: #ffffff !important;
        font-weight: 500 !important;
    }

    :global(.blocklyBlockBackground[fill="#50ad50"]) {
        fill: #334155 !important;
        stroke: #334155 !important;
        stroke-width: 1 !important;
    }

    /* Block styling enhancements - removed transform hover effects */
    :global(.blocklyDraggable) {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)) !important;
        transition: filter 0.2s ease !important;
    }

    :global(.blocklyDraggable:hover) {
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) !important;
    }

    :global(.blocklySelected > .blocklyPath) {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.7)) !important;
    }

    /* Scrollbars */
    :global(.blocklyScrollbarBackground) {
        fill: #334155 !important;
        stroke: #475569 !important;
        stroke-width: 1 !important;
    }

    :global(.blocklyScrollbarHandle) {
        fill: #64748b !important;
        border-radius: 4px !important;
        transition: fill 0.2s ease !important;
    }

    :global(.blocklyScrollbarHandle:hover) {
        fill: #94a3b8 !important;
    }

    /* Zoom controls */
    :global(.blocklyZoom) {
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3)) !important;
    }

    :global(.blocklyZoom image) {
        transition: opacity 0.2s ease !important;
        filter: invert(1) !important;
        opacity: 0.8 !important;
    }

    :global(.blocklyZoom image:hover) {
        opacity: 1 !important;
    }

    /* Dropdown menus */
    :global(.blocklyDropDownDiv) {
        background-color: #334155 !important;
        border: 1px solid #475569 !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
        color: #e2e8f0 !important;
    }

    :global(.blocklyDropDownDiv .blocklyMenuItem) {
        color: #e2e8f0 !important;
        padding: 8px 12px !important;
        border-radius: 4px !important;
        margin: 4px !important;
        transition: background-color 0.2s ease !important;
    }

    :global(.blocklyDropDownDiv .blocklyMenuItem:hover) {
        background-color: #475569 !important;
        color: #f8fafc !important;
    }

    :global(.blocklyDropDownDiv .blocklyMenuItem:focus) {
        background-color: #1e40af !important;
        outline: none !important;
    }

    /* Input widgets */
    :global(.blocklyWidgetDiv) {
        background-color: #334155 !important;
        border: 1px solid #475569 !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        color: #e2e8f0 !important;
    }

    :global(.blocklyHtmlInput) {
        background-color: #475569 !important;
        color: #e2e8f0 !important;
        border: 1px solid #64748b !important;
        border-radius: 4px !important;
        padding: 6px 8px !important;
        font-family: "Inter", "Segoe UI", sans-serif !important;
        font-size: 13px !important;
        transition: border-color 0.2s ease !important;
    }

    :global(.blocklyHtmlInput:focus) {
        border-color: #3b82f6 !important;
        outline: none !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
    }

    /* Insertion markers */
    :global(.blocklyInsertionMarker > .blocklyPath) {
        fill: #3b82f6 !important;
        fill-opacity: 0.4 !important;
        stroke: #3b82f6 !important;
        stroke-width: 2 !important;
    }

    /* Custom animations for smooth interactions */
    :global(.blocklyDragging) {
        filter: drop-shadow(0 8px 25px rgba(0, 0, 0, 0.5)) !important;
    }

    /* Improve block category colors for dark mode */
    :global(.blocklyPath[fill="#4C97FF"]) {
        fill: #3b82f6 !important;
    }

    :global(.blocklyPath[stroke="#3373CC"]) {
        stroke: #1d4ed8 !important;
    }

    :global(.blocklyPath[fill="#FFD500"]) {
        fill: #f59e0b !important;
    }

    :global(.blocklyPath[stroke="#CCAA00"]) {
        stroke: #d97706 !important;
    }

    :global(.blocklyPath[fill="#9966FF"]) {
        fill: #8b5cf6 !important;
    }

    :global(.blocklyPath[stroke="#774DCB"]) {
        stroke: #7c3aed !important;
    }

    :global(.blocklyPath[fill="#FF6680"]) {
        fill: #ef4444 !important;
    }

    :global(.blocklyPath[stroke="#cc5266"]) {
        stroke: #dc2626 !important;
    }

    :global(.blocklyPath[fill="#59C059"]) {
        fill: #22c55e !important;
    }

    :global(.blocklyPath[stroke="#479a47"]) {
        stroke: #16a34a !important;
    }
</style>
