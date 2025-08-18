/**
 * Interpreter for running compiled code from compiler.ts
 */

import { chipConfig, type RuntimeContext } from "./chipConfig.js";
import { BObject } from "./types.js";
import * as THREE from "three";

export class CodeInterpreter {
    private code: any[];
    private object: BObject;
    private mesh?: THREE.Mesh;

    constructor(code: any[], object: BObject, mesh?: THREE.Mesh) {
        this.code = code;
        this.object = object;
        this.mesh = mesh;
    }

    setCode(code: any[]) {
        this.code = code;
    }

    async run(context: RuntimeContext) {
        for (const item of this.code) {
            await this.executeItem(item, context);
            await new Promise(resolve => setTimeout(resolve, 50)); // Tick delay
        }
    }

    private async executeItem(item: any, context: RuntimeContext) {
        if (item.type === 'moveto') {
            const position = await context.evaluateChip(item.position);
            if (context.mesh && position) {
                context.mesh.position.set(position.x, position.y, position.z);
                console.log(`MOVETO: ${position.x}, ${position.y}, ${position.z}`);
            }
        } else if (chipConfig[item.type]) {
            // Handle value chips
            const result = await chipConfig[item.type].evaluate(item, context);
            console.log(`Evaluated ${item.type}:`, result);
        }
    }
}
