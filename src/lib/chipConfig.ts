import * as Types from "$lib/types";

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
    evaluate?: (chipInstance: any, context?: any) => Promise<any> | any; // chipInstance = the actual chip data, context = runtime
}

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
        evaluate: (chipInstance, context) => {
            let chipName = chipInstance.name; // Get the name from this specific chip instance

            if (typeof chipName === "object") {
                // If the name is an object (nested chip), we need to evaluate it
                // We need to find the chip's config and call its evaluate function
                const nestedChipConfig = chipConfig[chipName.type];
                if (nestedChipConfig && nestedChipConfig.evaluate) {
                    chipName = nestedChipConfig.evaluate(chipName, context);
                } else {
                    console.warn(
                        `No evaluate function found for nested chip type: ${chipName.type}`
                    );
                }
            }

            return context?.variables?.[chipName].name || chipName; // Use the evaluated chipName
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
        evaluate: async (chipInstance, context) => {
            // For each field (x, y, z), check if a chip is connected in the 'inputs' array.
            // If so, evaluate that chip. Otherwise, use the literal value.
            const getFieldValue = async (bindName) => {
                const field = chipInstance.fields.find(f => f.bind === bindName);
                if (field && field.inputs && field.inputs.length > 0) {
                    return await context.evaluateChip(field.inputs[0]);
                }
                return chipInstance[bindName]; // Fallback to literal value
            };

            const x = await getFieldValue('x');
            const y = await getFieldValue('y');
            const z = await getFieldValue('z');

            return new Types.BVector3(parseFloat(x) || 0, parseFloat(y) || 0, parseFloat(z) || 0);
        },
    },
};

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
            chipConfig[type].fields.map((field) => [field.bind, field.defaultValue ?? ""])
        ),
        fields: chipConfig[type].fields.map((field) => ({
            ...field,
            inputs: [],
        })),
    }));
}