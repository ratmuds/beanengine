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
    private unsubscribers: Array<() => void> = [];

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

            // Register triggers for this script
            this.registerTriggers(context);
        } catch (error) {
            runtimeStore.error(
                `Error initializing script ${this.script.id}:`,
                "ScriptComponent",
                error
            );
        }
    }

    private registerTriggers(context: any): void {
        // Clean previous
        for (const off of this.unsubscribers) off();
        this.unsubscribers = [];

        const triggers = this.script.triggers || [];
        if (triggers.length === 0) {
            // Back-compat: if no triggers defined, run once immediately
            this.interpreter?.run(context);
            return;
        }

        for (const trig of triggers) {
            if (trig.enabled === false) continue;
            switch (trig.type) {
                case "start": {
                    // Run immediately once
                    this.interpreter?.run(context);
                    break;
                }
                case "update": {
                    const off = runtimeStore.on("update", (dt: number) => {
                        // Provide dt in configured arg name or default
                        const varName = trig.args?.[0]?.name || "deltatime";
                        runtimeStore.setVariable(
                            varName,
                            dt,
                            "local",
                            this.script.id
                        );
                        this.interpreter?.run(context);
                    });
                    this.unsubscribers.push(off);
                    break;
                }
                case "keydown": {
                    const off = runtimeStore.on("keydown", (key: string) => {
                        const varName = trig.args?.[0]?.name || "key";
                        runtimeStore.setVariable(
                            varName,
                            key,
                            "local",
                            this.script.id
                        );
                        this.interpreter?.run(context);
                    });
                    this.unsubscribers.push(off);
                    break;
                }
                case "mousedown": {
                    const off = runtimeStore.on(
                        "mousedown",
                        (button: string) => {
                            const varName = trig.args?.[0]?.name || "button";
                            runtimeStore.setVariable(
                                varName,
                                button,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
                case "mouseup": {
                    const off = runtimeStore.on("mouseup", (button: string) => {
                        const varName = trig.args?.[0]?.name || "button";
                        runtimeStore.setVariable(
                            varName,
                            button,
                            "local",
                            this.script.id
                        );
                        this.interpreter?.run(context);
                    });
                    this.unsubscribers.push(off);
                    break;
                }
                case "mousemove": {
                    const off = runtimeStore.on(
                        "mousemove",
                        (x: number, y: number) => {
                            const xName = trig.args?.[0]?.name || "mouseX";
                            const yName = trig.args?.[1]?.name || "mouseY";
                            runtimeStore.setVariable(
                                xName,
                                x,
                                "local",
                                this.script.id
                            );
                            runtimeStore.setVariable(
                                yName,
                                y,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
                case "collisionenter": {
                    const off = runtimeStore.on(
                        "collisionenter",
                        (a: string, b: string) => {
                            const selfId = this.gameObject.bObject.id;
                            if (a !== selfId && b !== selfId) return;
                            const otherId = a === selfId ? b : a;
                            const selfName = trig.args?.[0]?.name || "self";
                            const otherName = trig.args?.[1]?.name || "other";
                            runtimeStore.setVariable(
                                selfName,
                                selfId,
                                "local",
                                this.script.id
                            );
                            runtimeStore.setVariable(
                                otherName,
                                otherId,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
                case "collisionexit": {
                    const off = runtimeStore.on(
                        "collisionexit",
                        (a: string, b: string) => {
                            const selfId = this.gameObject.bObject.id;
                            if (a !== selfId && b !== selfId) return;
                            const otherId = a === selfId ? b : a;
                            const selfName = trig.args?.[0]?.name || "self";
                            const otherName = trig.args?.[1]?.name || "other";
                            runtimeStore.setVariable(
                                selfName,
                                selfId,
                                "local",
                                this.script.id
                            );
                            runtimeStore.setVariable(
                                otherName,
                                otherId,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
                case "collisionstay": {
                    const off = runtimeStore.on(
                        "collisionstay",
                        (a: string, b: string) => {
                            const selfId = this.gameObject.bObject.id;
                            if (a !== selfId && b !== selfId) return;
                            const otherId = a === selfId ? b : a;
                            const selfName = trig.args?.[0]?.name || "self";
                            const otherName = trig.args?.[1]?.name || "other";
                            runtimeStore.setVariable(
                                selfName,
                                selfId,
                                "local",
                                this.script.id
                            );
                            runtimeStore.setVariable(
                                otherName,
                                otherId,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
                case "custom": {
                    if (!trig.event) break;
                    const off = runtimeStore.on(
                        trig.event,
                        (...args: any[]) => {
                            // Expose args by name when possible
                            (trig.args || []).forEach((a, i) => {
                                runtimeStore.setVariable(
                                    a.name,
                                    args[i],
                                    "local",
                                    this.script.id
                                );
                            });
                            // Also expose raw array
                            runtimeStore.setVariable(
                                "args",
                                args,
                                "local",
                                this.script.id
                            );
                            this.interpreter?.run(context);
                        }
                    );
                    this.unsubscribers.push(off);
                    break;
                }
            }
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
        for (const off of this.unsubscribers) off();
        this.unsubscribers = [];
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
        for (const off of this.unsubscribers) off();
        this.unsubscribers = [];
        super.destroy();
    }
}
