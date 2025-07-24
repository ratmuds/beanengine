<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
    } from "$lib/components/ui/card";
    import {
        ResizablePaneGroup,
        ResizablePane,
        ResizableHandle,
    } from "$lib/components/ui/resizable";
    import { Separator } from "$lib/components/ui/separator";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import {
        Tabs,
        TabsList,
        TabsTrigger,
        TabsContent,
    } from "$lib/components/ui/tabs";
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuCheckboxItem,
        DropdownMenuTrigger,
        DropdownMenuSeparator,
    } from "$lib/components/ui/dropdown-menu";
    import {
        Play,
        Square,
        Pause,
        RotateCcw,
        Move,
        RotateCw,
        Scale,
        Folder,
        FolderOpen,
        Box,
        Camera,
        Lightbulb,
        Settings,
        Eye,
        EyeOff,
        Lock,
        Unlock,
        MoreHorizontal,
        X,
        Code2,
        Monitor,
        Palette,
        Package,
        FileImage,
        Music,
        Gamepad2,
        Clapperboard,
        Plus,
    } from "lucide-svelte";

    import { Canvas } from "@threlte/core";
    import Scene from "$lib/components/ViewportScene.svelte";
    import * as Types from "$lib/types";

    // Mock data for object explorer
    const sceneObjects = [
        { name: "Main Camera", type: "camera", expanded: false, depth: 0 },
        { name: "Directional Light", type: "light", expanded: false, depth: 0 },
        { name: "Player", type: "object", expanded: true, depth: 0 },
        { name: "PlayerModel", type: "mesh", expanded: false, depth: 1 },
        { name: "PlayerController", type: "script", expanded: false, depth: 1 },
        { name: "Environment", type: "folder", expanded: true, depth: 0 },
        { name: "Ground", type: "mesh", expanded: false, depth: 1 },
        { name: "Buildings", type: "folder", expanded: false, depth: 1 },
        { name: "Trees", type: "folder", expanded: false, depth: 1 },
    ];

    // Mock properties
    const selectedObjectProps = {
        name: "Player",
        transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
        components: [
            "Transform",
            "MeshRenderer",
            "PlayerController",
            "Rigidbody",
        ],
    };

    // Tab management state
    interface TabInfo {
        id: string;
        label: string;
        icon: any;
        closeable: boolean;
        visible: boolean;
    }

    const availableTabs: TabInfo[] = [
        {
            id: "viewport",
            label: "Viewport",
            icon: Monitor,
            closeable: false,
            visible: true,
        },
        {
            id: "script",
            label: "Script",
            icon: Code2,
            closeable: true,
            visible: true,
        },
        {
            id: "materials",
            label: "Materials",
            icon: Palette,
            closeable: true,
            visible: false,
        },
        {
            id: "assets",
            label: "Assets",
            icon: Package,
            closeable: true,
            visible: false,
        },
        {
            id: "textures",
            label: "Textures",
            icon: FileImage,
            closeable: true,
            visible: false,
        },
        {
            id: "audio",
            label: "Audio",
            icon: Music,
            closeable: true,
            visible: false,
        },
        {
            id: "input",
            label: "Input",
            icon: Gamepad2,
            closeable: true,
            visible: false,
        },
        {
            id: "animation",
            label: "Animation",
            icon: Clapperboard,
            closeable: true,
            visible: false,
        },
    ];

    let openTabs = availableTabs.filter((tab) => tab.visible);
    let activeTab = "viewport";
    let selectedScript = "PlayerController";
    let blocklyWorkspace = null;

    function closeTab(tabId: string) {
        if (tabId === activeTab && openTabs.length > 1) {
            const currentIndex = openTabs.findIndex((tab) => tab.id === tabId);
            const nextTab =
                openTabs[currentIndex + 1] || openTabs[currentIndex - 1];
            activeTab = nextTab.id;
        }
        openTabs = openTabs.filter((tab) => tab.id !== tabId);
        availableTabs.find((tab) => tab.id === tabId)!.visible = false;
    }

    function openTab(tabId: string) {
        const tab = availableTabs.find((t) => t.id === tabId);
        if (tab && !tab.visible) {
            tab.visible = true;
            openTabs = [...openTabs, tab];
            activeTab = tabId;
        }
    }

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

                // Event blocks
                if (!window.Blockly.Blocks["event_whenflagclicked"]) {
                    window.Blockly.Blocks["event_whenflagclicked"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "when flag clicked",
                                nextStatement: null,
                                colour: "#FFD500",
                                tooltip: "Run when the green flag is clicked",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["event_whenkeypressed_menu"]) {
                    window.Blockly.Blocks["event_whenkeypressed_menu"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_dropdown",
                                        name: "KEY_OPTION",
                                        options: [
                                            ["space", "space"],
                                            ["up arrow", "up arrow"],
                                            ["down arrow", "down arrow"],
                                            ["left arrow", "left arrow"],
                                            ["right arrow", "right arrow"],
                                            ["a", "a"],
                                            ["s", "s"],
                                            ["d", "d"],
                                            ["w", "w"],
                                        ],
                                    },
                                ],
                                output: "String",
                                colour: "#FFD500",
                                tooltip: "Choose a key",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["event_whenkeypressed"]) {
                    window.Blockly.Blocks["event_whenkeypressed"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "when %1 key pressed",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "KEY_OPTION",
                                    },
                                ],
                                nextStatement: null,
                                colour: "#FFD500",
                                tooltip:
                                    "Run when the specified key is pressed",
                            });
                        },
                    };
                }

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

                // Control blocks
                if (!window.Blockly.Blocks["math_positive_number"]) {
                    window.Blockly.Blocks["math_positive_number"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_number",
                                        name: "NUM",
                                        value: 1,
                                        min: 0,
                                    },
                                ],
                                output: "Number",
                                colour: "#59C059",
                                tooltip: "A positive number",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["math_whole_number"]) {
                    window.Blockly.Blocks["math_whole_number"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "%1",
                                args0: [
                                    {
                                        type: "field_number",
                                        name: "NUM",
                                        value: 10,
                                        min: 0,
                                        precision: 1,
                                    },
                                ],
                                output: "Number",
                                colour: "#59C059",
                                tooltip: "A whole number",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["control_wait"]) {
                    window.Blockly.Blocks["control_wait"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "wait %1 seconds",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "DURATION",
                                        check: "Number",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#FFAB19",
                                tooltip:
                                    "Wait for the specified number of seconds",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["control_repeat"]) {
                    window.Blockly.Blocks["control_repeat"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "repeat %1 %2",
                                args0: [
                                    {
                                        type: "input_value",
                                        name: "TIMES",
                                        check: "Number",
                                    },
                                    {
                                        type: "input_statement",
                                        name: "SUBSTACK",
                                    },
                                ],
                                previousStatement: null,
                                nextStatement: null,
                                colour: "#FFAB19",
                                tooltip:
                                    "Repeat the enclosed blocks the specified number of times",
                            });
                        },
                    };
                }

                if (!window.Blockly.Blocks["control_forever"]) {
                    window.Blockly.Blocks["control_forever"] = {
                        init: function () {
                            this.jsonInit({
                                message0: "forever %1",
                                args0: [
                                    {
                                        type: "input_statement",
                                        name: "SUBSTACK",
                                    },
                                ],
                                previousStatement: null,
                                colour: "#FFAB19",
                                tooltip: "Repeat the enclosed blocks forever",
                            });
                        },
                    };
                }

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

                // Custom event block: "when button clicked"
                window.Blockly.Blocks["event_when_button_clicked"] = {
                    init: function () {
                        this.jsonInit({
                            id: "event_when_button_clicked",
                            message0: "when %1 button clicked",
                            args0: [
                                {
                                    type: "field_dropdown",
                                    name: "BUTTON_TYPE",
                                    options: [
                                        ["red", "RED"],
                                        ["green", "GREEN"],
                                        ["blue", "BLUE"],
                                        ["start", "START"],
                                        ["stop", "STOP"],
                                    ],
                                },
                            ],
                            category: window.Blockly.Categories.event,
                            extensions: ["colours_event", "shape_hat"],
                        });
                    },
                };

                // Custom event block: "when sensor detects"
                window.Blockly.Blocks["event_when_sensor_detects"] = {
                    init: function () {
                        this.jsonInit({
                            id: "event_when_sensor_detects",
                            message0: "when %1 sensor detects %2",
                            args0: [
                                {
                                    type: "field_dropdown",
                                    name: "SENSOR_TYPE",
                                    options: [
                                        ["motion", "MOTION"],
                                        ["sound", "SOUND"],
                                        ["light", "LIGHT"],
                                        ["temperature", "TEMPERATURE"],
                                    ],
                                },
                                {
                                    type: "input_value",
                                    name: "THRESHOLD",
                                },
                            ],
                            category: window.Blockly.Categories.event,
                            extensions: ["colours_event", "shape_hat"],
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

    // Initialize Blockly when the script tab becomes active
    $: if (activeTab === "script") {
        setTimeout(initializeBlockly, 100);
    }

    function getObjectIcon(type: string) {
        switch (type) {
            case "camera":
                return Camera;
            case "light":
                return Lightbulb;
            case "folder":
                return Folder;
            case "mesh":
                return Box;
            default:
                return Box;
        }
    }

    const testScene = new Types.BScene();
    let testPart = new Types.BPart("Test Object", null, null);
    testPart.position = new Types.BVector3(0, 5, 0);
    testPart.scale = new Types.BVector3(1, 1, 10);
    testScene.addObject(testPart);
</script>

<div class="h-screen w-full bg-gray-950 flex flex-col overflow-hidden relative">
    <!-- Global gradient overlay -->
    <div
        class="absolute inset-0 bg-gradient-to-t from-blue-500/15 via-blue-500/5 to-transparent pointer-events-none z-0"
    ></div>

    <!-- Top Navigation Bar -->
    <div
        class="h-12 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center px-4 relative z-10"
    >
        <div class="flex items-center gap-4 flex-1">
            <!-- Project Name -->
            <div class="flex items-center gap-2">
                <div
                    class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"
                ></div>
                <span class="text-gray-200 font-medium text-sm"
                    >Test Project</span
                >
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1 ml-8">
                <Button
                    size="sm"
                    class="h-8 px-3 bg-green-800 text-green-400 hover:bg-green-500/20"
                >
                    <Play class="w-4 h-4 mr-1" />
                    Play
                </Button>
                <Separator orientation="vertical" class="h-6 mx-2" />
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <Move class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <RotateCw class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <Scale class="w-4 h-4" />
                </Button>
            </div>
        </div>

        <!-- Right side buttons -->
        <div class="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-slate-300 hover:bg-slate-600"
            >
                <Settings class="w-4 h-4" />
            </Button>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden relative z-10">
        <ResizablePaneGroup direction="horizontal" class="h-full">
            <!-- Left Panel - Object Explorer -->
            <ResizablePane defaultSize={20} minSize={15} maxSize={35}>
                <div
                    class="h-full bg-gray-900/60 backdrop-blur-sm border-r border-gray-700/30"
                >
                    <div class="p-4">
                        <h3
                            class="text-gray-300 font-medium text-sm mb-4 flex items-center gap-2"
                        >
                            <Folder class="w-4 h-4" />
                            Scene Objects
                        </h3>
                        <div class="space-y-1">
                            {#each sceneObjects as obj}
                                {@const Icon = getObjectIcon(obj.type)}
                                <div
                                    class="flex items-center gap-2 px-2 py-2 rounded text-sm text-gray-300 hover:bg-gray-800/60 cursor-pointer"
                                    style="margin-left: {obj.depth * 12}px"
                                >
                                    {#if obj.type === "folder"}
                                        {#if obj.expanded}
                                            <FolderOpen
                                                class="w-4 h-4 text-gray-400"
                                            />
                                        {:else}
                                            <Folder
                                                class="w-4 h-4 text-gray-400"
                                            />
                                        {/if}
                                    {:else}
                                        <Icon class="w-4 h-4 text-gray-400" />
                                    {/if}
                                    <span class="flex-1 font-medium"
                                        >{obj.name}</span
                                    >
                                    <div
                                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Eye
                                            class="w-3.5 h-3.5 text-gray-500 hover:text-gray-300"
                                        />
                                        <Unlock
                                            class="w-3.5 h-3.5 text-gray-500 hover:text-gray-300"
                                        />
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </ResizablePane>

            <ResizableHandle />

            <!-- Center Panel - Tabbed Interface -->
            <ResizablePane defaultSize={60} minSize={40}>
                <div class="h-full bg-gray-900/40 backdrop-blur-sm">
                    <Tabs bind:value={activeTab} class="h-full flex flex-col">
                        <!-- Tab Header with Close Buttons and More Menu -->
                        <div
                            class="h-8 bg-gray-800/60 backdrop-blur-sm border-b border-gray-700/30 flex items-center px-1"
                        >
                            <TabsList class="h-6 bg-transparent p-0 flex-1">
                                {#each openTabs as tab}
                                    <div class="flex items-center relative">
                                        <TabsTrigger
                                            value={tab.id}
                                            class="h-6 px-2 text-xs rounded-none border-r border-gray-700/30 data-[state=active]:bg-gray-700/60 data-[state=active]:text-gray-200 text-gray-400 hover:text-gray-200"
                                        >
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-3 h-3 mr-1"
                                            />
                                            {tab.label}
                                        </TabsTrigger>
                                        {#if tab.closeable}
                                            <button
                                                class="absolute -right-1 top-0 h-4 w-4 p-0 hover:bg-red-500/20 rounded-sm flex items-center justify-center z-10"
                                                on:click|stopPropagation={() =>
                                                    closeTab(tab.id)}
                                            >
                                                <X class="w-2.5 h-2.5" />
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </TabsList>

                            <!-- Three Dots Menu -->
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                                    >
                                        <Plus class="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    class="w-40 bg-gray-800/90 backdrop-blur-sm border-gray-700"
                                >
                                    {#each availableTabs as tab}
                                        <DropdownMenuCheckboxItem
                                            class="text-gray-300 hover:bg-gray-700/60"
                                            checked={tab.visible}
                                            on:click={() => {
                                                if (tab.visible) {
                                                    closeTab(tab.id);
                                                } else {
                                                    openTab(tab.id);
                                                }
                                            }}
                                        >
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-4 h-4 mr-2"
                                            />
                                            {tab.label}
                                        </DropdownMenuCheckboxItem>
                                    {/each}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <!-- Tab Contents -->
                        <div class="flex-1 overflow-hidden">
                            <TabsContent
                                value="viewport"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-transparent relative overflow-hidden"
                                >
                                    <div
                                        class="absolute inset-0 flex items-center justify-center"
                                    >
                                        <Canvas>
                                            <Scene scene={testScene} />
                                        </Canvas>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="script" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex flex-col"
                                >
                                    <!-- Script Editor Header -->
                                    <div
                                        class="h-10 bg-gray-800/40 border-b border-gray-700/30 flex items-center px-4"
                                    >
                                        <div class="flex items-center gap-2">
                                            <Code2
                                                class="w-4 h-4 text-blue-400"
                                            />
                                            <span
                                                class="text-gray-300 text-sm font-medium"
                                                >Script Editor</span
                                            >
                                        </div>
                                        <div
                                            class="ml-auto flex items-center gap-3"
                                        >
                                            <select
                                                bind:value={selectedScript}
                                                class="bg-gray-700/50 text-gray-300 text-sm px-3 py-1 rounded border border-gray-600/30 focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="PlayerController"
                                                    >PlayerController</option
                                                >
                                                <option value="GameManager"
                                                    >GameManager</option
                                                >
                                                <option value="EnemyAI"
                                                    >EnemyAI</option
                                                >
                                            </select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-7 px-3 text-xs text-green-400 hover:bg-green-500/20"
                                                on:click={() =>
                                                    console.log(
                                                        "Run script:",
                                                        selectedScript
                                                    )}
                                            >
                                                <Play class="w-3 h-3 mr-1" />
                                                Run
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- Blockly Workspace -->
                                    <div class="flex-1 relative">
                                        <div
                                            id="blocklyDiv"
                                            class="absolute inset-0"
                                        ></div>
                                    </div>
                                </div>
                            </TabsContent>

                            <!-- Placeholder content for other tabs -->
                            <TabsContent
                                value="materials"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Palette
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Materials Editor
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Create and edit materials here
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="assets" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Package
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Asset Browser
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Browse and manage your assets
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="textures"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <FileImage
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Texture Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Import and organize textures
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="audio" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Music
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Audio Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Manage sounds and music
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="input" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Gamepad2
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Input Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Configure input controls
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="animation"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Clapperboard
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Animation Editor
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Create and edit animations
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </ResizablePane>

            <ResizableHandle />

            <!-- Right Panel - Properties -->
            <ResizablePane defaultSize={20} minSize={15} maxSize={35}>
                <div
                    class="h-full bg-gray-900/60 backdrop-blur-sm border-l border-gray-700/30"
                >
                    <div class="p-4">
                        <h3
                            class="text-gray-300 font-medium text-sm mb-4 flex items-center gap-2"
                        >
                            <Settings class="w-4 h-4" />
                            Properties
                        </h3>

                        {#if selectedObjectProps}
                            <Card
                                class="bg-gray-800/40 backdrop-blur-sm border-gray-700/30 mb-4"
                            >
                                <CardHeader class="pb-2 p-4">
                                    <CardTitle
                                        class="text-gray-200 text-sm font-medium"
                                        >{selectedObjectProps.name}</CardTitle
                                    >
                                </CardHeader>
                                <CardContent class="pt-0 p-4">
                                    <!-- Transform Section -->
                                    <div class="space-y-6">
                                        <div>
                                            <h4
                                                class="text-gray-300 text-sm font-medium mb-3"
                                            >
                                                Position
                                            </h4>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label
                                                        for="pos-x"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >X</label
                                                    >
                                                    <input
                                                        id="pos-x"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .x}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="pos-y"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Y</label
                                                    >
                                                    <input
                                                        id="pos-y"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .y}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="pos-z"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Z</label
                                                    >
                                                    <input
                                                        id="pos-z"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .z}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4
                                                class="text-gray-300 text-sm font-medium mb-3"
                                            >
                                                Scale
                                            </h4>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label
                                                        for="scale-x"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >X</label
                                                    >
                                                    <input
                                                        id="scale-x"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.x}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="scale-y"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Y</label
                                                    >
                                                    <input
                                                        id="scale-y"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.y}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="scale-z"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Z</label
                                                    >
                                                    <input
                                                        id="scale-z"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.z}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        {:else}
                            <div class="text-center py-8">
                                <Box
                                    class="w-8 h-8 mx-auto mb-3 text-gray-600"
                                />
                                <p class="text-gray-500 text-sm">
                                    Select an object to view properties
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>
            </ResizablePane>
        </ResizablePaneGroup>
    </div>
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

    :global(.blocklyBlockBackground) {
        fill: #1e293b !important;
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
