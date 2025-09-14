import * as Types from "$lib/types";
import type { CompiledItem } from "./compiler.js";
import { runtimeStore } from "$lib/runtimeStore";
import { resolveTargetGameObject, getTargetResolutionError } from "$lib/services/targetResolver.js";

export interface RuntimeContext {
    variables: Record<
        string,
        {
            value: any;
            type: "number" | "string" | "boolean" | "object";
        }
    >;

    // Recursive evaluation function for nested chips
    evaluateChip: (
        compiledChip: CompiledItem | any,
        context: RuntimeContext
    ) => Promise<any>;

    // Game context
    gameObject?: any;
    scene?: any;
    script?: Types.BScript;
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

            return runtimeStore.getVariable(variableName)?.value ?? "null";
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

    randomInt: {
        color: "purple-500",
        label: "Random Int",
        fields: [
            {
                type: "number",
                bind: "min",
                label: "Min",
                placeholder: "Min",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "max",
                label: "Max",
                placeholder: "Max",
                defaultValue: 100,
            },
        ],
        info: "Generates a random integer between min and max",
        evaluate: (compiled, context) => {
            const min = parseInt(compiled.min);
            const max = parseInt(compiled.max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
    },

    position: {
        color: "blue-500",
        label: "Position",
        fields: [
            {
                type: "text",
                bind: "target",
                label: "Target",
                placeholder: "(self)",
                defaultValue: "",
            },
        ],
        info: "Gets the position of a target object",
        evaluate: async (compiled, context) => {
            const targetRef = await context.evaluateChip(compiled.target, context);

            // Resolve target object
            let targetGameObject = context.gameObject; // Default to current object
            if (targetRef) {
                const resolvedTarget = resolveTargetGameObject(targetRef, context);
                if (resolvedTarget) {
                    targetGameObject = resolvedTarget;
                } else {
                    const error = getTargetResolutionError(targetRef, context);
                    runtimeStore.warn(`Position chip target resolution failed: ${error}`, "Chip");
                    return null;
                }
            }

            if (!targetGameObject) {
                runtimeStore.warn("Position chip: no target object available", "Chip");
                return null;
            }

            // Return the position of the target game object
            return targetGameObject.transform.position;
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

// Generate a specific chip with optional pre-filled values
export function generateChip(
    chipType: string,
    prefilledValues: Record<string, any> = {}
) {
    const config = chipConfig[chipType];
    if (!config) {
        throw new Error(`Unknown chip type: ${chipType}`);
    }

    return {
        id: `${chipType}-${Date.now()}-${Math.random()}`,
        type: chipType,
        // Copy all config properties
        color: config.color,
        label: config.label,
        info: config.info,
        // Initialize field values to defaults, then override with prefilled values
        ...Object.fromEntries(
            config.fields.map((field) => [
                field.bind,
                prefilledValues[field.bind] ?? field.defaultValue ?? "",
            ])
        ),
        fields: config.fields.map((field) => ({
            ...field,
            inputs: [],
        })),
    };
}
