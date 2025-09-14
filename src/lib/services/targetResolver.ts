/**
 * Target Resolution Service
 * 
 * Resolves target references in scripts and chips against RUNTIME GameObjects only.
 * Supports path-based navigation (., .., ./child, ../sibling) and lookup queries (#id, @name, $type).
 */

import { runtimeStore } from "$lib/runtimeStore";
import type { GameObject } from "$lib/runtime/GameObject";
import type { RuntimeContext } from "$lib/chipConfig";

export interface TargetResolutionResult {
    success: boolean;
    target?: GameObject;
    error?: string;
}

/**
 * Resolves a target reference string to an actual GameObject
 * 
 * @param targetRef - The target reference string (path, id, name, etc.)
 * @param context - Runtime context containing current object and scene info
 * @returns Resolution result with target GameObject or error
 */
export function resolveTarget(
    targetRef: string | undefined | null,
    context: RuntimeContext
): TargetResolutionResult {
    // Handle empty/undefined reference - defaults to current object
    if (!targetRef || targetRef.trim() === "" || targetRef === "(self)") {
        if (context.gameObject) {
            return {
                success: true,
                target: context.gameObject,
            };
        } else {
            return {
                success: false,
                error: "No current object available (script may be running at scene level)",
            };
        }
    }

    const ref = targetRef.trim();

    try {
        // Handle different reference types
        if (ref.startsWith("#id:")) {
            return resolveById(ref.substring(4).trimStart());
        } else if (ref.startsWith("@name:")) {
            return resolveByName(ref.substring(6).trimStart());
        } else if (ref.startsWith("$first:")) {
            return resolveByType(ref.substring(7).trimStart());
        } else if (ref.startsWith("/")) {
            return resolveAbsolutePath(ref);
        } else {
            return resolveRelativePath(ref, context);
        }
    } catch (error) {
        return {
            success: false,
            error: `Failed to resolve target '${targetRef}': ${error}`,
        };
    }
}

/**
 * Resolve target by ID lookup (GameObject id)
 */
function resolveById(id: string): TargetResolutionResult {
    const gameObjectManager = runtimeStore.getGameObjectManager();
    if (!gameObjectManager) {
        return { success: false, error: "GameObjectManager not available" };
    }

    const go = gameObjectManager.getGameObject(id);
    if (!go) {
        return { success: false, error: `GameObject with ID '${id}' not found` };
    }
    return { success: true, target: go };
}

/**
 * Resolve target by name lookup (first match)
 */
function resolveByName(name: string): TargetResolutionResult {
    const gameObjectManager = runtimeStore.getGameObjectManager();
    if (!gameObjectManager) {
        return { success: false, error: "GameObjectManager not available" };
    }

    const go = gameObjectManager.getAllGameObjects().find((g) => g.name === name) || null;
    if (!go) {
        return { success: false, error: `GameObject with name '${name}' not found` };
    }
    return { success: true, target: go };
}

/**
 * Resolve target by type lookup (first match)
 * Type should match the BNode constructor name (e.g., 'BPart', 'BCamera', 'BLight')
 */
function resolveByType(type: string): TargetResolutionResult {
    const gameObjectManager = runtimeStore.getGameObjectManager();
    if (!gameObjectManager) {
        return { success: false, error: "GameObjectManager not available" };
    }

    const go = gameObjectManager.getAllGameObjects().find((g) => g.nodeType === type) || null;
    if (!go) {
        return { success: false, error: `No GameObject of type '${type}' found` };
    }
    return { success: true, target: go };
}

/**
 * Resolve absolute path from scene root using GameObject hierarchy
 * Format: /objectName/childName/grandchildName
 */
function resolveAbsolutePath(path: string): TargetResolutionResult {
    const parts = path.split('/').filter((part) => part.length > 0);

    if (parts.length === 0) {
        return {
            success: false,
            error: "Invalid absolute path: empty path",
        };
    }

    const gameObjectManager = runtimeStore.getGameObjectManager();
    if (!gameObjectManager) {
        return { success: false, error: "GameObjectManager not available" };
    }

    // Start from root GameObjects
    const roots = gameObjectManager
        .getAllGameObjects()
        .filter((g) => g.getParent() === null);

    let current: GameObject | null = roots.find((g) => g.name === parts[0]) || null;
    if (!current) {
        return { success: false, error: `Root object '${parts[0]}' not found` };
    }

    // Navigate through the path
    for (let i = 1; i < parts.length; i++) {
        const childName = parts[i];
        const child: GameObject | null = current.findChildByName(childName);
        if (!child) {
            return {
                success: false,
                error: `Child '${childName}' not found in '${current.name}'`,
            };
        }
        current = child;
    }

    return { success: true, target: current };
}

/**
 * Resolve relative path from current GameObject
 * Formats: ., .., ./child, ../sibling, ../../uncle/cousin
 */
function resolveRelativePath(path: string, context: RuntimeContext): TargetResolutionResult {
    if (!context.gameObject) {
        return {
            success: false,
            error: "Cannot resolve relative path: no current object available",
        };
    }

    let current: GameObject | null = context.gameObject;
    const parts = path.split('/').filter((part) => part.length > 0);

    for (const part of parts) {
        if (part === '.') {
            continue; // stay on current
        } else if (part === '..') {
            if (current) {
                const parent = current.getParent();
                current = parent; // Allow null (scene root level)
            }
            // If current is already null (at scene root), stay at null
        } else {
            // Navigate to child by name
            if (!current) {
                // We're at scene root level, search among root GameObjects
                const gameObjectManager = runtimeStore.getGameObjectManager();
                if (!gameObjectManager) {
                    return { success: false, error: "GameObjectManager not available" };
                }
                
                const roots = gameObjectManager
                    .getAllGameObjects()
                    .filter((g) => g.getParent() === null);
                
                const found = roots.find((g) => g.name === part);
                if (!found) {
                    return {
                        success: false,
                        error: `Root object '${part}' not found`,
                    };
                }
                current = found;
            } else {
                // Navigate to child of current GameObject
                const child = current.findChildByName(part);
                if (!child) {
                    return {
                        success: false,
                        error: `Child '${part}' not found in '${current.name}'`,
                    };
                }
                current = child;
            }
        }
    }

    if (!current) {
        return {
            success: false,
            error: "Path resolved to scene root, but no specific object was targeted",
        };
    }

    return { success: true, target: current };
}

/**
 * Convenience function to resolve target and return GameObject or null
 */
export function resolveTargetGameObject(
    targetRef: string | undefined | null,
    context: RuntimeContext
): GameObject | null {
    const result = resolveTarget(targetRef, context);
    return result.success ? (result.target as GameObject) : null;
}

/**
 * Get a human-readable error message for failed target resolution
 */
export function getTargetResolutionError(
    targetRef: string | undefined | null,
    context: RuntimeContext
): string | null {
    const result = resolveTarget(targetRef, context);
    return result.success ? null : result.error || "Unknown target resolution error";
}
