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

        if (item.type === "log") {
            const message = await context.evaluateChip(item.message);
            const level = await context.evaluateChip(item.level);

            runtimeStore.log(
                level,
                message,
                `Interpreter / ${context.script?.name}`
            );
        }
    }
}
