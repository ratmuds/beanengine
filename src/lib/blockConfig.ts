/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Type,
    Hash,
    GitBranch,
    Move3D,
    User,
    Variable,
    Info,
} from "lucide-svelte";

export interface BlockField {
    type: string;
    bind: string;
    label?: string;
    placeholder: string;
    icon: any;
}

export interface BlockConfig {
    color: string;
    label: string;
    fields: BlockField[];
    info: string;
    end?: string;
    children?: boolean;
}

// Color mapping for Tailwind colors to actual colors
const colorMap: Record<string, string> = {
    red: "oklch(63.7% 0.237 25.331)",
    orange: "oklch(70.5% 0.213 47.604)",
    yellow: "oklch(79.5% 0.184 86.047)",
    green: "oklch(72.3% 0.219 149.579)",
    blue: "oklch(62.3% 0.214 259.815)",
    purple: "oklch(62.7% 0.265 303.9)",
    gray: "oklch(55.2% 0.016 285.938)",
};

export const blockConfig: Record<string, BlockConfig> = {
    emitevent: {
        color: colorMap.yellow,
        label: "Emit Event",
        fields: [
            {
                type: "text",
                bind: "name",
                placeholder: "event name",
                icon: Type,
            },
            {
                type: "text",
                bind: "payload",
                placeholder: "optional payload",
                icon: Type,
            },
        ],
        info: "Emits a custom event optionally with a payload",
    },
    setVariable: {
        color: colorMap.gray,
        label: "Set Variable",
        fields: [
            {
                type: "text",
                bind: "variable",
                placeholder: "variable name",
                icon: Variable,
            },
            {
                type: "text",
                bind: "value",
                placeholder: "value",
                icon: Type,
            },
        ],
        info: "Sets a variable to a specified value",
    },
    if: {
        color: colorMap.blue,
        label: "If",
        fields: [
            {
                type: "text",
                bind: "condition",
                placeholder: "condition",
                icon: GitBranch,
            },
        ],
        info: "Runs code if condition is true",
        end: "then",
        children: true,
    },

    forever: {
        color: colorMap.blue,
        label: "Forever",
        fields: [],
        info: "Continuously runs the code inside it",
        end: "do",
        children: true,
    },

    loopThrough: {
        color: colorMap.blue,
        label: "Loop Through",
        fields: [
            {
                type: "text",
                bind: "array",
                placeholder: "array variable",
                icon: Variable,
            },
            {
                type: "text",
                bind: "item",
                placeholder: "item variable",
                icon: Variable,
            },
            {
                type: "text",
                bind: "index",
                placeholder: "index variable",
                icon: Variable,
            },
        ],
        info: "Loops through each item in the specified array and assigns it to the item variable",
        end: "do",
        children: true,
    },

    loopFor: {
        color: colorMap.blue,
        label: "Loop For",
        fields: [
            {
                type: "number",
                bind: "times",
                placeholder: "number of times",
                icon: Hash,
            },
            {
                type: "text",
                bind: "index",
                placeholder: "index variable",
                icon: Variable,
            },
        ],
        info: "Loops for the specified number of times",
        end: "do",
        children: true,
    },

    wait: {
        color: colorMap.blue,
        label: "Wait",
        fields: [
            {
                type: "number",
                bind: "duration",
                placeholder: "seconds",
                icon: Hash,
            },
        ],
        info: "Pauses execution for a duration",
    },

    set: {
        color: colorMap.gray,
        label: "Set",
        fields: [
            {
                type: "text",
                bind: "property",
                placeholder: "property name",
                icon: Variable,
            },
            {
                type: "text",
                bind: "value",
                placeholder: "value",
                icon: Hash,
            },
        ],
        info: "Sets a property of the object this script is on to a specified value. Use camelCase for properties (e.g., position, backgroundColor, etc.)",
    },

    move: {
        color: colorMap.green,
        label: "Move",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "position",
                label: "by",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Moves the target object by the specified position. If no target is provided, it moves the object this script is on.",
    },

    moveto: {
        color: colorMap.green,
        label: "Move To",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "position",
                label: "to",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Moves the target object to a specific position. If no target is provided, it moves the object this script is on.",
    },

    rotate: {
        color: colorMap.green,
        label: "Rotate",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "angle",
                label: "by",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Rotates the target object by the specified angle. If no target is provided, it rotates the object this script is on.",
    },

    lookat: {
        color: colorMap.green,
        label: "Look At",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "position",
                label: "to",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Moves the target object to a specific position. If no target is provided, it moves the object this script is on.",
    },

    directionalforce: {
        color: colorMap.green,
        label: "Directional Force",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "direction",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Sets the directional force in the specified direction to the object this script is on. If no target is provided, it applies the force to the object this script is on.",
    },

    directionalimpulse: {
        color: colorMap.green,
        label: "Directional Impulse",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "direction",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Applies a directional impulse in the specified direction to the object this script is on. If no target is provided, it applies the force to the object this script is on.",
    },

    directionalvelocity: {
        color: colorMap.green,
        label: "Directional Velocity",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "direction",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Sets the directional velocity in the specified direction to the object this script is on. If no target is provided, it applies the force to the object this script is on.",
    },

    motorsetvelocity: {
        color: colorMap.orange,
        label: "Set Motor Velocity",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "number",
                bind: "velocity",
                placeholder: "velocity",
                icon: Hash,
            },
            {
                type: "number",
                bind: "maxForce",
                placeholder: "max force",
                icon: Hash,
            },
        ],
        info: "Overrides a motor constraint's target velocity and optionally its maximum force at runtime.",
    },

    motorsetenabled: {
        color: colorMap.orange,
        label: "Set Motor Enabled",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "enabled",
                placeholder: "true / false",
                icon: Type,
            },
        ],
        info: "Enables or disables a motor constraint at runtime without changing its defaults in the editor.",
    },

    motorclearoverrides: {
        color: colorMap.orange,
        label: "Reset Motor Overrides",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
        ],
        info: "Clears all runtime overrides applied to a motor constraint so it falls back to its editor values.",
    },

    motorsettargetvelocity: {
        color: colorMap.orange,
        label: "Set Motor Target Velocity",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "number",
                bind: "velocity",
                placeholder: "velocity (rad/s)",
                icon: Hash,
            },
            {
                type: "number",
                bind: "damping",
                placeholder: "damping",
                icon: Hash,
            },
        ],
        info: "Sets the motor to velocity mode and configures target velocity. The motor will spin at the target velocity (rad/s).",
    },

    motorsettargetposition: {
        color: colorMap.orange,
        label: "Set Motor Target Position",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "number",
                bind: "position",
                placeholder: "angle (radians)",
                icon: Hash,
            },
            {
                type: "text",
                bind: "stiffness",
                placeholder: "stiffness",
                icon: Hash,
            },
            {
                type: "text",
                bind: "damping",
                placeholder: "damping",
                icon: Hash,
            },
        ],
        info: "Sets the motor to position mode and configures target angle. The motor will use PID control to reach the target angle (radians).",
    },

    mousebutton: {
        color: colorMap.purple,
        label: "Mouse Button",
        fields: [
            {
                type: "text",
                bind: "button",
                placeholder: "left, right, middle",
                icon: Type,
            },
            {
                type: "text",
                bind: "variable",
                placeholder: "variable name",
                icon: Variable,
            },
        ],
        info: "Sets the variable provided to 'true' or 'false' if the mouse button is pressed.",
    },

    valueset: {
        color: colorMap.purple,
        label: "Value Set",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "target (value obj)",
                icon: Variable,
            },
            {
                type: "text",
                bind: "value",
                placeholder: "value",
                icon: Type,
            },
        ],
        info: "Sets the specified Value object to the provided value.",
    },

    log: {
        color: colorMap.gray,
        label: "Log",
        fields: [
            {
                type: "text",
                bind: "message",
                placeholder: "message",
                icon: Type,
            },
            {
                type: "text",
                bind: "level",
                placeholder: "info, warn, error",
                icon: Info,
            },
        ],
        info: "Logs a message to the console",
    },

    clone: {
        color: colorMap.orange,
        label: "Clone",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "variable",
                placeholder: "variable name",
                icon: Variable,
            },
        ],
        info: "Creates a copy of the target object and stores its ID in the specified variable. If no target is provided, clones the object this script is on.",
    },

    destroy: {
        color: colorMap.red,
        label: "Destroy",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
        ],
        info: "Destroys the target object and removes it from the scene. If no target is provided, destroys the object this script is on.",
    },

    parent: {
        color: colorMap.yellow,
        label: "Parent",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "parent",
                placeholder: "parent object",
                icon: User,
            },
        ],
        info: "Sets the parent of the target object. If no target is provided, parents the object this script is on. Use 'null' or empty to unparent.",
    },
};

export function generateAvailableBlocks() {
    return Object.keys(blockConfig).map((type) => ({
        id: type,
        label: blockConfig[type].label,
        type,
        color: blockConfig[type].color,
        info: blockConfig[type].info,
        ...Object.fromEntries(
            blockConfig[type].fields.map((field) => [field.bind, ""])
        ),
        ...(blockConfig[type].children ? { children: [] } : {}),
        fields: blockConfig[type].fields.map((field) => ({
            ...field,
            inputs: [],
        })),
    }));
}
