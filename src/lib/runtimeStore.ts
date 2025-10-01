// src/lib/runtimeStore.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
import { writable } from "svelte/store";
import type { GameObjectManager } from "$lib/runtime/GameObjectManager";
import { nanoid } from "nanoid";
import * as THREE from "three";

// Ensure we have a global slot to persist the runtime canvas across HMR/module reloads
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace NodeJS {
        interface Global {}
    }
    interface Window {
        __beanengineCanvas?: HTMLCanvasElement | null;
    }
}

export type LogLevel = "info" | "warn" | "error";

export interface RuntimeLog {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: Date;
    source?: string;
    data?: any;
}

export interface RuntimeVariable {
    name: string;
    value: any;
    type: string;
    scope: "global" | "local";
}

export interface RunningScript {
    id: string;
    name: string;
    status: "running" | "paused" | "stopped" | "error";
    startTime: Date;
    lastUpdate: Date;
}

export interface InputState {
    mouseButtons: {
        left: boolean;
        right: boolean;
        middle: boolean;
    };
    keys: Map<string, boolean>;
    mousePosition: { x: number; y: number };
    mouseDelta: { x: number; y: number };
    canvasCenter: { x: number; y: number };
    canvasElement: HTMLCanvasElement | null;
    // Whether the mouse is currently captured via Pointer Lock for the active canvas
    mouseCaptured: boolean;
}

export interface ScriptEvent {
    name: string;
    params: {
        name: string;
        type: string;
    }[];
}

class RuntimeManager {
    public logs: RuntimeLog[];
    public variables: Map<string, RuntimeVariable>;
    public runningScripts: Map<string, RunningScript>;
    public inputState: InputState;
    public maxLogs: number;
    public gameObjectManager: GameObjectManager | null = null;
    public scriptEvents: Map<string, ScriptEvent>;
    public scriptEventListeners: Map<string, Set<(..._args: any[]) => void>>;
    public threeScene: THREE.Scene | null = null;
    // Runtime-only property overrides: objectId -> (key -> value)
    public propertyOverrides: Map<string, Map<string, unknown>> = new Map();
    // Per-script local variables; key is script id
    public localVariables: Map<string, Map<string, RuntimeVariable>> =
        new Map();
    // Physics handle mappings for collision/event resolution
    public colliderHandleToObjectId: Map<number, string> = new Map();
    public bodyHandleToObjectId: Map<number, string> = new Map();
    // Active collision pairs (normalized key `${min}|${max}`)
    public activeCollisionPairs: Set<string> = new Set();

    // Cache processed mesh data for convex hull generation
    // Key: asset ID, Value: processed mesh data (centered points + original center)
    public convex_hull_cache: Map<
        string,
        { centeredPoints: Float32Array; originalCenter: THREE.Vector3 }
    > = new Map();

    constructor() {
        this.logs = [];
        this.variables = new Map();
        this.runningScripts = new Map();
        this.inputState = {
            mouseButtons: {
                left: false,
                right: false,
                middle: false,
            },
            keys: new Map(),
            mousePosition: { x: 0, y: 0 },
            mouseDelta: { x: 0, y: 0 },
            canvasCenter: { x: 0, y: 0 },
            canvasElement: null,
            mouseCaptured: false,
        };
        this.maxLogs = 1000; // Limit logs to prevent memory issues
        this.scriptEvents = new Map();
        this.scriptEventListeners = new Map();

        // Register events
        this.scriptEvents.set("update", {
            name: "update",
            params: [
                {
                    name: "deltatime",
                    type: "number",
                },
            ],
        });

        this.scriptEvents.set("mouseclick", {
            name: "mouseclick",
            params: [
                {
                    name: "button",
                    type: "string",
                },
            ],
        });

        this.scriptEvents.set("mousedown", {
            name: "mousedown",
            params: [
                {
                    name: "button",
                    type: "string",
                },
            ],
        });

        this.scriptEvents.set("mouseup", {
            name: "mouseup",
            params: [
                {
                    name: "button",
                    type: "string",
                },
            ],
        });

        this.scriptEvents.set("mousemove", {
            name: "mousemove",
            params: [
                {
                    name: "x",
                    type: "number",
                },
                {
                    name: "y",
                    type: "number",
                },
            ],
        });

        this.scriptEvents.set("keydown", {
            name: "keydown",
            params: [
                {
                    name: "key",
                    type: "string",
                },
            ],
        });

        this.scriptEvents.set("keyup", {
            name: "keyup",
            params: [
                {
                    name: "key",
                    type: "string",
                },
            ],
        });

        this.scriptEvents.set("collisionenter", {
            name: "collisionenter",
            params: [
                { name: "self", type: "string" },
                { name: "other", type: "string" },
            ],
        });

        this.scriptEvents.set("collisionexit", {
            name: "collisionexit",
            params: [
                { name: "self", type: "string" },
                { name: "other", type: "string" },
            ],
        });

        this.scriptEvents.set("collisionstay", {
            name: "collisionstay",
            params: [
                { name: "self", type: "string" },
                { name: "other", type: "string" },
            ],
        });
    }

    // --- Runtime Property Overrides ---
    /**
     * Set a runtime-only override for a property on a specific object.
     * Does not mutate editor BObjects; components should read overrides first.
     */
    setPropertyOverride(objectId: string, key: string, value: unknown): void {
        let map = this.propertyOverrides.get(objectId);
        if (!map) {
            map = new Map<string, unknown>();
            this.propertyOverrides.set(objectId, map);
        }
        map.set(key, value);
    }

    /**
     * Get a runtime-only override value for an object's property if present.
     */
    getPropertyOverride<T = unknown>(
        objectId: string,
        key: string
    ): T | undefined {
        return this.propertyOverrides.get(objectId)?.get(key) as T | undefined;
    }

    /**
     * Remove an override for a specific property or all overrides for the object when key omitted.
     */
    clearPropertyOverride(objectId: string, key?: string): void {
        if (!this.propertyOverrides.has(objectId)) return;
        if (key === undefined) {
            this.propertyOverrides.delete(objectId);
        } else {
            const m = this.propertyOverrides.get(objectId);
            if (!m) return;
            m.delete(key);
            if (m.size === 0) this.propertyOverrides.delete(objectId);
        }
    }

    /**
     * Clear all overrides for all objects.
     */
    clearAllPropertyOverrides(): void {
        this.propertyOverrides.clear();
    }

    // --- Simple Event Bus ---
    addEventListener(
        eventName: string,
        listener: (...args: any[]) => void
    ): () => void {
        if (!this.scriptEventListeners.has(eventName)) {
            this.scriptEventListeners.set(eventName, new Set());
        }
        const set = this.scriptEventListeners.get(eventName)!;
        set.add(listener);
        return () => {
            set.delete(listener);
            if (set.size === 0) this.scriptEventListeners.delete(eventName);
        };
    }

    removeEventListener(
        eventName: string,
        listener: (...args: any[]) => void
    ): void {
        const set = this.scriptEventListeners.get(eventName);
        if (set) {
            set.delete(listener);
            if (set.size === 0) this.scriptEventListeners.delete(eventName);
        }
    }

    emitEvent(eventName: string, ...args: any[]): void {
        const set = this.scriptEventListeners.get(eventName);
        if (!set || set.size === 0) return;
        // Call listeners in try/catch individually to avoid breaking chain
        for (const fn of Array.from(set)) {
            try {
                fn(...args);
            } catch (e) {
                this.addLog(
                    "error",
                    `Error in '${eventName}' listener: ${(e as Error).message}`,
                    "runtimeStore",
                    e
                );
            }
        }
    }

    addLog(
        level: LogLevel,
        message: string,
        source?: string,
        data?: any
    ): RuntimeLog {
        const log: RuntimeLog = {
            id: nanoid(),
            level,
            message,
            timestamp: new Date(),
            source,
            data,
        };

        this.logs.unshift(log); // Add to beginning for newest first

        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Also log to browser console
        const consoleMessage = source ? `[${source}] ${message}` : message;
        switch (level) {
            case "error":
                console.error(consoleMessage, data);
                break;
            case "warn":
                console.warn(consoleMessage, data);
                break;
            default:
                console.log(consoleMessage, data);
        }

        return log;
    }

    clearLogs(): void {
        this.logs = [];
    }

    getLogsByLevel(level: LogLevel): RuntimeLog[] {
        return this.logs.filter((log) => log.level === level);
    }

    setVariable(
        name: string,
        value: any,
        scope: "global" | "local" = "global",
        scriptId?: string
    ): void {
        const variable: RuntimeVariable = {
            name,
            value,
            type: typeof value,
            scope,
        };

        console.log("SETTING VARIABLE", name, value, scope, scriptId);

        // If a scriptId is provided and a local var with the same name exists,
        // prefer updating the local (script-scoped) variable to override global.
        if (scriptId && this.localVariables.get(scriptId)?.has(name)) {
            this.localVariables.get(scriptId)!.set(name, {
                ...variable,
                scope: "local",
            });
            return;
        }

        if (scope === "local" && scriptId) {
            if (!this.localVariables.has(scriptId)) {
                this.localVariables.set(scriptId, new Map());
            }
            this.localVariables.get(scriptId)!.set(name, variable);
            return;
        }

        // Fallback/global
        this.variables.set(name, variable);
    }

    getVariable(name: string, scriptId?: string): RuntimeVariable | undefined {
        if (scriptId) {
            const locals = this.localVariables.get(scriptId);
            const localVar = locals?.get(name);
            if (localVar !== undefined) return localVar;
        }
        return this.variables.get(name);
    }

    getAllVariables(): RuntimeVariable[] {
        return Array.from(this.variables.values());
    }

    clearLocalVariables(scriptId: string): void {
        this.localVariables.delete(scriptId);
    }

    addRunningScript(id: string, name: string): void {
        const script: RunningScript = {
            id,
            name,
            status: "running",
            startTime: new Date(),
            lastUpdate: new Date(),
        };
        this.runningScripts.set(id, script);
    }

    updateScriptStatus(id: string, status: RunningScript["status"]): void {
        const script = this.runningScripts.get(id);
        if (script) {
            script.status = status;
            script.lastUpdate = new Date();
        }
    }

    removeScript(id: string): void {
        this.runningScripts.delete(id);
    }

    getAllRunningScripts(): RunningScript[] {
        return Array.from(this.runningScripts.values());
    }

    captureMouseIfNotCaptured(): void {
        if (typeof document === "undefined") {
            console.warn("Document is undefined, cannot capture mouse");
            return;
        }
        if (document.pointerLockElement === this.inputState.canvasElement) {
            return;
        }

        this.captureMouse();
    }

    // Input state management
    setMouseButton(
        button: "left" | "right" | "middle",
        pressed: boolean
    ): void {
        const prev = this.inputState.mouseButtons[button];
        this.inputState.mouseButtons[button] = pressed;

        // Capture mouse if not already
        if (this.inputState.mouseCaptured) this.captureMouseIfNotCaptured();

        // Emit button events on transition
        if (pressed !== prev) {
            this.emitEvent(pressed ? "mousedown" : "mouseup", button);
        }
    }

    getMouseButton(button: "left" | "right" | "middle"): boolean {
        return this.inputState.mouseButtons[button];
    }

    setKey(key: string, pressed: boolean): void {
        const k = key.toLowerCase();
        const prev = this.inputState.keys.get(k) || false;
        this.inputState.keys.set(k, pressed);
        if (pressed !== prev) {
            this.emitEvent(pressed ? "keydown" : "keyup", k);
        }
    }

    getKey(key: string): boolean {
        return this.inputState.keys.get(key.toLowerCase()) || false;
    }

    setMousePosition(x: number, y: number): void {
        const oldX = this.inputState.mousePosition.x;
        const oldY = this.inputState.mousePosition.y;
        this.inputState.mousePosition = { x, y };
        this.inputState.mouseDelta = {
            x: x - oldX,
            y: y - oldY,
        };
        this.emitEvent("mousemove", x, y);
    }

    setMouseDelta(deltaX: number, deltaY: number): void {
        this.inputState.mouseDelta = {
            x: deltaX,
            y: deltaY,
        };
    }

    getMousePosition(): { x: number; y: number } {
        return { ...this.inputState.mousePosition };
    }

    getMouseDelta(): { x: number; y: number } {
        return { ...this.inputState.mouseDelta };
    }

    resetInputState(preserveCanvas = true): void {
        const currentCanvas = preserveCanvas
            ? this.inputState.canvasElement
            : null;
        let center = { x: 0, y: 0 };
        if (currentCanvas) {
            try {
                const rect = currentCanvas.getBoundingClientRect();
                center = { x: rect.width / 2, y: rect.height / 2 };
            } catch {
                // ignore
            }
        }

        this.inputState = {
            mouseButtons: {
                left: false,
                right: false,
                middle: false,
            },
            keys: new Map(),
            mousePosition: { x: 0, y: 0 },
            mouseDelta: { x: 0, y: 0 },
            canvasCenter: center,
            canvasElement: currentCanvas,
            mouseCaptured: false,
        };
    }

    resetMouseDelta(): void {
        this.inputState.mouseDelta = { x: 0, y: 0 };
    }

    setCanvasElement(canvas: HTMLCanvasElement | null): void {
        console.log("Setting canvas element", canvas);
        this.inputState.canvasElement = canvas;
        try {
            if (typeof window !== "undefined") {
                window.__beanengineCanvas = canvas;
            }
        } catch {
            // ignore
        }
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            this.inputState.canvasCenter = {
                x: rect.width / 2,
                y: rect.height / 2,
            };
        }
    }

    getCanvasElement(): HTMLCanvasElement | null {
        // yeah so multiple ways of getting canvas bc sometimes the store loses it??? yeah idk prob not good but yeah

        let canvas = this.inputState.canvasElement;
        if (!canvas) {
            // Try global singleton (helps when multiple runtimeStore instances exist)
            try {
                if (
                    typeof window !== "undefined" &&
                    window.__beanengineCanvas
                ) {
                    canvas = window.__beanengineCanvas;
                }
            } catch {
                // ignore
            }
        }

        // Last resort: probe DOM for a canvas element
        if (!canvas) {
            try {
                if (typeof document !== "undefined") {
                    const found = document.querySelector(
                        "canvas"
                    ) as HTMLCanvasElement | null;
                    if (found) {
                        this.inputState.canvasElement = found;
                        try {
                            if (typeof window !== "undefined") {
                                window.__beanengineCanvas = found;
                            }
                        } catch {
                            // ignore
                        }
                        canvas = found;
                    }
                }
            } catch {
                // ignore
            }
        }

        console.log("Getting canvas element", canvas);
        return canvas ?? null;
    }

    getCanvasSize(): { width: number; height: number } {
        const canvas = this.getCanvasElement();
        if (!canvas) {
            return { width: 0, height: 0 };
        }
        const rect = canvas.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }

    getMousePositionFromCenter(): { x: number; y: number } {
        return {
            x: this.inputState.mousePosition.x - this.inputState.canvasCenter.x,
            y: this.inputState.mousePosition.y - this.inputState.canvasCenter.y,
        };
    }

    setGameObjectManager(gameObjectManager: GameObjectManager | null): void {
        this.gameObjectManager = gameObjectManager;
    }

    getGameObjectManager(): GameObjectManager | null {
        return this.gameObjectManager;
    }

    // Pointer Lock helpers (INTERNAL, use setCaptureMouse to capture mouse)
    async captureMouse(): Promise<boolean> {
        if (typeof document === "undefined") return false;
        const canvas = this.inputState.canvasElement;
        if (!canvas) {
            this.addLog(
                "warn",
                "captureMouse called without a canvas element set",
                "runtimeStore"
            );
            return false;
        }
        try {
            const anyCanvas = canvas as any;
            const req = anyCanvas.requestPointerLock?.bind(anyCanvas);
            if (!req) {
                this.addLog(
                    "warn",
                    "Pointer Lock API not supported on this element",
                    "runtimeStore"
                );
                return false;
            }
            // Try unadjustedMovement when supported
            const ret = req({ unadjustedMovement: true } as any);
            if (ret && typeof ret.then === "function") {
                await ret; // await promise in supporting browsers
            }

            return this.inputState.mouseCaptured;
        } catch (e) {
            this.addLog("error", "Failed to capture mouse", "runtimeStore", e);
            return false;
        }
    }

    // INTERNAL
    uncaptureMouse(): void {
        if (typeof document === "undefined") return;
        try {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        } finally {
            this.inputState.mouseCaptured = false;
        }
    }

    setCaptureMouse(captured: boolean): void {
        this.inputState.mouseCaptured = captured;

        if (captured) {
            this.captureMouse();
        } else {
            this.uncaptureMouse();
        }
    }

    isMouseCaptured(): boolean {
        return this.inputState.mouseCaptured;
    }

    getThreeScene(): THREE.Scene | null {
        return this.threeScene;
    }

    setThreeScene(scene: THREE.Scene | null): void {
        this.threeScene = scene;
    }

    registerBodyHandle(handle: number, objectId: string): void {
        this.bodyHandleToObjectId.set(handle, objectId);
    }

    unregisterBodyHandle(handle: number): void {
        this.bodyHandleToObjectId.delete(handle);
    }

    registerColliderHandle(handle: number, objectId: string): void {
        this.colliderHandleToObjectId.set(handle, objectId);
    }

    unregisterColliderHandle(handle: number): void {
        this.colliderHandleToObjectId.delete(handle);
    }

    getObjectIdForColliderHandle(handle: number): string | null {
        return this.colliderHandleToObjectId.get(handle) ?? null;
    }

    /**
     * Handle a collision event emitted by Rapier's EventQueue.
     */
    handleCollisionEvent(
        colliderHandle1: number,
        colliderHandle2: number,
        started: boolean
    ): void {
        const idA = this.colliderHandleToObjectId.get(colliderHandle1);
        const idB = this.colliderHandleToObjectId.get(colliderHandle2);
        if (!idA || !idB) return;

        const [self, other] = idA <= idB ? [idA, idB] : [idB, idA];
        const key = `${self}|${other}`;

        if (started) {
            if (!this.activeCollisionPairs.has(key)) {
                this.activeCollisionPairs.add(key);
                this.emitEvent("collisionenter", self, other);
            }
        } else {
            if (this.activeCollisionPairs.delete(key)) {
                this.emitEvent("collisionexit", self, other);
            }
        }
    }

    /** Emit collisionstay for all currently active collision pairs. */
    emitCollisionStayFrame(): void {
        if (this.activeCollisionPairs.size === 0) return;
        for (const key of this.activeCollisionPairs) {
            const [a, b] = key.split("|");
            this.emitEvent("collisionstay", a, b);
        }
    }
}

// Create reactive store
function createRuntimeStore() {
    const manager = new RuntimeManager();
    const { subscribe, update } = writable(manager);

    return {
        subscribe,

        log: (
            level: LogLevel,
            message: string,
            source?: string,
            data?: any
        ) => {
            manager.addLog(level, message, source, data);
            update((m) => m);
        },

        info: (message: string, source?: string, data?: any) => {
            manager.addLog("info", message, source, data);
            update((m) => m);
        },

        warn: (message: string, source?: string, data?: any) => {
            manager.addLog("warn", message, source, data);
            update((m) => m);
        },

        error: (message: string, source?: string, data?: any) => {
            manager.addLog("error", message, source, data);
            update((m) => m);
        },

        clearLogs: () => {
            manager.clearLogs();
            update((m) => m);
        },

        getLogsByLevel: (level: LogLevel) => {
            return manager.getLogsByLevel(level);
        },

        setVariable: (
            name: string,
            value: any,
            scope: "global" | "local" = "global",
            scriptId?: string
        ) => {
            manager.setVariable(name, value, scope, scriptId);
            update((m) => m);
        },

        getVariable: (name: string, scriptId?: string) => {
            return manager.getVariable(name, scriptId);
        },

        getAllVariables: () => {
            return manager.getAllVariables();
        },

        addRunningScript: (id: string, name: string) => {
            manager.addRunningScript(id, name);
            update((m) => m);
        },

        updateScriptStatus: (id: string, status: RunningScript["status"]) => {
            manager.updateScriptStatus(id, status);
            update((m) => m);
        },

        removeScript: (id: string) => {
            manager.removeScript(id);
            update((m) => m);
        },

        getAllRunningScripts: () => {
            return manager.getAllRunningScripts();
        },

        // Input state management
        setMouseButton: (
            button: "left" | "right" | "middle",
            pressed: boolean
        ) => {
            manager.setMouseButton(button, pressed);
            update((m) => m);
        },

        getMouseButton: (button: "left" | "right" | "middle") => {
            return manager.getMouseButton(button);
        },

        setKey: (key: string, pressed: boolean) => {
            manager.setKey(key, pressed);
            update((m) => m);
        },

        getKey: (key: string) => {
            return manager.getKey(key);
        },

        setMousePosition: (x: number, y: number) => {
            manager.setMousePosition(x, y);
            update((m) => m);
        },

        setMouseDelta: (deltaX: number, deltaY: number) => {
            manager.setMouseDelta(deltaX, deltaY);
            update((m) => m);
        },

        getMousePosition: () => {
            return manager.getMousePosition();
        },

        getMouseDelta: () => {
            return manager.getMouseDelta();
        },

        resetInputState: () => {
            manager.resetInputState();
            update((m) => m);
        },

        resetMouseDelta: () => {
            manager.resetMouseDelta();
            update((m) => m);
        },

        setCanvasElement: (canvas: HTMLCanvasElement | null) => {
            manager.setCanvasElement(canvas);
            update((m) => m);
        },

        getCanvasElement: () => {
            return manager.getCanvasElement();
        },

        getCanvasSize: () => {
            return manager.getCanvasSize();
        },

        getMousePositionFromCenter: () => {
            return manager.getMousePositionFromCenter();
        },

        // GameObjectManager management
        setGameObjectManager: (gameObjectManager: GameObjectManager | null) => {
            manager.setGameObjectManager(gameObjectManager);
            update((m) => m);
        },

        getGameObjectManager: () => {
            return manager.getGameObjectManager();
        },

        // Pointer Lock functions
        setCaptureMouse: (captured: boolean) => {
            manager.setCaptureMouse(captured);
            update((m) => m);
        },
        isMouseCaptured: () => {
            return manager.isMouseCaptured();
        },

        getThreeScene: () => {
            return manager.getThreeScene();
        },

        setThreeScene: (scene: THREE.Scene | null) => {
            manager.setThreeScene(scene);
            update((m) => m);
        },

        // Runtime property overrides API (public)
        setPropertyOverride: (
            objectId: string,
            key: string,
            value: unknown
        ) => {
            manager.setPropertyOverride(objectId, key, value);
            update((m) => m);
        },
        getPropertyOverride: (objectId: string, key: string) => {
            return manager.getPropertyOverride(objectId, key);
        },
        clearPropertyOverride: (objectId: string, key?: string) => {
            manager.clearPropertyOverride(objectId, key);
            update((m) => m);
        },
        clearAllPropertyOverrides: () => {
            manager.clearAllPropertyOverrides();
            update((m) => m);
        },

        // Convex hull cache management
        getConvexHullCache: (
            assetId: string
        ): {
            centeredPoints: Float32Array;
            originalCenter: THREE.Vector3;
        } | null => {
            return manager.convex_hull_cache.get(assetId) || null;
        },

        setConvexHullCache: (
            assetId: string,
            data: {
                centeredPoints: Float32Array;
                originalCenter: THREE.Vector3;
            }
        ) => {
            manager.convex_hull_cache.set(assetId, data);
            update((m) => m);
        },

        // Event bus API
        on: (
            eventName: string,
            listener: (...args: any[]) => void
        ): (() => void) => {
            const off = manager.addEventListener(eventName, listener);
            update((m) => m);
            return off;
        },
        off: (eventName: string, listener: (...args: any[]) => void): void => {
            manager.removeEventListener(eventName, listener);
            update((m) => m);
        },
        emit: (eventName: string, ...args: any[]) => {
            manager.emitEvent(eventName, ...args);
        },
        registerBodyHandle: (handle: number, objectId: string) => {
            manager.registerBodyHandle(handle, objectId);
        },
        unregisterBodyHandle: (handle: number) => {
            manager.unregisterBodyHandle(handle);
        },
        registerColliderHandle: (handle: number, objectId: string) => {
            manager.registerColliderHandle(handle, objectId);
        },
        unregisterColliderHandle: (handle: number) => {
            manager.unregisterColliderHandle(handle);
        },
        getObjectIdForColliderHandle: (handle: number) => {
            return manager.getObjectIdForColliderHandle(handle);
        },
        handleCollisionEvent: (
            colliderHandle1: number,
            colliderHandle2: number,
            started: boolean
        ) => {
            manager.handleCollisionEvent(
                colliderHandle1,
                colliderHandle2,
                started
            );
        },
        emitCollisionStayFrame: () => {
            manager.emitCollisionStayFrame();
        },
    };
}

export const runtimeStore = createRuntimeStore();
export { RuntimeManager };

// Global logging functions for easy access
export const runtimeLog = {
    info: (message: string, source?: string, data?: any) =>
        runtimeStore.info(message, source, data),
    warn: (message: string, source?: string, data?: any) =>
        runtimeStore.warn(message, source, data),
    error: (message: string, source?: string, data?: any) =>
        runtimeStore.error(message, source, data),
};
