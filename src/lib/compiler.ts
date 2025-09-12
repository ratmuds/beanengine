/**
 * Compilation utilities for converting UI chip data to runtime-friendly format
 */
import { chipConfig, type RuntimeContext } from "./chipConfig.js";

export interface CompiledValue {
    type: "literal" | "variable";
    value: any;
    variableName?: string;
}

export interface CompiledItem {
    type: string;
    [key: string]: any;
}

/**
 * Compiles a chip instance to runtime format, stripping UI metadata and flattening structure
 */
export function compileItem(chip: any): CompiledItem | null {
    console.log("COMPILING", chip);
    if (!chip) return null;

    // Start with base chip data
    const compiled: CompiledItem = {
        type: chip.type,
    };

    // Handle blocks and chips - blocks can have params or fields, chips have fields
    if (chip.params) {
        // Code block with params, compile the parameters
        for (const [paramName, paramValue] of Object.entries(chip.params)) {
            compiled[paramName] = compileValue(paramValue);
        }

        // Recursively compile children
        if (chip.children && Array.isArray(chip.children)) {
            console.log("COMPILING CHILDREN", chip.children);
            compiled.children = chip.children
                .map((child) => compileItem(child))
                .filter(Boolean);
        }
    } else if (chip.fields) {
        // Chip with fields (or block with fields like if statements)
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

        // Handle children for blocks with fields (like if statements)
        if (chip.children && Array.isArray(chip.children)) {
            console.log("COMPILING CHILDREN FOR BLOCK WITH FIELDS", chip.children);
            compiled.children = chip.children
                .map((child: any) => compileItem(child))
                .filter(Boolean);
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
        return compileItem(value);
    }

    return value; // Unknown structure, pass through
}

/**
 * Compiles an array of script items (commands/chips) to runtime format
 */
export function compileScript(scriptItems: any[]): CompiledItem[] {
    return scriptItems.map((item) => compileItem(item)).filter(Boolean);
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

/**
 * Creates the evaluateChip function for runtime context
 */
export function createEvaluateChip(): (
    compiledChip: CompiledItem | any,
    context: RuntimeContext
) => Promise<any> {
    return async function evaluateChip(
        compiledChip: CompiledItem | any,
        context: RuntimeContext
    ): Promise<any> {
        // Handle literal values (numbers, strings, etc.)
        if (typeof compiledChip !== "object" || compiledChip === null) {
            return compiledChip;
        }

        // Handle variable references
        if (compiledChip.type === "variable") {
            // This will be handled by the variable chip's evaluate function
            const config = chipConfig["variable"];
            if (config?.evaluate) {
                return await config.evaluate(compiledChip, context);
            }
            // Fallback: return the variable name if no context
            return compiledChip.name;
        }

        // Handle other chip types
        if (compiledChip.type && chipConfig[compiledChip.type]) {
            const config = chipConfig[compiledChip.type];
            if (config.evaluate) {
                return await config.evaluate(
                    compiledChip,
                    context
                );
            }
        }

        // Default: return the value as-is
        return compiledChip;
    };
}

/**
 * Creates a runtime context with variables and evaluation capability
 */
export function createRuntimeContext(
    variables: Record<string, { value: any; type: "number" | "string" | "boolean" | "object" }>
): RuntimeContext {
    const context: RuntimeContext = {
        variables,
        evaluateChip: null as any, // Will be set below
    };

    // Create the evaluateChip function for the context
    context.evaluateChip = createEvaluateChip();

    return context;
}
