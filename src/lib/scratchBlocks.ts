// src/lib/scratchBlocks.ts

// Creates a Blockly block with the given parameters
function createBlock(
    id,
    text,
    color,
    tooltip,
    args = [],
    blockType = "statement",
    outputType = "String"
) {
    // Count how many {things} are in the text
    let argCount = 0;
    const message = text.replace(/\{[^}]+\}/g, () => {
        argCount++;
        return `%${argCount}`;
    });

    window.Blockly.Blocks[id] = {
        init: function () {
            const config = {
                message0: message,
                args0: args, // Just pass whatever args we got
                colour: color,
                tooltip: tooltip,
            };

            // Set different properties based on block type
            if (blockType === "hat") {
                // Hat blocks (like "when flag clicked") only have nextStatement
                config.nextStatement = null;
            } else if (blockType === "output") {
                // Output blocks (like dropdowns, numbers) return values
                config.output = outputType;
            } else {
                // Statement blocks (like "move 10 steps") have both
                config.previousStatement = null;
                config.nextStatement = null;
            }

            this.jsonInit(config);
        },
    };
}

// Helper functions to make args easier
function numberInput(name) {
    return { type: "input_value", name: name, check: "Number" };
}

function textInput(name) {
    return { type: "input_value", name: name, check: "String" };
}

function dropdown(name, options) {
    return { type: "field_dropdown", name: name, options: options };
}

// Export the functions so we can use them in components
export { createBlock, numberInput, textInput, dropdown };

// Define all the event blocks
export function createEventBlocks() {
    // When flag clicked - HAT block (starts scripts)
    createBlock(
        "event_whenflagclicked",
        "when flag clicked",
        "#FFD500",
        "Run when the green flag is clicked",
        [],
        "hat"
    );

    // Key dropdown menu - OUTPUT block (returns a value)
    createBlock(
        "event_whenkeypressed_menu",
        "{key}",
        "#FFD500",
        "Choose a key",
        [
            dropdown("KEY_OPTION", [
                ["space", "space"],
                ["up arrow", "up arrow"],
                ["down arrow", "down arrow"],
                ["left arrow", "left arrow"],
                ["right arrow", "right arrow"],
                ["a", "a"],
                ["s", "s"],
                ["d", "d"],
                ["w", "w"],
            ]),
        ],
        "output"
    );

    // When key pressed block - HAT block (starts scripts)
    createBlock(
        "event_whenkeypressed",
        "when {key} key pressed",
        "#FFD500",
        "Run when the specified key is pressed",
        [textInput("KEY_OPTION")],
        "hat"
    );

    // When button clicked block - HAT block (starts scripts)
    createBlock(
        "event_when_button_clicked",
        "when {button} button clicked",
        "#FFD500",
        "Run when button is clicked",
        [
            dropdown("BUTTON_TYPE", [
                ["red", "RED"],
                ["green", "GREEN"],
                ["blue", "BLUE"],
                ["start", "START"],
                ["stop", "STOP"],
            ]),
        ],
        "hat"
    );

    // When sensor detects block - HAT block (starts scripts)
    createBlock(
        "event_when_sensor_detects",
        "when {sensor} sensor detects {threshold}",
        "#FFD500",
        "Run when sensor detects value",
        [
            dropdown("SENSOR_TYPE", [
                ["motion", "MOTION"],
                ["sound", "SOUND"],
                ["light", "LIGHT"],
                ["temperature", "TEMPERATURE"],
            ]),
            numberInput("THRESHOLD"),
        ],
        "hat"
    );
}

// Define all the control blocks
export function createControlBlocks() {
    // Wait block
    createBlock(
        "control_wait",
        "wait {duration} seconds",
        "#FFAB19",
        "Wait for the specified number of seconds",
        [numberInput("DURATION")]
    );

    // Repeat block (needs special handling for statement input)
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

    // Forever block (needs special handling for statement input)
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

    // Math helper blocks - OUTPUT blocks (return numbers)
    createBlock(
        "math_positive_number",
        "{num}",
        "#59C059",
        "A positive number",
        [
            {
                type: "field_number",
                name: "NUM",
                value: 1,
                min: 0,
            },
        ],
        "output",
        "Number"
    );

    createBlock(
        "math_whole_number",
        "{num}",
        "#59C059",
        "A whole number",
        [
            {
                type: "field_number",
                name: "NUM",
                value: 10,
                min: 0,
                precision: 1,
            },
        ],
        "output",
        "Number"
    );
}
