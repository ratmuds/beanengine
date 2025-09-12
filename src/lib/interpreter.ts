/**
 * Interpreter for running compiled code from compiler.ts
 */

import { chipConfig, type RuntimeContext } from "./chipConfig.js";
import type { GameObject } from "./runtime/GameObject.js";
import { BObject } from "./types.js";
import { runtimeStore } from "$lib/runtimeStore";
import * as THREE from "three";

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
        // TODO: uhh this doesnt take into account of like if statements, loops, etc
        for (const item of this.code) {
            await this.executeItem(item, context);
        }
    }

    private async executeItem(item: any, context: RuntimeContext) {
        /*if (item.type === "moveto") {
            const position = await context.evaluateChip(item.position);
            if (context.mesh && position) {
                context.mesh.position.set(position.x, position.y, position.z);
                console.log(
                    `MOVETO: ${position.x}, ${position.y}, ${position.z}`
                );
            }
        } else if (chipConfig[item.type]) {
            // Handle value chips
            const result = await chipConfig[item.type].evaluate(item, context);
            console.log(`Evaluated ${item.type}:`, result);
        }*/

        console.log("INTERPRETING", item);

        if (item.type === "if") {
            const condition = await context.evaluateChip(
                item.condition,
                context
            );
            console.log("IF CONDITION:", condition);

            // Evaluate condition - treat empty string, null, undefined, false, 0 as false
            const shouldExecute =
                condition &&
                condition !== "" &&
                condition !== "0" &&
                condition !== "false";

            if (
                shouldExecute &&
                item.children &&
                Array.isArray(item.children)
            ) {
                console.log("EXECUTING IF CHILDREN", item.children);
                for (const child of item.children) {
                    await this.executeItem(child, context);
                }
            }
        } else if (item.type === "log") {
            console.log("LOGGING", item);
            const message = await context.evaluateChip(item.message, context);
            const level = await context.evaluateChip(item.level, context);

            console.log(message, level);

            runtimeStore.log(
                level ? level : "info",
                message,
                `Interpreter / ${context.script?.name}`
            );
        }

        if (item.type === "mousebutton") {
            const variable = await context.evaluateChip(item.variable, context);

            runtimeStore.setVariable(variable, "false");
        }
    }
}
