import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import { CodeInterpreter } from "$lib/interpreter";
import { createRuntimeContext } from "$lib/compiler";

/**
 * ScriptComponent handles code execution for GameObjects with BScript nodes
 */
export class ScriptComponent extends Component {
    private interpreter: CodeInterpreter | null = null;
    private script: Types.BScript;
    private scene: THREE.Scene;
    private variablesMap: Record<string, { value: any; type: string }>;

    constructor(
        gameObject: GameObject,
        script: Types.BScript,
        scene: THREE.Scene,
        variablesMap: Record<string, { value: any; type: string }> = {}
    ) {
        super(gameObject);
        this.script = script;
        this.scene = scene;
        this.variablesMap = variablesMap;
        this.initializeInterpreter();
    }

    /**
     * Initialize the code interpreter with the script
     */
    private initializeInterpreter(): void {
        try {
            // Get parent object for the script
            const targetObject = this.script.parent;
            if (!targetObject) {
                throw new Error(
                    `Script ${this.script.id} has no parent object`
                );
            }

            // Create interpreter
            this.interpreter = new CodeInterpreter(
                this.script.code,
                targetObject
            );

            // Create runtime context
            const context = createRuntimeContext(this.variablesMap);
            context.gameObject = targetObject;
            context.scene = this.scene;

            // Run the script
            this.interpreter.run(context);
        } catch (error) {
            console.error(
                `Error initializing script ${this.script.id}:`,
                error
            );
        }
    }

    /**
     * Update script execution (if needed for continuous scripts)
     */
    update(delta: number): void {
        // Most scripts run once on initialization
        // This method can be extended for scripts that need continuous updates
        if (this.interpreter) {
            try {
                // Update runtime context if needed
                const context = createRuntimeContext(this.variablesMap);
                context.gameObject = this.script.parent;
                context.scene = this.scene;
                context.deltaTime = delta;

                // Some interpreters might have update methods for continuous execution
                // This would depend on the interpreter implementation
            } catch (error) {
                console.error(
                    `Error updating script ${this.script.id}:`,
                    error
                );
            }
        }
    }

    /**
     * Update the variables map (useful when scene variables change)
     */
    updateVariables(
        variablesMap: Record<string, { value: any; type: string }>
    ): void {
        this.variablesMap = variablesMap;
    }

    /**
     * Restart the script with new code or variables
     */
    restartScript(newCode?: string): void {
        if (newCode) {
            this.script.code = newCode;
        }
        this.initializeInterpreter();
    }

    /**
     * Get the script node this component manages
     */
    getScript(): Types.BScript {
        return this.script;
    }

    /**
     * Get the code interpreter instance
     */
    getInterpreter(): CodeInterpreter | null {
        return this.interpreter;
    }

    /**
     * Clean up when component is destroyed
     */
    destroy(): void {
        // Clean up interpreter if it has cleanup methods
        this.interpreter = null;
        super.destroy();
    }
}
