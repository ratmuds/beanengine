import { Type, Plus, Hash } from "lucide-svelte";

export interface ChipField {
    type: string;
    bind: string;
    label?: string;
    placeholder: string;
    icon: any;
}

export interface ChipConfig {
    color: string;
    label: string;
    fields: ChipField[];
    info: string;
    category: "value" | "operation" | "getter";
    evaluate?: (chipData: any, context?: any) => any;
}

export const chipConfig: Record<string, ChipConfig> = {
    variable: {
        color: "orange-500",
        label: "Variable",
        fields: [],
        info: "References a variable value",
        category: "value",
        evaluate: (chipData, context) => {
            return context?.variables?.[chipData.name] || chipData.value;
        }
    },

    literal: {
        color: "gray-500", 
        label: "Value",
        fields: [
            {
                type: "text",
                bind: "value",
                placeholder: "value",
                icon: Type,
            }
        ],
        info: "A literal value (text, number, etc.)",
        category: "value",
        evaluate: (chipData) => {
            const value = chipData.value;
            // Try to parse as number if possible
            const numValue = parseFloat(value);
            return !isNaN(numValue) && isFinite(numValue) ? numValue : value;
        }
    },

    add: {
        color: "blue-500",
        label: "Add",
        fields: [
            {
                type: "text",
                bind: "left",
                placeholder: "first value",
                icon: Hash,
            },
            {
                type: "text", 
                bind: "right",
                label: "+",
                placeholder: "second value",
                icon: Hash,
            }
        ],
        info: "Adds two values together",
        category: "operation",
        evaluate: (chipData, context) => {
            // This would need to recursively evaluate nested chips
            const left = chipData.left || 0;
            const right = chipData.right || 0;
            return parseFloat(left) + parseFloat(right);
        }
    },

    getObject: {
        color: "green-500",
        label: "Get Object",
        fields: [
            {
                type: "text",
                bind: "objectName",
                placeholder: "object name",
                icon: Type,
            }
        ],
        info: "Gets an object by name and returns its ID",
        category: "getter", 
        evaluate: (chipData, context) => {
            // This would search through game objects and return the ID
            const objectName = chipData.objectName;
            const gameObject = context?.gameObjects?.find(obj => obj.name === objectName);
            return gameObject?.id || null;
        }
    }
};

export function generateAvailableChips() {
    return Object.keys(chipConfig).map(type => ({
        id: type,
        type,
        ...Object.fromEntries(
            chipConfig[type].fields.map(field => [field.bind, ""])
        ),
        fields: chipConfig[type].fields.map(field => ({
            bind: field.bind,
            inputs: [],
        })),
    }));
}