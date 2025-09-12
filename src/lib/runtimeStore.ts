// src/lib/runtimeStore.ts
import { writable } from "svelte/store";
import { nanoid } from "nanoid";

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

class RuntimeManager {
    public logs: RuntimeLog[];
    public variables: Map<string, RuntimeVariable>;
    public runningScripts: Map<string, RunningScript>;
    public maxLogs: number;

    constructor() {
        this.logs = [];
        this.variables = new Map();
        this.runningScripts = new Map();
        this.maxLogs = 1000; // Limit logs to prevent memory issues
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
            case "debug":
                console.debug(consoleMessage, data);
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
        scope: "global" | "local" = "global"
    ): void {
        const variable: RuntimeVariable = {
            name,
            value,
            type: typeof value,
            scope,
        };

        console.log("SETTING VARIABLE", name, value);

        this.variables.set(name, variable);
    }

    getVariable(name: string): RuntimeVariable | undefined {
        return this.variables.get(name);
    }

    getAllVariables(): RuntimeVariable[] {
        return Array.from(this.variables.values());
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
            scope: "global" | "local" = "global"
        ) => {
            manager.setVariable(name, value, scope);
            update((m) => m);
        },

        getVariable: (name: string) => {
            return manager.getVariable(name);
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

// Make it available globally for easy access from anywhere
if (typeof window !== "undefined") {
    (window as any).runtimeLog = runtimeLog;
}
