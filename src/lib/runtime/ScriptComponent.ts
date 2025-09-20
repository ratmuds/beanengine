import * as THREE from "three";
import * as Types from "$lib/types";
import { Component } from "./Component";
import type { GameObject } from "./GameObject";
import { CodeInterpreter } from "$lib/interpreter";
import { compileScript, createRuntimeContext } from "$lib/compiler";
import { runtimeStore } from "$lib/runtimeStore";

/**
 * ScriptComponent handles code execution for GameObjects with BScript nodes
 */
export class ScriptComponent extends Component {
    private interpreter: CodeInterpreter | null = null;
    public script: Types.BScript;
    private scene: THREE.Scene;

    constructor(
        gameObject: GameObject,
        script: Types.BScript,
        scene: THREE.Scene
    ) {
        super(gameObject);
        this.script = script;
        this.scene = scene;
        // Interpreter starts on enable to respect component enabled state
    }

    /**
     * Initialize the code interpreter with the script
     */
    private initializeInterpreter(): void {
        try {
            // Stop any existing interpreter before creating a new one
            if (this.interpreter) {
                this.interpreter.stop();
                this.interpreter = null;
            }

            // Create interpreter
            this.interpreter = new CodeInterpreter(
                compileScript(this.script.code as unknown[]),
                this.gameObject
            );

            // Create runtime context
            const context = createRuntimeContext({});
            context.gameObject = this.gameObject;
            context.scene = this.scene;
            context.script = this.script;

            // Run the script
            this.interpreter.run(context);
        } catch (error) {
            runtimeStore.error(
                `Error initializing script ${this.script.id}:`,
                "ScriptComponent",
                error
            );
        }
    }

    /**
     * Update script execution (if needed for continuous scripts)
     */
    update(_delta: number): void {
        // Most scripts run once on initialization
        // This method can be extended for scripts that need continuous updates
        if (this.interpreter) {
            try {
                // No-op for now; interpreter runs on init
            } catch (error) {
                runtimeStore.error(
                    `Error updating script ${this.script.id}:`,
                    "ScriptComponent",
                    error
                );
            }
        }
    }

    onEnable(): void {
        if (!this.interpreter) {
            this.initializeInterpreter();
        }
    }

    onDisable(): void {
        if (this.interpreter) {
            this.interpreter.stop();
            this.interpreter = null;
        }
    }

    /**
     * Restart the script with new code or variables
     */
    restartScript(newCode?: unknown[]): void {
        // Ensure previous interpreter is stopped
        if (this.interpreter) {
            this.interpreter.stop();
            this.interpreter = null;
        }
        if (newCode) {
            // Script.code appears to be an array of items per CodeEditor
            this.script.code = newCode as unknown[];
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
        if (this.interpreter) {
            this.interpreter.stop();
            this.interpreter = null;
        }
        super.destroy();
    }
}
