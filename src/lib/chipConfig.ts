// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Types from "$lib/types";
import type { CompiledItem } from "./compiler.js";
import { runtimeStore } from "$lib/runtimeStore";
import {
    resolveTargetGameObject,
    getTargetResolutionError,
} from "$lib/services/targetResolver.js";
import type { GameObject } from "./runtime/GameObject.js";
import * as THREE from "three";
import {
    raycast,
    rayFromCamera,
    overlapSphere,
} from "$lib/runtime/PhysicsQueries";

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
    options?: Array<{ label: string; value: string }>;

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

// Helper: vector-like guard
const isVecLike = (v: any): v is { x: any; y: any; z: any } =>
    v && typeof v === "object" && "x" in v && "y" in v && "z" in v;

const toThreeVector = (value: any, fallback?: THREE.Vector3): THREE.Vector3 => {
    if (value instanceof THREE.Vector3) return value.clone();
    if (value instanceof Types.BVector3)
        return new THREE.Vector3(value.x, value.y, value.z);
    if (isVecLike(value)) {
        return new THREE.Vector3(
            Number(value.x) || 0,
            Number(value.y) || 0,
            Number(value.z) || 0
        );
    }
    if (Array.isArray(value) && value.length >= 3) {
        return new THREE.Vector3(
            Number(value[0]) || 0,
            Number(value[1]) || 0,
            Number(value[2]) || 0
        );
    }
    if (typeof value === "string") {
        const nums = value.match(/-?\d+(?:\.\d+)?/g)?.map((n) => Number(n)) || [
            0, 0, 0,
        ];
        return new THREE.Vector3(nums[0] || 0, nums[1] || 0, nums[2] || 0);
    }
    return fallback ? fallback.clone() : new THREE.Vector3();
};

const evaluateField = async (
    field: any,
    context: RuntimeContext
): Promise<any> => {
    if (field && typeof field === "object" && "type" in field) {
        return context.evaluateChip(field, context);
    }
    return field;
};

const toNumber = (value: any, fallback: number): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const performRaycast = async (compiled: any, context: RuntimeContext) => {
    const originRaw = await evaluateField(compiled.origin, context);
    const directionRaw = await evaluateField(compiled.direction, context);
    const maxRaw = await evaluateField(compiled.maxDistance, context);
    const originVec = toThreeVector(originRaw);
    const directionVec = toThreeVector(
        directionRaw,
        new THREE.Vector3(0, -1, 0)
    );
    if (directionVec.lengthSq() === 0) {
        directionVec.set(0, -1, 0);
    }
    const maxDistance = toNumber(maxRaw ?? compiled.maxDistance ?? 1000, 1000);
    return raycast(originVec, directionVec, maxDistance);
};

const performCameraRaycast = async (compiled: any, context: RuntimeContext) => {
    const mouseXRaw = await evaluateField(compiled.mouseX, context);
    const mouseYRaw = await evaluateField(compiled.mouseY, context);
    const maxRaw = await evaluateField(compiled.maxDistance, context);

    const mouseX =
        mouseXRaw === undefined || mouseXRaw === ""
            ? undefined
            : toNumber(mouseXRaw, NaN);
    const mouseY =
        mouseYRaw === undefined || mouseYRaw === ""
            ? undefined
            : toNumber(mouseYRaw, NaN);
    const maxDistance = toNumber(maxRaw ?? compiled.maxDistance ?? 1000, 1000);

    console.log("performCameraRaycast", { mouseX, mouseY, maxDistance });

    return rayFromCamera(
        Number.isFinite(mouseX) ? mouseX : undefined,
        Number.isFinite(mouseY) ? mouseY : undefined,
        maxDistance
    );
};

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
            const x = await context.evaluateChip(compiled.x, context);
            const y = await context.evaluateChip(compiled.y, context);
            const z = await context.evaluateChip(compiled.z, context);
            return new Types.BVector3(
                Number(x) || 0,
                Number(y) || 0,
                Number(z) || 0
            );
        },
    },

    vector3Size: {
        color: "green-500",
        label: "Vector3 Size",
        fields: [
            {
                type: "text",
                bind: "vector",
                label: "Vector",
                placeholder: "(x, y, z)",
                defaultValue: "",
            },
        ],
        info: "Returns the magnitude (length) of a 3D vector",
        evaluate: async (compiled, context) => {
            const v = await context.evaluateChip(compiled.vector, context);

            let x = 0,
                y = 0,
                z = 0;
            if (isVecLike(v)) {
                x = Number(v.x) || 0;
                y = Number(v.y) || 0;
                z = Number(v.z) || 0;
            } else if (Array.isArray(v) && v.length >= 3) {
                x = Number(v[0]) || 0;
                y = Number(v[1]) || 0;
                z = Number(v[2]) || 0;
            } else if (typeof v === "string") {
                const nums = v.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
                x = Number(nums[0]) || 0;
                y = Number(nums[1]) || 0;
                z = Number(nums[2]) || 0;
            }

            return new THREE.Vector3(x, y, z).length();
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
        evaluate: (compiled, _context) => {
            const min = parseInt(compiled.min);
            const max = parseInt(compiled.max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
    },

    numberliteral: {
        color: "orange-500",
        label: "Number",
        fields: [
            {
                type: "number",
                bind: "value",
                label: "Value",
                placeholder: "0",
                defaultValue: 0,
            },
        ],
        info: "Outputs a numeric literal value",
        evaluate: async (compiled, context) => {
            const value = await context.evaluateChip(compiled.value, context);
            const num = Number(value);
            if (Number.isNaN(num)) {
                runtimeStore.warn(
                    `Number chip: unable to convert value '${value}' to a number. Returning 0.`,
                    "Chip"
                );
                return 0;
            }
            return num;
        },
    },

    booleanliteral: {
        color: "orange-500",
        label: "Boolean",
        fields: [
            {
                type: "dropdown",
                bind: "value",
                label: "Value",
                placeholder: "true",
                defaultValue: "true",
                options: [
                    { label: "True", value: "true" },
                    { label: "False", value: "false" },
                ],
            },
        ],
        info: "Outputs a boolean literal (true or false)",
        evaluate: async (compiled, context) => {
            const value = await context.evaluateChip(compiled.value, context);
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                const lower = value.toLowerCase();
                if (lower === "true") return true;
                if (lower === "false") return false;
            }
            return Boolean(value);
        },
    },

    equals: {
        color: "purple-500",
        label: "Equals",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if A and B are equal",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (isVecLike(a) && isVecLike(b)) {
                return (
                    Number(a.x) === Number(b.x) &&
                    Number(a.y) === Number(b.y) &&
                    Number(a.z) === Number(b.z)
                );
            }
            return a === b;
        },
    },

    notequals: {
        color: "purple-500",
        label: "Not Equals",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if A and B are not equal",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);

            if (isVecLike(a) && isVecLike(b)) {
                return !(
                    Number(a.x) === Number(b.x) &&
                    Number(a.y) === Number(b.y) &&
                    Number(a.z) === Number(b.z)
                );
            }
            return a !== b;
        },
    },

    greaterthan: {
        color: "purple-500",
        label: "Greater Than",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if A is greater than B",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);
            const aNum = Number(a);
            const bNum = Number(b);
            if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
                runtimeStore.warn(
                    `Greater Than chip: unable to compare non-numeric values '${a}' and '${b}'. Returning false.`,
                    "Chip"
                );
                return false;
            }
            return aNum > bNum;
        },
    },

    lessthan: {
        color: "purple-500",
        label: "Less Than",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if A is less than B",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            const b = await context.evaluateChip(compiled.b, context);
            const aNum = Number(a);
            const bNum = Number(b);
            if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
                runtimeStore.warn(
                    `Less Than chip: unable to compare non-numeric values '${a}' and '${b}'. Returning false.`,
                    "Chip"
                );
                return false;
            }
            return aNum < bNum;
        },
    },

    logicaland: {
        color: "purple-500",
        label: "And",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if both A and B are truthy",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            if (!a) return false;
            const b = await context.evaluateChip(compiled.b, context);
            return Boolean(b);
        },
    },

    logicalor: {
        color: "purple-500",
        label: "Or",
        fields: [
            {
                type: "text",
                bind: "a",
                label: "A",
                placeholder: "value A",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "b",
                label: "B",
                placeholder: "value B",
                defaultValue: "",
            },
        ],
        info: "Returns true if either A or B is truthy",
        evaluate: async (compiled, context) => {
            const a = await context.evaluateChip(compiled.a, context);
            if (a) return true;
            const b = await context.evaluateChip(compiled.b, context);
            return Boolean(b);
        },
    },

    logicalnot: {
        color: "purple-500",
        label: "Not",
        fields: [
            {
                type: "text",
                bind: "value",
                label: "Value",
                placeholder: "value",
                defaultValue: "",
            },
        ],
        info: "Returns the logical NOT of the given value",
        evaluate: async (compiled, context) => {
            const value = await context.evaluateChip(compiled.value, context);
            return !value;
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
                placeholder: "(self)",
                defaultValue: "",
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

            return targetGameObject.transform.rotation;
        },
    },

    lookVector: {
        color: "red-500",
        label: "Look Vector",
        info: "Gets the look vector of the player",
        fields: [],
        evaluate: (compiled, context) => {
            const gameObject = context.gameObject as GameObject;
            return gameObject.getLookVector();
        },
    },

    valueGet: {
        color: "orange-500",
        label: "Value Get",
        info: "Returns the value of the Value object specified",
        fields: [
            {
                type: "number",
                bind: "target",
                label: "Target",
                placeholder: "target",
            },
        ],
        evaluate: async (compiled, context) => {
            const targetRef = await context.evaluateChip(
                compiled.target,
                context
            );

            let targetGameObject;
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
                        `Value Get chip target resolution failed: ${error}`,
                        "Chip"
                    );
                    return null;
                }
            }

            if (!targetGameObject) {
                runtimeStore.warn(
                    "Value Get chip: no target object available",
                    "Chip"
                );
                return null;
            }

            return targetGameObject.getProperty("value") ?? null;
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
            if (isVecLike(a) && isVecLike(b)) {
                return new Types.BVector3(
                    (Number(a.x) || 0) + (Number(b.x) || 0),
                    (Number(a.y) || 0) + (Number(b.y) || 0),
                    (Number(a.z) || 0) + (Number(b.z) || 0)
                );
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
            if (isVecLike(a) && isVecLike(b)) {
                return new Types.BVector3(
                    (Number(a.x) || 0) - (Number(b.x) || 0),
                    (Number(a.y) || 0) - (Number(b.y) || 0),
                    (Number(a.z) || 0) - (Number(b.z) || 0)
                );
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
            if (isVecLike(a) && isVecLike(b)) {
                return new Types.BVector3(
                    (Number(a.x) || 0) * (Number(b.x) || 0),
                    (Number(a.y) || 0) * (Number(b.y) || 0),
                    (Number(a.z) || 0) * (Number(b.z) || 0)
                );
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
            if (isVecLike(a) && isVecLike(b)) {
                const bx = Number(b.x) || 0;
                const by = Number(b.y) || 0;
                const bz = Number(b.z) || 0;
                if (bx === 0 || by === 0 || bz === 0) {
                    runtimeStore.warn("Divide by zero", "Interpreter");
                    return new Types.BVector3(0, 0, 0);
                }
                return new Types.BVector3(
                    (Number(a.x) || 0) / bx,
                    (Number(a.y) || 0) / by,
                    (Number(a.z) || 0) / bz
                );
            }

            runtimeStore.warn(
                `Divide chip: unsupported input types. A: ${typeof a}, B: ${typeof b}. Returning 0.`,
                "Interpreter"
            );
            return 0;
        },
    },

    abs: {
        color: "orange-500",
        label: "Absolute",
        info: "Returns the absolute value of a number or vector",
        fields: [
            {
                type: "number",
                bind: "value",
                label: "Value",
                placeholder: "Value",
                defaultValue: 0,
            },
        ],
        evaluate: async (compiled, context) => {
            const value = await context.evaluateChip(compiled.value, context);

            if (typeof value === "number") {
                return Math.abs(value);
            }
            if (isVecLike(value)) {
                return new Types.BVector3(
                    Math.abs(Number(value.x) || 0),
                    Math.abs(Number(value.y) || 0),
                    Math.abs(Number(value.z) || 0)
                );
            }

            runtimeStore.warn(
                `Absolute chip: unsupported input type: ${typeof value}. Returning 0.`,
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
                placeholder: "mouse button",
                defaultValue: "left",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Middle", value: "middle" },
                    { label: "Right", value: "right" },
                ],
            },
        ],
        evaluate: (compiled, _context) => {
            const button = compiled.button || "left";
            return runtimeStore.getMouseButton(button);
        },
    },

    raycastdistance: {
        color: "blue-600",
        label: "Raycast Distance",
        info: "Casts a ray and returns the hit distance (0 if no hit)",
        fields: [
            {
                type: "text",
                bind: "origin",
                label: "Origin",
                placeholder: "(self position)",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "direction",
                label: "Direction",
                placeholder: "(direction vector)",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            const hit = await performRaycast(compiled, context);
            return hit.hit ? hit.distance : 0;
        },
    },

    raycastpoint: {
        color: "blue-600",
        label: "Raycast Point",
        info: "Casts a ray and returns the hit point as a Vector3 (null if no hit)",
        fields: [
            {
                type: "text",
                bind: "origin",
                label: "Origin",
                placeholder: "(self position)",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "direction",
                label: "Direction",
                placeholder: "(direction vector)",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            const hit = await performRaycast(compiled, context);
            if (!hit.hit || !hit.point) return null;
            return new Types.BVector3(hit.point.x, hit.point.y, hit.point.z);
        },
    },

    raycastobject: {
        color: "blue-600",
        label: "Raycast Object",
        info: "Casts a ray and returns the hit object id (empty string if no hit)",
        fields: [
            {
                type: "text",
                bind: "origin",
                label: "Origin",
                placeholder: "(self position)",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "direction",
                label: "Direction",
                placeholder: "(direction vector)",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            const hit = await performRaycast(compiled, context);
            return hit.hit && hit.objectId ? hit.objectId : "";
        },
    },

    cameraraydistance: {
        color: "blue-500",
        label: "Camera Ray Distance",
        info: "Raycasts from the active camera through the mouse and returns distance (0 if no hit)",
        fields: [
            {
                type: "text",
                bind: "mouseX",
                label: "Mouse X (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "mouseY",
                label: "Mouse Y (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            void context; // context not needed beyond helpers
            const hit = await performCameraRaycast(compiled, context);
            return hit.hit ? hit.distance : 0;
        },
    },

    cameraraypoint: {
        color: "blue-500",
        label: "Camera Ray Point",
        info: "Raycasts from the active camera through the mouse and returns the hit point",
        fields: [
            {
                type: "text",
                bind: "mouseX",
                label: "Mouse X (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "mouseY",
                label: "Mouse Y (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            const hit = await performCameraRaycast(compiled, context);
            if (!hit.hit || !hit.point) return null;
            return new Types.BVector3(hit.point.x, hit.point.y, hit.point.z);
        },
    },

    camerarayobject: {
        color: "blue-500",
        label: "Camera Ray Object",
        info: "Raycasts from the active camera through the mouse and returns the hit object id",
        fields: [
            {
                type: "text",
                bind: "mouseX",
                label: "Mouse X (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "text",
                bind: "mouseY",
                label: "Mouse Y (optional)",
                placeholder: "",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "maxDistance",
                label: "Max Dist",
                placeholder: "1000",
                defaultValue: 1000,
            },
        ],
        evaluate: async (compiled, context) => {
            const hit = await performCameraRaycast(compiled, context);
            console.log("RAYCAST", hit);
            return hit.hit && hit.objectId ? hit.objectId : "";
        },
    },

    overlapsphere: {
        color: "blue-400",
        label: "Overlap Sphere",
        info: "Returns ids of colliders within a radius around a point",
        fields: [
            {
                type: "text",
                bind: "center",
                label: "Center",
                placeholder: "(self position)",
                defaultValue: "",
            },
            {
                type: "number",
                bind: "radius",
                label: "Radius",
                placeholder: "Radius",
                defaultValue: 5,
            },
        ],
        evaluate: async (compiled, context) => {
            const centerRaw = await evaluateField(compiled.center, context);
            const radiusRaw = await evaluateField(compiled.radius, context);
            const centerVec = toThreeVector(centerRaw);
            const radius = toNumber(radiusRaw ?? compiled.radius ?? 1, 1);
            return overlapSphere(centerVec, radius);
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
        color: chipConfig[type].color,
        label: chipConfig[type].label,
        info: chipConfig[type].info,
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
        color: config.color,
        label: config.label,
        info: config.info,
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
