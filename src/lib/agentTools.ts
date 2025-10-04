/**
 * Agent Tools System
 *
 * This file defines all the tools available to the AI agent and their execution logic.
 * Each tool has a schema definition and an execution function.
 */

import { sceneStore } from "$lib/sceneStore";
import * as Types from "$lib/types";
import type { Tool } from "$lib/api";
import { BVector3 } from "$lib/types";
import { materialStore } from "$lib/materialStore";
import { assetStore } from "$lib/assetStore";

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ToolResult {
    success: boolean;
    message: string;
    data?: any;
}

// ============================================================================
// Tool Execution Functions
// ============================================================================

/**
 * Creates a 3D object in the scene
 */
async function executeCreateObject(args: {
    objectType: string;
    name: string;
    parentId?: string;
    position?: { x: number; y: number; z: number };
    size?: { x: number; y: number; z: number };
}): Promise<ToolResult> {
    try {
        const { objectType, name, parentId, position, size } = args;

        // Validate object type
        const validTypes = [
            "part",
            "camera",
            "light",
            "script",
            "playercontroller",
            "mesh",
            "waypoint",
            "waypointpath",
        ];
        const normalizedType = objectType.toLowerCase();

        console.log(
            `Creating ${normalizedType} named "${name}" at position ${JSON.stringify(
                position
            )}`
        );

        if (!validTypes.includes(normalizedType)) {
            return {
                success: false,
                message: `Invalid object type: ${objectType}. Valid types are: ${validTypes.join(
                    ", "
                )}`,
            };
        }

        const parent = parentId || -1;
        // Create the object with the provided name
        const newObject = sceneStore.createObject(normalizedType, parent, {
            name,
        });

        // Set position if provided
        if (position && newObject instanceof Types.BNode3D) {
            newObject.position = new Types.BVector3(
                position.x ?? 0,
                position.y ?? 0,
                position.z ?? 0
            );
        }

        // Set size if provided and applicable
        if (
            size &&
            newObject instanceof Types.BPart &&
            normalizedType === "part"
        ) {
            newObject.scale = new Types.BVector3(
                size.x ?? 1,
                size.y ?? 1,
                size.z ?? 1
            );
        }

        return {
            success: true,
            message: `Created ${objectType} named "${name}" with ID ${newObject.id}`,
            data: {
                id: newObject.id,
                name: newObject.name,
                type: objectType,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error creating object: ${error.message}`,
        };
    }
}

/**
 * Modifies properties of an existing object
 */
async function executeModifyObject(args: {
    objectId: string;
    property: string;
    value: any;
}): Promise<ToolResult> {
    try {
        const { objectId, property, value } = args;

        // Find the object
        const object = sceneStore.getObjectById(objectId);

        if (!object) {
            return {
                success: false,
                message: `Object with ID ${objectId} not found`,
            };
        }

        // Use 'any' to allow dynamic property access
        const objectToModify = object as any;

        // Handle different property types
        const normalizedProperty = property.toLowerCase();

        // Special handling for vector properties
        if (["position", "rotation", "scale"].includes(normalizedProperty)) {
            try {
                const vecValues = String(value)
                    .split(",")
                    .map((s: string) => parseFloat(s.trim()));
                if (vecValues.length !== 3 || vecValues.some(isNaN)) {
                    return {
                        success: false,
                        message: `Invalid vector format for ${property}. Expected 'x, y, z'`,
                    };
                }
                objectToModify[property] = new Types.BVector3(
                    vecValues[0],
                    vecValues[1],
                    vecValues[2]
                );
            } catch (e: any) {
                return {
                    success: false,
                    message: `Error parsing vector value for ${property}: ${e.message}`,
                };
            }
        } else if (typeof objectToModify[property] === "boolean") {
            objectToModify[property] = ["true", "1", "yes", "on"].includes(
                String(value).toLowerCase()
            );
        } else if (typeof objectToModify[property] === "number") {
            const num = parseFloat(value);
            if (isNaN(num)) {
                return {
                    success: false,
                    message: `Invalid number format for ${property}: ${value}`,
                };
            }
            objectToModify[property] = num;
        } else {
            // For other properties (like name, material), assign as string
            objectToModify[property] = value;
        }

        // Update the object in the store
        sceneStore.updateObject(object);

        return {
            success: true,
            message: `Modified ${property} of object "${object.name}"`,
            data: {
                id: objectId,
                property,
                value,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error modifying object: ${error.message}`,
        };
    }
}

/**
 * Deletes an object from the scene
 */
async function executeDeleteObject(args: {
    objectId: string;
}): Promise<ToolResult> {
    try {
        const { objectId } = args;

        // Find the object
        const object = sceneStore.getObjectById(objectId);

        if (!object) {
            return {
                success: false,
                message: `Object with ID ${objectId} not found`,
            };
        }

        const objectName = object.name;

        // Remove the object
        sceneStore.removeObject(object);

        return {
            success: true,
            message: `Deleted object "${objectName}"`,
            data: {
                id: objectId,
                name: objectName,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error deleting object: ${error.message}`,
        };
    }
}

/**
 * Lists all objects in the scene
 */
async function executeListObjects(): Promise<ToolResult> {
    try {
        const scene = sceneStore.getScene();
        const objects = scene.objects;

        const objectList = objects.map((obj) => ({
            id: obj.id,
            name: obj.name,
            type: obj.type,
        }));

        return {
            success: true,
            message: `Found ${objectList.length} object(s) in the scene`,
            data: {
                count: objectList.length,
                objects: objectList,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error listing objects: ${error.message}`,
        };
    }
}

async function executeViewObject(args: {
    objectId: string;
}): Promise<ToolResult> {
    try {
        const { objectId } = args;

        // Find the object
        const object = sceneStore.getObjectById(objectId);

        if (!object) {
            return {
                success: false,
                message: `Object with ID ${objectId} not found`,
            };
        }

        try {
            const objectData = JSON.parse(
                JSON.stringify(object, (key, value) => {
                    // Convert BVector3 to plain object
                    if (value instanceof BVector3) {
                        return { x: value.x, y: value.y, z: value.z };
                    }

                    // Special handling for children, only include IDs and names to avoid circular references
                    if (key === "children") {
                        return value.map((child: any) => ({
                            id: child.id,
                            name: child.name,
                        }));
                    }

                    return value;
                })
            );

            return {
                success: true,
                message: `Viewing object "${object.name}"`,
                data: objectData,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error viewing object: ${error.message}`,
            };
        }
    } catch (error: any) {
        return {
            success: false,
            message: `Error viewing object: ${error.message}`,
        };
    }
}

/**
 * Lists all available materials
 */
async function executeListMaterials(): Promise<ToolResult> {
    try {
        const materials = materialStore.getAllMaterials();
        const materialList = materials.map((mat) => ({
            id: mat.id,
            name: mat.name,
            builtin: mat.builtin,
        }));

        return {
            success: true,
            message: `Found ${materialList.length} material(s)`,
            data: {
                count: materialList.length,
                materials: materialList,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error listing materials: ${error.message}`,
        };
    }
}

/**
 * Lists all available assets
 */
async function executeListAssets(): Promise<ToolResult> {
    try {
        const assets = assetStore.getAllAssets();
        const assetList = assets.map((asset) => ({
            id: asset.metadata.id,
            name: asset.metadata.name,
            type: asset.metadata.type,
            fileType: asset.metadata.fileType,
        }));

        return {
            success: true,
            message: `Found ${assetList.length} asset(s)`,
            data: {
                count: assetList.length,
                assets: assetList,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error listing assets: ${error.message}`,
        };
    }
}

/**
 * Creates a new material
 */
async function executeCreateMaterial(args: {
    name: string;
    colorMap: string;
    displacementMap?: string;
    normalMap?: string;
    roughnessMap?: string;
    metalnessMap?: string;
}): Promise<ToolResult> {
    try {
        const {
            name,
            colorMap,
            displacementMap,
            normalMap,
            roughnessMap,
            metalnessMap,
        } = args;

        // Validate that the colorMap asset exists
        const colorMapAsset = assetStore.getAsset(colorMap);
        if (!colorMapAsset) {
            return {
                success: false,
                message: `Color map asset with ID ${colorMap} not found`,
            };
        }

        // Create the material
        const material = await materialStore.addMaterial(name);
        materialStore.updateMaterialProperty(material.id, {
            textures: {
                color: colorMap,
                displacement: displacementMap || "",
                normal: normalMap || "",
                roughness: roughnessMap || "",
                metallic: metalnessMap || "",
            },
        });

        return {
            success: true,
            message: `Created material "${name}"`,
            data: {
                id: material.id,
                name,
            },
        };
    } catch (e) {
        return {
            success: false,
            message: `Error creating material: ${e.message}`,
        };
    }
}

/**
 * Gets details for a specific material
 */
async function executeGetMaterialDetails(args: {
    materialId: string;
}): Promise<ToolResult> {
    try {
        const { materialId } = args;
        const material = materialStore.getMaterial(materialId);

        if (!material) {
            return {
                success: false,
                message: `Material with ID ${materialId} not found`,
            };
        }

        return {
            success: true,
            message: `Viewing details for material "${material.name}"`,
            data: material,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error getting material details: ${error.message}`,
        };
    }
}

/**
 * Gets details for a specific asset
 */
async function executeGetAssetDetails(args: {
    assetId: string;
}): Promise<ToolResult> {
    try {
        const { assetId } = args;
        const asset = assetStore.getAsset(assetId);

        if (!asset) {
            return {
                success: false,
                message: `Asset with ID ${assetId} not found`,
            };
        }

        return {
            success: true,
            message: `Viewing details for asset "${asset.metadata.name}"`,
            data: asset.metadata,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error getting asset details: ${error.message}`,
        };
    }
}

async function executeReparentObject(args: {
    objectId: string;
    newParentId: string;
}): Promise<ToolResult> {
    try {
        const { objectId, newParentId } = args;

        const parentId = newParentId === "-1" ? -1 : newParentId;

        sceneStore.reparentObject(objectId, parentId);

        const object = sceneStore.getObjectById(objectId);
        const parentObject =
            parentId !== -1 ? sceneStore.getObjectById(String(parentId)) : null;

        return {
            success: true,
            message: `Reparented object "${object?.name}" to "${
                parentObject?.name || "root"
            }"`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error reparenting object: ${error.message}`,
        };
    }
}

async function executeViewScript(args: {
    scriptId: string;
}): Promise<ToolResult> {
    try {
        const { scriptId } = args;
        const object = sceneStore.getObjectById(scriptId);

        if (!object || !(object instanceof Types.BScript)) {
            return {
                success: false,
                message: `Script with ID ${scriptId} not found`,
            };
        }

        return {
            success: true,
            message: `Viewing code for script "${object.name}"`,
            data: {
                code: object.code,
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error viewing script: ${error.message}`,
        };
    }
}

async function executeUpdateScript(args: {
    scriptId: string;
    code: string;
}): Promise<ToolResult> {
    try {
        const { scriptId, code } = args;
        const object = sceneStore.getObjectById(scriptId);

        if (!object || !(object instanceof Types.BScript)) {
            return {
                success: false,
                message: `Script with ID ${scriptId} not found`,
            };
        }

        let newCode;
        try {
            newCode = JSON.parse(code);
            if (!Array.isArray(newCode)) {
                throw new Error("Code must be a JSON array of blocks.");
            }
        } catch (e: any) {
            return {
                success: false,
                message: `Invalid code format. Must be a valid JSON array string. ${e.message}`,
            };
        }

        object.code = newCode;
        sceneStore.updateObject(object);

        return {
            success: true,
            message: `Script ${object.name} updated successfully`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error updating script: ${error.message}`,
        };
    }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const AGENT_TOOLS: Tool[] = [
    {
        type: "function",
        function: {
            name: "create_object",
            description:
                "Creates a new 3D object in the scene. Use this when the user wants to add objects like cubes, cameras, lights, or folders.",
            parameters: {
                type: "object",
                properties: {
                    objectType: {
                        type: "string",
                        enum: [
                            "part",
                            "camera",
                            "light",
                            "script",
                            "playercontroller",
                            "mesh",
                            "waypoint",
                            "waypointpath",
                        ],
                        description:
                            "The type of object to create. Examples: part, camera, light, script, playercontroller, mesh, waypoint, waypointpath.",
                    },
                    name: {
                        type: "string",
                        description:
                            'Name for the object (e.g., "Red Cube", "Main Camera")',
                    },
                    parentId: {
                        type: "string",
                        description:
                            "Optional ID of the parent object. If not provided, the object will be created at the root of the scene.",
                    },
                    position: {
                        type: "object",
                        properties: {
                            x: { type: "number", description: "X coordinate" },
                            y: { type: "number", description: "Y coordinate" },
                            z: { type: "number", description: "Z coordinate" },
                        },
                        description:
                            "Position in 3D space. Optional, defaults to (0, 0, 0). Applies to 3D objects only.",
                    },
                    size: {
                        type: "object",
                        properties: {
                            x: { type: "number", description: "Width" },
                            y: { type: "number", description: "Height" },
                            z: { type: "number", description: "Depth" },
                        },
                        description:
                            "Size dimensions. Optional, defaults to (1, 1, 1) for parts",
                    },
                },
                required: ["objectType", "name"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "modify_object",
            description:
                "Modifies properties of an existing object in the scene. Use this to change position, rotation, scale, name, material, or other properties. Use the view_object tool to view all possible properties. To apply a material, use the 'material' property and the material's ID from 'list_materials'.",
            parameters: {
                type: "object",
                properties: {
                    objectId: {
                        type: "string",
                        description:
                            "The ID of the object to modify. Get this from list_objects first.",
                    },
                    property: {
                        type: "string",
                        description: "The property to modify",
                    },
                    value: {
                        type: "string",
                        description:
                            "The new value. For Vector3 properties, use the format: x, y, z. For colors, use hex (#ffffff). For booleans, use true or false. For strings, use the desired text.",
                    },
                },
                required: ["objectId", "property", "value"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "delete_object",
            description:
                "Deletes an object from the scene. Use this when the user wants to remove an object.",
            parameters: {
                type: "object",
                properties: {
                    objectId: {
                        type: "string",
                        description: "The ID of the object to delete",
                    },
                },
                required: ["objectId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "view_object",
            description:
                "Returns the properties of a specific object. Use this to inspect an object's details before modifying it.",
            parameters: {
                type: "object",
                properties: {
                    objectId: {
                        type: "string",
                        description: "The ID of the object to view",
                    },
                },
                required: ["objectId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_objects",
            description:
                "Lists all objects in the scene. Use this to get an overview of the current scene. You need to run this to get the necessary id to modify or delete an object.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_materials",
            description:
                "Lists all available materials in the project, including built-in ones. Use this to find materials to apply to objects.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_assets",
            description:
                "Lists all available assets in the project (e.g., 3D models, textures). Use this to find assets to use in the scene.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_material_details",
            description: "Gets detailed information about a specific material.",
            parameters: {
                type: "object",
                properties: {
                    materialId: {
                        type: "string",
                        description:
                            "The ID of the material to inspect. Get this from list_materials.",
                    },
                },
                required: ["materialId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_material",
            description: "Creates a new material.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The name of the material.",
                    },
                    colorMap: {
                        type: "string",
                        description:
                            "ID of a texture asset to use as the color map. Get this from list_assets.",
                    },
                    displacementMap: {
                        type: "string",
                        description: "ID of a texture asset.",
                    },
                    normalMap: {
                        type: "string",
                        description: "ID of a texture asset.",
                    },
                    roughnessMap: {
                        type: "string",
                        description: "ID of a texture asset.",
                    },
                    metalnessMap: {
                        type: "string",
                        description: "ID of a texture asset.",
                    },
                },
                required: ["name", "colorMap"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_asset_details",
            description: "Gets detailed information about a specific asset.",
            parameters: {
                type: "object",
                properties: {
                    assetId: {
                        type: "string",
                        description:
                            "The ID of the asset to inspect. Get this from list_assets.",
                    },
                },
                required: ["assetId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "reparent_object",
            description:
                "Moves an object under a new parent in the scene hierarchy.",
            parameters: {
                type: "object",
                properties: {
                    objectId: {
                        type: "string",
                        description: "The ID of the object to move.",
                    },
                    newParentId: {
                        type: "string",
                        description:
                            "The ID of the new parent object. Use '-1' to move the object to the root of the scene.",
                    },
                },
                required: ["objectId", "newParentId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "view_script",
            description:
                "Returns the code of a specific script as a JSON array.",
            parameters: {
                type: "object",
                properties: {
                    scriptId: {
                        type: "string",
                        description:
                            "The ID of the script to view. Get this from list_objects.",
                    },
                },
                required: ["scriptId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_script",
            description:
                "Updates the code of a specific script. The code must be a valid JSON string representing an array of code blocks.",
            parameters: {
                type: "object",
                properties: {
                    scriptId: {
                        type: "string",
                        description: "The ID of the script to update.",
                    },
                    code: {
                        type: "string",
                        description:
                            "A JSON string representing the new code array. Get the structure by using view_script first.",
                    },
                },
                required: ["scriptId", "code"],
            },
        },
    },
];

// ============================================================================
// Tool Execution Registry
// ============================================================================

type ToolExecutor = (args: any) => Promise<ToolResult>;

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
    create_object: executeCreateObject,
    modify_object: executeModifyObject,
    delete_object: executeDeleteObject,
    list_objects: executeListObjects,
    view_object: executeViewObject,
    list_materials: executeListMaterials,
    create_material: executeCreateMaterial,
    list_assets: executeListAssets,
    get_material_details: executeGetMaterialDetails,
    get_asset_details: executeGetAssetDetails,
    reparent_object: executeReparentObject,
    view_script: executeViewScript,
    update_script: executeUpdateScript,
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Executes a tool call and returns the result
 */
export async function executeTool(
    toolName: string,
    argsJson: string
): Promise<ToolResult> {
    try {
        // Find the executor
        const executor = TOOL_EXECUTORS[toolName];

        if (!executor) {
            return {
                success: false,
                message: `Unknown tool: ${toolName}`,
            };
        }

        // Parse arguments
        let args: any;
        try {
            args = JSON.parse(argsJson);
        } catch (error) {
            return {
                success: false,
                message: `Invalid JSON arguments: ${argsJson}`,
            };
        }

        // Execute the tool
        const result = await executor(args);
        return result;
    } catch (error: any) {
        return {
            success: false,
            message: `Tool execution error: ${error.message}`,
        };
    }
}

/**
 * Formats a tool result as a message for the AI
 */
export function formatToolResult(result: ToolResult): string {
    if (result.success) {
        return (
            result.message +
            (result.data
                ? `
Data: ${JSON.stringify(result.data)}`
                : "")
        );
    } else {
        return `Error: ${result.message}`;
    }
}
