/**
 * Interpreter for running compiled code from compiler.ts
 */

import { chipConfig, type RuntimeContext } from "./chipConfig.js";
import type { GameObject } from "./runtime/GameObject.js";
import { BObject } from "./types.js";
import { runtimeStore } from "$lib/runtimeStore";

export class CodeInterpreter {
    private code: any[];
    private object: GameObject;

    constructor(code: any[], object: GameObject) {
        this.code = code;
        this.object = object;
    }

    setCode(code: any[]) {
        this.code = code;
    }

    async run(context: RuntimeContext) {
        for (const item of this.code) {
            await this.executeItem(item, context);
        }
    }

    private async executeItem(item: any, context: RuntimeContext) {
        try {
            switch (item.type) {
                case "if":
                    await this.executeIfStatement(item, context);
                    break;
                case "forever":
                    await this.executeForeverLoop(item, context);
                    break;
                case "log":
                    await this.executeLog(item, context);
                    break;
                case "mousebutton":
                    await this.executeMouseButton(item, context);
                    break;
                case "keypress":
                    await this.executeKeyPress(item, context);
                    break;
                case "mouseposition":
                    await this.executeMousePosition(item, context);
                    break;
                case "wait":
                    await this.executeWait(item, context);
                    break;
                default:
                    runtimeStore.warn(`Unknown item type: ${item.type}`, "Interpreter");
            }
        } catch (error) {
            runtimeStore.error(`Error executing item ${item.type}: ${error}`, "Interpreter");
        }
    }

    private async executeIfStatement(item: any, context: RuntimeContext) {
        const condition = await context.evaluateChip(item.condition, context);

        // Evaluate condition - treat empty string, null, undefined, false, 0 as false
        const shouldExecute = Boolean(condition) &&
                            condition !== "" &&
                            condition !== "0" &&
                            condition !== "false";

        if (shouldExecute && item.children && Array.isArray(item.children)) {
            for (const child of item.children) {
                await this.executeItem(child, context);
            }
        }
    }

    private async executeForeverLoop(item: any, context: RuntimeContext) {
        // TODO: Add script timeout and break mechanism
        while (true) {
            if (item.children && Array.isArray(item.children)) {
                for (const child of item.children) {
                    await this.executeItem(child, context);
                }
            }
            // Add a small delay to prevent infinite loops from freezing the browser
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    private async executeLog(item: any, context: RuntimeContext) {
        const message = await context.evaluateChip(item.message, context);
        const level = await context.evaluateChip(item.level, context);

        runtimeStore.log(
            level || "info",
            message,
            `Interpreter / ${context.script?.name}`
        );
    }

    private async executeMouseButton(item: any, context: RuntimeContext) {
        const variable = await context.evaluateChip(item.variable, context);
        const button = await context.evaluateChip(item.button, context);

        if (!variable) {
            runtimeStore.warn("Mouse button block missing variable", "Interpreter");
            return;
        }

        const buttonPressed = runtimeStore.getMouseButton(button || 'left');
        runtimeStore.setVariable(variable, buttonPressed.toString());
    }

    private async executeKeyPress(item: any, context: RuntimeContext) {
        const variable = await context.evaluateChip(item.variable, context);
        const key = await context.evaluateChip(item.key, context);

        if (!variable) {
            runtimeStore.warn("Key press block missing variable", "Interpreter");
            return;
        }

        if (!key) {
            runtimeStore.warn("Key press block missing key", "Interpreter");
            return;
        }

        const keyPressed = runtimeStore.getKey(key);
        runtimeStore.setVariable(variable, keyPressed.toString());
    }

    private async executeMousePosition(item: any, context: RuntimeContext) {
        const variableX = await context.evaluateChip(item.variableX, context);
        const variableY = await context.evaluateChip(item.variableY, context);

        const mousePos = runtimeStore.getMousePosition();

        if (variableX) {
            runtimeStore.setVariable(variableX, mousePos.x.toString());
        }

        if (variableY) {
            runtimeStore.setVariable(variableY, mousePos.y.toString());
        }
    }

    private async executeWait(item: any, context: RuntimeContext) {
        const duration = await context.evaluateChip(item.duration, context);

        if (!duration || isNaN(parseFloat(duration))) {
            runtimeStore.warn("Wait block missing or invalid duration", "Interpreter");
            return;
        }

        await new Promise(resolve =>
            setTimeout(resolve, parseFloat(duration) * 1000)
        );
    }
}
