import { Type, Hash, GitBranch, Move3D, User } from "lucide-svelte";

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
}

export const blockConfig: Record<string, BlockConfig> = {
    say: {
        color: "purple-500",
        label: "Say",
        fields: [
            {
                type: "text",
                bind: "text",
                placeholder: "message",
                icon: Type,
            },
            {
                type: "number",
                bind: "duration",
                label: "for",
                placeholder: "seconds",
                icon: Hash,
            },
        ],
        info: "Shows a message over the object for a duration",
    },

    if: {
        color: "blue-500",
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
    },

    wait: {
        color: "blue-500",
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
        color: "green-500",
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

    move: {
        color: "green-500",
        label: "Move",
        fields: [
            {
                type: "text",
                bind: "direction",
                placeholder: "direction",
                icon: Move3D,
            },
            {
                type: "number",
                bind: "speed",
                placeholder: "speed",
                icon: Hash,
            },
        ],
        info: "Moves the object in a direction at a specific speed",
    },

    setsize: {
        color: "green-500",
        label: "Set Size",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "size",
                label: "to",
                placeholder: "width, height, depth",
                icon: Move3D,
            },
        ],
        info: "Sets the size of the target object. If no target is provided, it sets the size of the object this script is on.",
    },

    setrotation: {
        color: "green-500",
        label: "Set Rotation",
        fields: [
            {
                type: "text",
                bind: "target",
                placeholder: "(self)",
                icon: User,
            },
            {
                type: "text",
                bind: "rotation",
                label: "to",
                placeholder: "x, y, z, (w if quaternion)",
                icon: Move3D,
            },
        ],
        info: "Sets the rotation of the target object. If no target is provided, it sets the rotation of the object this script is on. Rotation can be in Euler angles or quaternion format.",
    },

    repeat: {
        color: "orange-500",
        label: "Repeat",
        fields: [
            {
                type: "number",
                bind: "times",
                placeholder: "times",
                icon: Hash,
            },
        ],
        info: "Repeats the contained blocks a specified number of times",
    },
};

export function generateAvailableBlocks() {
    return Object.keys(blockConfig).map(type => ({
        id: type,
        type,
        ...Object.fromEntries(
            blockConfig[type].fields.map(field => [field.bind, ""])
        ),
        ...(blockConfig[type].fields.some(f => f.bind === "children") || type === "if" || type === "repeat" ? { children: [] } : {}),
        fields: blockConfig[type].fields.map(field => ({
            ...field,
            inputs: [],
        })),
    }));
}