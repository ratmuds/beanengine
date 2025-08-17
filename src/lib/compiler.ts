/**
 * Compilation utilities for converting UI chip data to runtime-friendly format
 */
import { chipConfig } from "./chipConfig.js";

export interface CompiledValue {
    type: "literal" | "variable";
    value: any;
    variableName?: string;
}

export interface CompiledChip {
    type: string;
    [key: string]: any;
}

/**
 * Compiles a chip instance to runtime format, stripping UI metadata and flattening structure
 */
export function compileChip(chip: any): CompiledChip {
    if (!chip) return null;

    // Start with base chip data
    const compiled: CompiledChip = {
        type: chip.type,
    };

    // Handle blocks and chips - blocks have params, chips have fields
    if (chip.params) {
        // Code block, compile the parameters
        for (const [paramName, paramValue] of Object.entries(chip.params)) {
            compiled[paramName] = compileValue(paramValue);
        }

        // Recursively compile children
        if (chip.children && Array.isArray(chip.children)) {
            compiled.children = chip.children
                .map((child) => compileChip(child))
                .filter(Boolean);
        }
    } else if (chip.fields) {
        // Chip with fields
        for (const field of chip.fields) {
            const fieldName = field.bind;

            // Check if field has chip inputs (chips take priority over direct values)
            if (field.inputs && field.inputs.length > 0) {
                const inputChip = field.inputs[0]; // Take first chip (priority)
                compiled[fieldName] = compileValue(inputChip);
            } else {
                // Use direct value from chip
                const directValue = chip[fieldName];
                if (directValue !== undefined && directValue !== "") {
                    compiled[fieldName] = directValue;
                } else {
                    // Use default value if available
                    compiled[fieldName] = getDefaultValueForField(field);
                }
            }
        }
    }

    return compiled;
}

/**
 * Compiles a value (could be literal, chip, or variable reference)
 */
function compileValue(value: any): any {
    if (!value || typeof value !== "object") {
        return value; // Literal value
    }

    if (value.type === "variable") {
        // Variable reference
        return {
            type: "variable",
            name: value.name || "",
        };
    } else if (value.type) {
        // Nested chip - recursively compile
        return compileChip(value);
    }

    return value; // Unknown structure, pass through
}

/**
 * Compiles an array of script items (commands/chips) to runtime format
 */
export function compileScript(scriptItems: any[]): CompiledChip[] {
    return scriptItems.map((item) => compileChip(item)).filter(Boolean);
}

/**
 * Gets default value for a field based on its type and config
 */
function getDefaultValueForField(field: any): any {
    // Use configured default value if available
    if (field.defaultValue !== undefined) {
        return field.defaultValue;
    }

    // Fallback based on type
    switch (field.type) {
        case "number":
            return 0;
        case "string":
        case "text":
            return "";
        case "dropdown":
            return null;
        case "boolean":
            return false;
        default:
            return null;
    }
}
