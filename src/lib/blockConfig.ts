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

    moveto: {
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
                label: "to",
                placeholder: "x, y, z",
                icon: Move3D,
            },
        ],
        info: "Moves the target object to a specific position. If no target is provided, it moves the object this script is on.",
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
