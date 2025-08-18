import * as Types from "$lib/types";
import type { CompiledItem } from "./compiler.js";

export interface RuntimeContext {
    variables: Record<
        string,
        {
            value: any;
            type: "number" | "string" | "boolean" | "object";
        }
    >;

    // Recursive evaluation function for nested chips
    evaluateChip: (compiledChip: CompiledItem | any) => Promise<any>;

    // Game context
    gameObject?: any;
    mesh?: any;
    scene?: any;
}

export interface ChipField {
    type: string;
    bind: string;
    label?: string;
    placeholder: string;
    defaultValue?: any;

    // Type specific getters
    getDropdownOptions?: () => string[];
}

export interface ChipConfig {
    color: string;
    label: string;
    fields: ChipField[];
    info: string;
    evaluate?: (
        compiled: CompiledItem,
        context: RuntimeContext
    ) => Promise<any> | any;
}

// Chip configurations
export const chipConfig: Record<string, ChipConfig> = {
    variable: {
        color: "orange-500",
        label: "Variable",
        fields: [
            {
                type: "dropdown",
                bind: "name",
                label: "Variable Name",
                placeholder: "Select Variable",
                defaultValue: "",
            },
        ],
        info: "References a variable value",
        evaluate: (compiled, context) => {
            // compiled.name should be a string in the new flattened structure
            const variableName = compiled.name;
            return context.variables[variableName]?.value ?? variableName;
        },
    },

    vector3: {
        color: "green-500",
        label: "Vector 3",
        fields: [
            {
                type: "number",
                bind: "x",
                label: "X",
                placeholder: "X",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "y",
                label: "Y",
                placeholder: "Y",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "z",
                label: "Z",
                placeholder: "Z",
                defaultValue: 0,
            },
        ],
        info: "Supplies a 3D vector with X, Y, and Z components",
        evaluate: async (compiled, context) => {
            // Evaluate each field and return a vector value
            const x = await context.evaluateChip(compiled.x);
            const y = await context.evaluateChip(compiled.y);
            const z = await context.evaluateChip(compiled.z);

            return new Types.BVector3(
                parseFloat(x) || 0,
                parseFloat(y) || 0,
                parseFloat(z) || 0
            );
        },
    },
};

// Generate a list of available chips for UI
export function generateAvailableChips() {
    return Object.keys(chipConfig).map((type) => ({
        id: type,
        type,
        // Copy all config properties
        color: chipConfig[type].color,
        label: chipConfig[type].label,
        info: chipConfig[type].info,
        // Initialize field values to defaults
        ...Object.fromEntries(
            chipConfig[type].fields.map((field) => [
                field.bind,
                field.defaultValue ?? "",
            ])
        ),
        fields: chipConfig[type].fields.map((field) => ({
            ...field,
            inputs: [],
        })),
    }));
}
