import { Type, Plus, Hash } from "lucide-svelte";

export interface ChipField {
    type: string;
    bind: string;
    label?: string;
    placeholder: string;

    // Type specific getters
    getDropdownOptions?: () => string[];
}

export interface ChipConfig {
    color: string;
    label: string;
    fields: ChipField[];
    info: string;
    evaluate?: (chipInstance: any, context?: any) => any; // chipInstance = the actual chip data, context = runtime
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
};

export function generateAvailableChips() {
    return Object.keys(chipConfig).map((type) => ({
        id: type,
        type,
        // Copy all config properties
        color: chipConfig[type].color,
        label: chipConfig[type].label,
        info: chipConfig[type].info,
        // Initialize field values to empty
        data: {
            ...Object.fromEntries(
                chipConfig[type].fields.map((field) => [field.bind, ""])
            ),
        },
        fields: chipConfig[type].fields.map(field => ({
            ...field,
            inputs: []
        })),
    }));
}
