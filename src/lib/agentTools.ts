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
  position?: { x: number; y: number; z: number };
  size?: { x: number; y: number; z: number };
}): Promise<ToolResult> {
  try {
    const { objectType, name, position, size } = args;

    // Validate object type
    const validTypes = ["part", "camera"];
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

    // Create the object with the provided name
    const newObject = sceneStore.createObject(normalizedType, -1, { name });

    // Set position if provided
    if (position && newObject instanceof Types.BNode3D) {
      newObject.position = new Types.BVector3(
        position.x ?? 0,
        position.y ?? 0,
        position.z ?? 0
      );
    }

    // Set size if provided and applicable
    if (size && newObject instanceof Types.BPart && normalizedType === "part") {
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
  value: string;
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

    // Handle different property types
    const normalizedProperty = property.toLowerCase();

    // Update the object in the store
    sceneStore.updateObject(object);

    return {
      success: true,
      message: `Modified ${property} of object "${object.name}" (ID: ${objectId})`,
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
      message: `Deleted object "${objectName}" (ID: ${objectId})`,
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
async function executeListObjects(args: {
  type?: string;
}): Promise<ToolResult> {
  try {
    const scene = sceneStore.getScene();
    let objects = scene.objects;

    // Filter by type if specified
    if (args.type) {
      const normalizedType = args.type.toLowerCase();
      objects = objects.filter(
        (obj) => obj.type.toLowerCase() === normalizedType
      );
    }

    const objectList = objects.map((obj) => ({
      id: obj.id,
      name: obj.name,
      type: obj.type,
    }));

    return {
      success: true,
      message: `Found ${objectList.length} object(s)${
        args.type ? ` of type ${args.type}` : ""
      }`,
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
        message: `Viewing object "${object.name}" (ID: ${objectId})`,
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
            enum: ["part", "camera"],
            description:
              "The type of object to create. part is a 3D mesh (cube/sphere), camera is a camera",
          },
          name: {
            type: "string",
            description:
              'Name for the object (e.g., "Red Cube", "Main Camera")',
          },
          position: {
            type: "object",
            properties: {
              x: { type: "number", description: "X coordinate" },
              y: { type: "number", description: "Y coordinate" },
              z: { type: "number", description: "Z coordinate" },
            },
            description:
              "Position in 3D space. Optional, defaults to (0, 0, 0)",
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
        "Modifies properties of an existing object in the scene. Use this to change position, rotation, scale, name, or other properties. Use the view_object tool to view all possible properties.",
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
      (result.data ? `\nData: ${JSON.stringify(result.data)}` : "")
    );
  } else {
    return `Error: ${result.message}`;
  }
}
