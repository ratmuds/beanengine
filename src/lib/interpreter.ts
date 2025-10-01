/**
 * Interpreter for running compiled code from compiler.ts
 */

import { type RuntimeContext } from "./chipConfig.js";
import { RotationUtils, type GameObject } from "./runtime/GameObject.js";
import { runtimeStore } from "$lib/runtimeStore";
import { InterpreterScriptError } from "./types.js";
import * as Types from "./types.js";
import { PhysicsComponent } from "./runtime/PhysicsComponent.js";
import {
    resolveTargetGameObject,
    getTargetResolutionError,
} from "$lib/services/targetResolver.js";

export class CodeInterpreter {
    private code: any[];
    private object: GameObject;
    // Cancellation state for cleanup
    private stopped: boolean = false;
    private stopWaiters: Array<() => void> = [];

    constructor(code: any[], object: GameObject) {
        this.code = code;
        this.object = object;
    }

    // Signal all awaiting tasks to stop and mark interpreter as stopped
    public stop(): void {
        if (!this.stopped) {
            console.log("stopping script...");

            this.stopped = true;
            // Resolve any pending waiters
            for (const resolve of this.stopWaiters) resolve();
            this.stopWaiters = [];
        }
    }

    public isStopped(): boolean {
        return this.stopped;
    }

    private onStop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.stopped) return resolve();
            this.stopWaiters.push(resolve);
        });
    }

    private async sleep(ms: number): Promise<void> {
        if (this.stopped) return;
        await Promise.race([
            new Promise<void>((resolve) => setTimeout(resolve, ms)),
            this.onStop(),
        ]);
    }

    setCode(code: any[]) {
        this.code = code;
    }

    async run(context: RuntimeContext) {
        // Reset stop state each run invocation
        this.stopped = false;
        this.stopWaiters = [];
        for (const item of this.code) {
            if (this.stopped) break;
            await this.executeItem(item, context);
        }
    }

    private parseVector3(value: any): Types.BVector3 {
        try {
            // Already a Types.BVector3
            if (value instanceof Types.BVector3) {
                return value;
            }

            // Plain object with x,y,z (e.g., THREE.Vector3-like or compiled literal)
            if (
                value &&
                typeof value === "object" &&
                "x" in value &&
                "y" in value &&
                "z" in value
            ) {
                const x = Number((value as any).x) || 0;
                const y = Number((value as any).y) || 0;
                const z = Number((value as any).z) || 0;
                return new Types.BVector3(x, y, z);
            }

            // String formats: "(x, y, z)" or "x, y, z"
            if (typeof value === "string") {
                let str = value.trim();
                if (str.startsWith("(") && str.endsWith(")")) {
                    str = str.slice(1, -1);
                }
                const parts = str.split(",").map((p) => p.trim());
                if (parts.length !== 3) {
                    throw new Error(`Invalid vector3 format: ${value}`);
                }
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                const z = parseFloat(parts[2]);
                if ([x, y, z].some((n) => Number.isNaN(n))) {
                    throw new Error(`Invalid vector3 components: ${value}`);
                }
                return new Types.BVector3(x, y, z);
            }

            throw new Error(`Unsupported vector3 value: ${value}`);
        } catch (error) {
            throw new Error(
                `Invalid vector3 format: ${
                    typeof value === "string" ? value : JSON.stringify(value)
                }`
            );
        }
    }

    private async executeItem(item: any, context: RuntimeContext) {
        try {
            if (this.stopped) return;
            switch (item.type) {
                case "if":
                    await this.executeIfStatement(item, context);
                    break;
                case "forever":
                    await this.executeForeverLoop(item, context);
                    break;
                case "loopFor":
                    await this.executeLoopFor(item, context);
                    break;
                case "loopThrough":
                    await this.executeLoopThrough(item, context);
                    break;
                case "set":
                    await this.executeSet(item, context);
                    break;
                case "log":
                    await this.executeLog(item, context);
                    break;
                case "mousebutton":
                    await this.executeMouseButton(item, context);
                    break;
                case "wait":
                    await this.executeWait(item, context);
                    break;
                case "move":
                    await this.executeMove(item, context);
                    break;
                case "moveto":
                    await this.executeMoveTo(item, context);
                    break;
                case "rotate":
                    await this.executeRotate(item, context);
                    break;
                case "lookat":
                    await this.executeLookAt(item, context);
                    break;
                case "valueset":
                    await this.executeValueSet(item, context);
                    break;
                case "directionalforce":
                    await this.executeDirectionalForce(item, context);
                    break;
                case "directionalimpulse":
                    await this.executeDirectionalImpulse(item, context);
                    break;
                case "directionalvelocity":
                    await this.executeDirectionalVelocity(item, context);
                    break;
                case "clone":
                    await this.executeClone(item, context);
                    break;
                case "destroy":
                    await this.executeDestroy(item, context);
                    break;
                case "parent":
                    await this.executeParent(item, context);
                    break;
                case "emitevent":
                    await this.executeEmitEvent(item, context);
                    break;
                default:
                    runtimeStore.warn(
                        `Unknown code block type: ${item.type}`,
                        "Interpreter"
                    );
            }
        } catch (error) {
            runtimeStore.error(
                `Error executing item ${item.type}: ${error}`,
                "Interpreter"
            );
        }
    }

    private async executeIfStatement(item: any, context: RuntimeContext) {
        const condition = await context.evaluateChip(item.condition, context);

        // Evaluate condition - treat empty string, null, undefined, false, 0 as false
        const shouldExecute =
            Boolean(condition) &&
            condition !== "" &&
            condition !== "0" &&
            condition !== "false";

        if (shouldExecute && item.children && Array.isArray(item.children)) {
            for (const child of item.children) {
                if (this.stopped) break;

                await this.executeItem(child, context);
            }
        }
    }

    private async executeForeverLoop(item: any, context: RuntimeContext) {
        // TODO: Add script timeout and break mechanism
        while (!this.stopped) {
            if (item.children && Array.isArray(item.children)) {
                for (const child of item.children) {
                    if (this.stopped) break;
                    await this.executeItem(child, context);
                }
            }
            // Add a small delay to prevent infinite loops from freezing the browser
            await this.sleep(1);
        }
    }

    private async executeLog(item: any, context: RuntimeContext) {
        const message = await context.evaluateChip(item.message, context);
        const level = await context.evaluateChip(item.level, context);

        runtimeStore.log(
            level || "info",
            typeof message === "object" ? JSON.stringify(message) : message,
            `${context.script?.name}`
        );
    }

    private async executeMouseButton(item: any, context: RuntimeContext) {
        const variable = await context.evaluateChip(item.variable, context);
        const button = await context.evaluateChip(item.button, context);

        if (!variable) {
            runtimeStore.warn(
                "Mouse button block missing variable",
                "Interpreter"
            );
            return;
        }

        const buttonPressed = runtimeStore.getMouseButton(button || "left");
        runtimeStore.setVariable(
            variable,
            buttonPressed.toString(),
            "local",
            context.script?.id
        );
    }

    private async executeWait(item: any, context: RuntimeContext) {
        const duration = await context.evaluateChip(item.duration, context);

        if (!duration || isNaN(parseFloat(duration))) {
            runtimeStore.warn(
                "Wait block missing or invalid duration",
                "Interpreter"
            );
            return;
        }

        const ms = parseFloat(duration) * 1000;
        await this.sleep(ms);
        if (this.stopped) return;
    }

    private async executeLoopFor(item: any, context: RuntimeContext) {
        const timesRaw = await context.evaluateChip(item.times, context);
        const iterations = Math.max(0, Math.floor(Number(timesRaw)));

        if (!Number.isFinite(iterations)) {
            runtimeStore.warn(
                `Loop For block received invalid iteration count '${timesRaw}'. Skipping loop.`,
                "Interpreter"
            );
            return;
        }

        const indexNameRaw = await context.evaluateChip(item.index, context);
        const indexName =
            typeof indexNameRaw === "string" && indexNameRaw.trim().length > 0
                ? indexNameRaw.trim()
                : null;

        const scriptId = context.script?.id;

        for (let i = 0; i < iterations && !this.stopped; i++) {
            if (indexName && scriptId) {
                runtimeStore.setVariable(indexName, i, "local", scriptId);
            }

            if (item.children && Array.isArray(item.children)) {
                for (const child of item.children) {
                    if (this.stopped) break;
                    await this.executeItem(child, context);
                }
            }
        }
    }

    private async executeLoopThrough(item: any, context: RuntimeContext) {
        const arrayValue = await context.evaluateChip(item.array, context);
        const iterable = Array.isArray(arrayValue)
            ? arrayValue
            : arrayValue && typeof arrayValue === "object"
            ? Object.values(arrayValue)
            : [];

        if (!Array.isArray(iterable)) {
            runtimeStore.warn(
                "Loop Through block received a non-iterable value. Skipping loop.",
                "Interpreter"
            );
            return;
        }

        const itemNameRaw = await context.evaluateChip(item.item, context);
        const itemName =
            typeof itemNameRaw === "string" && itemNameRaw.trim().length > 0
                ? itemNameRaw.trim()
                : null;
        if (!itemName) {
            runtimeStore.warn(
                "Loop Through block missing item variable name.",
                "Interpreter"
            );
            return;
        }

        const indexNameRaw = await context.evaluateChip(item.index, context);
        const indexName =
            typeof indexNameRaw === "string" && indexNameRaw.trim().length > 0
                ? indexNameRaw.trim()
                : null;

        const scriptId = context.script?.id;

        for (let i = 0; i < iterable.length && !this.stopped; i++) {
            if (scriptId) {
                runtimeStore.setVariable(
                    itemName,
                    iterable[i],
                    "local",
                    scriptId
                );
                if (indexName) {
                    runtimeStore.setVariable(indexName, i, "local", scriptId);
                }
            }

            if (item.children && Array.isArray(item.children)) {
                for (const child of item.children) {
                    if (this.stopped) break;
                    await this.executeItem(child, context);
                }
            }
        }
    }

    private async executeSet(item: any, context: RuntimeContext) {
        const propertyRaw = await context.evaluateChip(item.property, context);
        const value = await context.evaluateChip(item.value, context);

        const propertyName =
            propertyRaw !== undefined && propertyRaw !== null
                ? String(propertyRaw).trim()
                : "";

        if (!propertyName) {
            runtimeStore.warn("Set block missing property name", "Interpreter");
            return;
        }

        const targetGameObject = context.gameObject;
        if (!targetGameObject) {
            runtimeStore.warn(
                "Set block: no target GameObject available",
                "Interpreter"
            );
            return;
        }

        const parts = propertyName.split(".");
        const root = parts[0];

        try {
            switch (root) {
                case "position": {
                    if (parts.length === 1) {
                        const pos = this.parseVector3(value);
                        targetGameObject.transform.position.set(
                            pos.x,
                            pos.y,
                            pos.z
                        );
                    } else if (parts.length === 2) {
                        const component = parts[1];
                        if (!/[xyz]/.test(component)) {
                            runtimeStore.warn(
                                `Set block: unknown position component '${component}'`,
                                "Interpreter"
                            );
                        } else {
                            const num = Number(value);
                            if (Number.isNaN(num)) {
                                runtimeStore.warn(
                                    `Set block: position component '${component}' requires a numeric value`,
                                    "Interpreter"
                                );
                            } else {
                                (targetGameObject.transform.position as any)[
                                    component
                                ] = num;
                            }
                        }
                    }
                    targetGameObject.updateWorldMatrix();
                    return;
                }
                case "scale": {
                    if (parts.length === 1) {
                        const scl = this.parseVector3(value);
                        targetGameObject.transform.scale.set(
                            scl.x,
                            scl.y,
                            scl.z
                        );
                    } else if (parts.length === 2) {
                        const component = parts[1];
                        if (!/[xyz]/.test(component)) {
                            runtimeStore.warn(
                                `Set block: unknown scale component '${component}'`,
                                "Interpreter"
                            );
                        } else {
                            const num = Number(value);
                            if (Number.isNaN(num)) {
                                runtimeStore.warn(
                                    `Set block: scale component '${component}' requires a numeric value`,
                                    "Interpreter"
                                );
                            } else {
                                (targetGameObject.transform.scale as any)[
                                    component
                                ] = num;
                            }
                        }
                    }
                    targetGameObject.updateWorldMatrix();
                    return;
                }
                case "rotation": {
                    if (parts.length === 1) {
                        const rotVec = this.parseVector3(value);
                        const quaternion =
                            RotationUtils.eulerToNormalizedQuaternion(rotVec);
                        targetGameObject.transform.rotation.copy(quaternion);
                    } else if (parts.length === 2) {
                        const component = parts[1];
                        if (!/[xyz]/.test(component)) {
                            runtimeStore.warn(
                                `Set block: unknown rotation component '${component}'`,
                                "Interpreter"
                            );
                        } else {
                            const num = Number(value);
                            if (Number.isNaN(num)) {
                                runtimeStore.warn(
                                    `Set block: rotation component '${component}' requires a numeric value`,
                                    "Interpreter"
                                );
                            } else {
                                const currentEuler =
                                    RotationUtils.quaternionToEuler(
                                        targetGameObject.transform.rotation.clone()
                                    );
                                const updatedEuler = new Types.BVector3(
                                    currentEuler.x,
                                    currentEuler.y,
                                    currentEuler.z
                                );
                                (updatedEuler as any)[component] = num;
                                const quaternion =
                                    RotationUtils.eulerToNormalizedQuaternion(
                                        updatedEuler
                                    );
                                targetGameObject.transform.rotation.copy(
                                    quaternion
                                );
                            }
                        }
                    }
                    targetGameObject.updateWorldMatrix();
                    return;
                }
                default:
                    break;
            }

            if (parts.length > 1) {
                runtimeStore.warn(
                    `Set block: nested property path '${propertyName}' is not supported.`,
                    "Interpreter"
                );
                return;
            }

            targetGameObject.setProperty(propertyName, value);
        } catch (error) {
            runtimeStore.error(
                `Error setting property '${propertyName}': ${error}`,
                "Interpreter"
            );
        }
    }

    private async executeMove(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const position = await context.evaluateChip(item.position, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `Move target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "Move block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!position) {
            throw new InterpreterScriptError("Move block missing position");
        }

        // Normalize input into a vector and apply to the target GameObject's THREE.Vector3
        const pos = this.parseVector3(position);
        pos.x += targetGameObject.transform.position.x;
        pos.y += targetGameObject.transform.position.y;
        pos.z += targetGameObject.transform.position.z;

        console.log("move", pos);

        // Apply only if not cancelled
        if (this.stopped) return;
        targetGameObject.transform.position.set(pos.x, pos.y, pos.z);
    }

    private async executeMoveTo(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const position = await context.evaluateChip(item.position, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `MoveTo target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "MoveTo block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!position) {
            throw new InterpreterScriptError("MoveTo block missing position");
        }

        // Normalize input into a vector and apply to the target GameObject's THREE.Vector3
        const pos = this.parseVector3(position);

        console.log("moveto", pos);

        // Apply only if not cancelled
        if (this.stopped) return;
        targetGameObject.transform.position.set(pos.x, pos.y, pos.z);
    }

    private async executeDirectionalForce(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const direction = await context.evaluateChip(item.direction, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `DirectionalForce target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "DirectionalForce block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!direction) {
            throw new InterpreterScriptError(
                "Directional force block missing direction"
            );
        }

        const dir = this.parseVector3(direction);
        targetGameObject
            .getComponent(PhysicsComponent)
            .setDirectionalForce(dir);
    }

    private async executeDirectionalImpulse(
        item: any,
        context: RuntimeContext
    ) {
        const targetRef = await context.evaluateChip(item.target, context);
        const direction = await context.evaluateChip(item.direction, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `DirectionalImpulse target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "DirectionalImpulse block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!direction) {
            throw new InterpreterScriptError(
                "Directional impulse block missing direction"
            );
        }

        const dir = this.parseVector3(direction);
        targetGameObject
            .getComponent(PhysicsComponent)
            .addDirectionalImpulse(dir);
    }

    private async executeDirectionalVelocity(
        item: any,
        context: RuntimeContext
    ) {
        const targetRef = await context.evaluateChip(item.target, context);
        const direction = await context.evaluateChip(item.direction, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `DirectionalImpulse target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "DirectionalVelocity block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!direction) {
            throw new InterpreterScriptError(
                "Directional velocity block missing direction"
            );
        }

        const dir = this.parseVector3(direction);
        targetGameObject.getComponent(PhysicsComponent).setVelocity(dir);
    }

    private async executeClone(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const variableName = await context.evaluateChip(item.variable, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `Clone target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "Clone block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        if (!variableName) {
            throw new InterpreterScriptError(
                "Clone block missing variable name"
            );
        }

        try {
            // Clone the GameObject
            const clonedObject = targetGameObject.clone();

            // Create a new GameObject from the cloned BNode
            const gameObjectManager = runtimeStore.getGameObjectManager();
            if (!gameObjectManager) {
                runtimeStore.warn(
                    "Clone block: GameObjectManager not available",
                    "Interpreter"
                );
                return;
            }
            // Register the cloned hierarchy (root + all descendants) so child components get updated
            const registerHierarchy = (go: GameObject) => {
                gameObjectManager.addGameObject(go);
                for (const child of go.getChildren()) {
                    registerHierarchy(child);
                }
            };
            registerHierarchy(clonedObject);
            // Ensure any required components exist and enabled state matches Storage membership
            if (gameObjectManager.ensureComponentsRecursive) {
                gameObjectManager.ensureComponentsRecursive(clonedObject);
            }

            // Store the cloned object's ID in the specified variable
            runtimeStore.setVariable(
                variableName,
                `@id:${clonedObject.id}`,
                "local",
                context.script?.id
            );

            console.log(
                `Cloned object ${targetGameObject.bObject.id} to ${clonedObject.id}, stored in variable '${variableName}'`
            );
        } catch (error) {
            runtimeStore.error(`Error cloning object: ${error}`, "Interpreter");
        }
    }

    private async executeDestroy(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `Destroy target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "Destroy block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        try {
            // Remove from GameObjectManager
            const gameObjectManager = runtimeStore.getGameObjectManager();
            if (!gameObjectManager) {
                runtimeStore.warn(
                    "Destroy block: GameObjectManager not available",
                    "Interpreter"
                );
                return;
            }
            gameObjectManager.removeGameObject(targetGameObject.bObject.id);

            console.log(`Destroyed object ${targetGameObject.bObject.id}`);
        } catch (error) {
            runtimeStore.error(
                `Error destroying object: ${error}`,
                "Interpreter"
            );
        }
    }

    private async executeParent(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const parentRef = await context.evaluateChip(item.parent, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `Parent target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "Parent block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        try {
            // Handle unparenting (null or empty parent)
            if (!parentRef || parentRef === "null" || parentRef === "") {
                targetGameObject.setParent(null);
                console.log(`Unparented object ${targetGameObject.bObject.id}`);
                return;
            }

            // Resolve parent object
            const parentGameObject = resolveTargetGameObject(
                parentRef,
                context
            );
            if (!parentGameObject) {
                const error = getTargetResolutionError(parentRef, context);
                runtimeStore.warn(
                    `Parent resolution failed: ${error}. Parent: '${parentRef}'`,
                    "Interpreter"
                );
                return;
            }

            // Set the parent
            targetGameObject.setParent(parentGameObject);
            console.log(
                `Parented object ${targetGameObject.bObject.id} to ${parentGameObject.bObject.id}`
            );
        } catch (error) {
            runtimeStore.error(`Error setting parent: ${error}`, "Interpreter");
        }
    }

    private async executeEmitEvent(item: any, context: RuntimeContext) {
        const name = await context.evaluateChip(item.name, context);
        const payload = await context.evaluateChip(item.payload, context);

        if (!name || typeof name !== "string") {
            runtimeStore.warn(
                "Emit Event block missing or invalid event name",
                "Interpreter"
            );
            return;
        }

        try {
            runtimeStore.emit(name, payload);
        } catch (e) {
            runtimeStore.error(
                `Error emitting event '${name}': ${e}`,
                "Interpreter"
            );
        }
    }

    private async executeRotate(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const rotation = await context.evaluateChip(item.rotation, context);

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `Rotate target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "Rotate block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        try {
            targetGameObject.setRotation(rotation);
        } catch (error) {
            runtimeStore.error(
                `Error rotating object: ${error}`,
                "Interpreter"
            );
        }
    }

    private async executeLookAt(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const lookAtPosition = await context.evaluateChip(
            item.position,
            context
        );

        // Resolve target object
        let targetGameObject = context.gameObject; // Default to current object
        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `LookAt target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        }

        if (!targetGameObject) {
            runtimeStore.warn(
                "LookAt block: no target object available. Does this script have a parent?",
                "Interpreter"
            );
            return;
        }

        try {
            targetGameObject.lookAt(lookAtPosition);
        } catch (error) {
            runtimeStore.error(
                `Error looking at position: ${error}`,
                "Interpreter"
            );
        }
    }

    private async executeValueSet(item: any, context: RuntimeContext) {
        const targetRef = await context.evaluateChip(item.target, context);
        const value = await context.evaluateChip(item.value, context);

        // Resolve target object
        let targetGameObject;

        if (targetRef) {
            const resolvedTarget = resolveTargetGameObject(targetRef, context);
            if (resolvedTarget) {
                targetGameObject = resolvedTarget;
            } else {
                const error = getTargetResolutionError(targetRef, context);
                runtimeStore.warn(
                    `ValueSet target resolution failed: ${error}. Target: '${targetRef}'`,
                    "Interpreter"
                );
                return;
            }
        } else {
            runtimeStore.warn(
                "ValueSet block: no target specified",
                "Interpreter"
            );
            return;
        }

        try {
            targetGameObject.setProperty("value", value);
        } catch (error) {
            runtimeStore.error(`Error setting value: ${error}`, "Interpreter");
        }
    }
}
