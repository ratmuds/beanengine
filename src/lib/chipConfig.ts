import * as Types from "$lib/types";
import type { CompiledItem } from "./compiler.js";
import { runtimeStore } from "$lib/runtimeStore";
import {
    resolveTargetGameObject,
    getTargetResolutionError,
} from "$lib/services/targetResolver.js";
import type { GameObject } from "./runtime/GameObject.js";

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

            return (
                runtimeStore.getVariable(variableName, context.script?.id)
                    ?.value ?? "null"
            );
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
            const x = await context.evaluateChip(compiled.x, context);
            const y = await context.evaluateChip(compiled.y, context);
            const z = await context.evaluateChip(compiled.z, context);

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
            const targetRef = await context.evaluateChip(
                compiled.target,
                context
            );

            // Resolve target object
            let targetGameObject = context.gameObject; // Default to current object
            if (targetRef) {
                const resolvedTarget = resolveTargetGameObject(
                    targetRef,
                    context
                );
                if (resolvedTarget) {
                    targetGameObject = resolvedTarget;
                } else {
                    const error = getTargetResolutionError(targetRef, context);
                    runtimeStore.warn(
                        `Position chip target resolution failed: ${error}`,
                        "Chip"
                    );
                    return null;
                }
            }

            if (!targetGameObject) {
                runtimeStore.warn(
                    "Position chip: no target object available",
                    "Chip"
                );
                return null;
            }

            // Return the position of the target game object
            return targetGameObject.transform.position;
        },
    },

    rotation: {
        color: "blue-500",
        label: "Rotation",
        fields: [
            {
                type: "text",
                bind: "target",
                label: "Target",
            },
        ],
        info: "Gets the rotation of a target object",
        evaluate: async (compiled, context) => {
            const targetRef = await context.evaluateChip(
                compiled.target,
                context
            );

            // Resolve target object
            let targetGameObject = context.gameObject; // Default to current object
            if (targetRef) {
                const resolvedTarget = resolveTargetGameObject(
                    targetRef,
                    context
                );
                if (resolvedTarget) {
                    targetGameObject = resolvedTarget;
                } else {
                    const error = getTargetResolutionError(targetRef, context);
                    runtimeStore.warn(
                        `Rotation chip target resolution failed: ${error}`,
                        "Chip"
                    );
                    return null;
                }
            }

            if (!targetGameObject) {
                runtimeStore.warn(
                    "Rotation chip: no target object available",
                    "Chip"
                );
                return null;
            }

            // Return the rotation of the target game object
            return targetGameObject.transform.rotation;
        },
    },

    lookVector: {
        color: "red-500",
        label: "Look Vector",
        info: "Gets the look vector of the player",
        fields: [],
        evaluate: (compiled, context) => {
            let gameObject = context.gameObject as GameObject;

            return gameObject.getLookVector();
        },
    },

    add: {
        color: "orange-500",
        label: "Add",
        info: "Adds two numbers together",
        fields: [
            {
                type: "number",
                bind: "a",
                label: "A",
                placeholder: "A",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "b",
                label: "B",
                placeholder: "B",
                defaultValue: 0,
            },
        ],
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (typeof a === "number" && typeof b === "number") {
                return a + b;
            }

            if (typeof a === "string" && typeof b === "string") {
                return a + b;
            }

            // Vector-like addition: supports Types.BVector3 or plain objects with x,y,z
            const isVec = (v: any) =>
                v && typeof v === "object" && "x" in v && "y" in v && "z" in v;
            if (isVec(a) && isVec(b)) {
                const ax = Number(a.x) || 0;
                const ay = Number(a.y) || 0;
                const az = Number(a.z) || 0;
                const bx = Number(b.x) || 0;
                const by = Number(b.y) || 0;
                const bz = Number(b.z) || 0;
                return new Types.BVector3(ax + bx, ay + by, az + bz);
            }

            runtimeStore.warn(
                `Add chip: unsupported input types for adding. Either types not supported to be added, or type mismatch. A value: ${JSON.stringify(
                    a
                )} A type: ${typeof a} B value: ${JSON.stringify(
                    b
                )} B type: ${typeof b}. Returning 0.`,
                "Interpreter"
            );

            return 0;
        },
    },

    sub: {
        color: "orange-500",
        label: "Subtract",
        info: "Subtracts B from A",
        fields: [
            {
                type: "number",
                bind: "a",
                label: "A",
                placeholder: "A",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "b",
                label: "B",
                placeholder: "B",
                defaultValue: 0,
            },
        ],
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (typeof a === "number" && typeof b === "number") {
                return a - b;
            }

            // Vector-like subtraction: supports Types.BVector3 or plain objects with x,y,z
            const isVec = (v: any) =>
                v && typeof v === "object" && "x" in v && "y" in v && "z" in v;
            if (isVec(a) && isVec(b)) {
                const ax = Number(a.x) || 0;
                const ay = Number(a.y) || 0;
                const az = Number(a.z) || 0;
                const bx = Number(b.x) || 0;
                const by = Number(b.y) || 0;
                const bz = Number(b.z) || 0;
                return new Types.BVector3(ax - bx, ay - by, az - bz);
            }

            runtimeStore.warn(
                `Subtract chip: unsupported input types for subtracting. Either types not supported to be subtracted, or type mismatch. A value: ${JSON.stringify(
                    a
                )} A type: ${typeof a} B value: ${JSON.stringify(
                    b
                )} B type: ${typeof b}. Returning 0.`,
                "Interpreter"
            );

            return 0;
        },
    },

    mul: {
        color: "orange-500",
        label: "Multiply",
        info: "Multiplies two numbers together",
        fields: [
            {
                type: "number",
                bind: "a",
                label: "A",
                placeholder: "A",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "b",
                label: "B",
                placeholder: "B",
                defaultValue: 0,
            },
        ],
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (typeof a === "number" && typeof b === "number") {
                return a * b;
            }

            // Vector-like component-wise multiplication
            const isVec = (v: any) =>
                v && typeof v === "object" && "x" in v && "y" in v && "z" in v;
            if (isVec(a) && isVec(b)) {
                const ax = Number(a.x) || 0;
                const ay = Number(a.y) || 0;
                const az = Number(a.z) || 0;
                const bx = Number(b.x) || 0;
                const by = Number(b.y) || 0;
                const bz = Number(b.z) || 0;
                return new Types.BVector3(ax * bx, ay * by, az * bz);
            }

            runtimeStore.warn(
                `Multiply chip: unsupported input types for multiplying. Either types not supported to be multiplied, or type mismatch. A value: ${JSON.stringify(
                    a
                )} A type: ${typeof a} B value: ${JSON.stringify(
                    b
                )} B type: ${typeof b}. Returning 0.`,
                "Interpreter"
            );

            return 0;
        },
    },

    div: {
        color: "orange-500",
        label: "Divide",
        info: "Divides A by B",
        fields: [
            {
                type: "number",
                bind: "a",
                label: "A",
                placeholder: "A",
                defaultValue: 0,
            },
            {
                type: "number",
                bind: "b",
                label: "B",
                placeholder: "B",
                defaultValue: 1,
            },
        ],
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (typeof a === "number" && typeof b === "number") {
                if (b === 0) {
                    runtimeStore.warn("Divide by zero", "Interpreter");
                    return 0;
                }
                return a / b;
            }

            // Vector-like component-wise division
            const isVec = (v: any) =>
                v && typeof v === "object" && "x" in v && "y" in v && "z" in v;
            if (isVec(a) && isVec(b)) {
                const ax = Number(a.x) || 0;
                const ay = Number(a.y) || 0;
                const az = Number(a.z) || 0;
                const bx = Number(b.x) || 0;
                const by = Number(b.y) || 0;
                const bz = Number(b.z) || 0;
                if (bx === 0 || by === 0 || bz === 0) {
                    runtimeStore.warn("Divide by zero", "Interpreter");
                    return new Types.BVector3(0, 0, 0);
                }
                return new Types.BVector3(ax / bx, ay / by, az / bz);
            }

            runtimeStore.warn(
                `Divide chip: unsupported input types. A: ${typeof a}, B: ${typeof b}. Returning 0.`,
                "Interpreter"
            );

            return 0;
        },
    },

    mousebtn: {
        color: "red-500",
        label: "Mouse Button",
        info: "Returns true if the specified mouse button is pressed (left, middle, right)",
        fields: [
            {
                type: "dropdown",
                bind: "button",
                label: "Button",
                defaultValue: "left",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Middle", value: "middle" },
                    { label: "Right", value: "right" },
                ],
            },
        ],

        evaluate: (compiled, context) => {
            const button = compiled.button || "left";
            return runtimeStore.getMouseButton(button);
        },
    },

    children: {
        color: "blue-500",
        label: "Children",
        info: "Returns an array of child objects of the target object",
        fields: [
            {
                type: "text",
                bind: "target",
                label: "Target",
                placeholder: "(self)",
                defaultValue: "",
            },
        ],
        evaluate: async (compiled, context) => {
            const targetRef = await context.evaluateChip(
                compiled.target,
                context
            );

            // Resolve target object
            let targetGameObject = context.gameObject; // Default to current object
            if (targetRef) {
                const resolvedTarget = resolveTargetGameObject(
                    targetRef,
                    context
                );
                if (resolvedTarget) {
                    targetGameObject = resolvedTarget;
                } else {
                    const error = getTargetResolutionError(targetRef, context);
                    runtimeStore.warn(
                        `Children chip target resolution failed: ${error}`,
                        "Chip"
                    );
                    return [];
                }
            }

            if (!targetGameObject) {
                runtimeStore.warn(
                    "Children chip: no target object available",
                    "Chip"
                );
                return [];
            }

            return targetGameObject.children;
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
