<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import { Badge } from "$lib/components/ui/badge";

    import {
        Terminal,
        Search,
        Trash2,
        Play,
        Pause,
        Square,
        AlertTriangle,
        Info,
        XCircle,
        Bug,
        Eye,
        Code,
        Activity,
        MoreHorizontal,
    } from "lucide-svelte";

    import { runtimeStore } from "$lib/runtimeStore";
    import type { LogLevel, RuntimeLog } from "$lib/runtimeStore";
    import { onMount } from "svelte";

    // Reactive store data
    $: logs = $runtimeStore.logs;
    $: variables = $runtimeStore.getAllVariables();
    $: runningScripts = $runtimeStore.getAllRunningScripts();

    // Filter states
    let logFilter = "";
    let selectedLogLevels = new Set(["info", "warn", "error"]);
    let autoScroll = true;

    // Console element for auto-scrolling
    let consoleContainer: HTMLElement;

    // Filter logs based on search and level
    $: filteredLogs = logs.filter((log) => {
        const matchesFilter =
            logFilter === "" ||
            log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
            (log.source &&
                log.source.toLowerCase().includes(logFilter.toLowerCase()));
        const matchesLevel = selectedLogLevels.has(log.level);
        return matchesFilter && matchesLevel;
    });

    // Auto-scroll to bottom when new logs arrive
    $: if (autoScroll && consoleContainer && logs.length > 0) {
        setTimeout(() => {
            consoleContainer.scrollTop = consoleContainer.scrollHeight;
        }, 0);
    }

    function toggleLogLevel(level: LogLevel) {
        if (selectedLogLevels.has(level)) {
            selectedLogLevels.delete(level);
        } else {
            selectedLogLevels.add(level);
        }
        selectedLogLevels = new Set(selectedLogLevels);
    }

    function clearLogs() {
        runtimeStore.clearLogs();
    }

    function getLogIcon(level: LogLevel) {
        switch (level) {
            case "error":
                return XCircle;
            case "warn":
                return AlertTriangle;
            default:
                return Info;
        }
    }

    function getLogColor(level: LogLevel) {
        switch (level) {
            case "error":
                return "text-red-400";
            case "warn":
                return "text-yellow-400";
            default:
                return "text-blue-400";
        }
    }

    function formatTimestamp(date: Date) {
        return date.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    }

    function formatValue(value: any): string {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        if (typeof value === "string") return `"${value}"`;
        if (typeof value === "object") return JSON.stringify(value, null, 2);
        return String(value);
    }

    function getVariableColor(type: string) {
        switch (type) {
            case "string":
                return "text-green-400";
            case "number":
                return "text-blue-400";
            case "boolean":
                return "text-purple-400";
            case "object":
                return "text-orange-400";
            case "function":
                return "text-pink-400";
            default:
                return "text-gray-400";
        }
    }

    // Add some demo logs on mount
    onMount(() => {
        runtimeStore.info("DevTools panel initialized", "DevTools");
        runtimeStore.warn(
            "beanengine is in early alpha! Expect bugs and missing features.",
            "System"
        );

        // Add some demo variables
        // TODO: uhh make it not demo :)
        runtimeStore.setVariable("gameTime", 0.0, "global");
        runtimeStore.setVariable("playerHealth", 100, "global");
        runtimeStore.setVariable("isPlaying", true, "global");
        runtimeStore.setVariable("currentScene", "MainScene", "local");

        // Add some demo running scripts
        runtimeStore.addRunningScript("script-1", "PlayerController");
        runtimeStore.addRunningScript("script-2", "GameManager");
    });
</script>

<div
    class="h-full bg-card/60 backdrop-blur-sm border-l border-border/30 flex flex-col relative overflow-hidden"
>
    <!-- Subtle gradient accent -->
    <div
        class="absolute inset-0 bg-gradient-to-bl from-green-500/5 via-transparent to-emerald-500/3 pointer-events-none"
    ></div>

    <!-- Header -->
    <div class="p-5 border-b border-border/30 relative z-10 space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-green-500/10 rounded-lg">
                    <Terminal class="w-5 h-5 text-green-400" />
                </div>
                <h2 class="text-foreground font-semibold text-lg">Dev Tools</h2>
            </div>
            <Button
                variant="ghost"
                size="sm"
                class="h-10 w-10 p-0 rounded-xl bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground shadow-sm transition-all duration-200"
                title="More options"
            >
                <MoreHorizontal class="w-5 h-5" />
            </Button>
        </div>
    </div>

    <div class="flex-1 overflow-hidden relative z-10">
        <Tabs.Root value="console" class="h-full flex flex-col">
            <Tabs.List
                class="grid w-full grid-cols-3 bg-muted/20 m-4 mb-0 rounded-xl"
            >
                <Tabs.Trigger value="console" class="rounded-lg">
                    <Terminal class="w-4 h-4 mr-2" />
                    Console
                </Tabs.Trigger>
                <Tabs.Trigger value="variables" class="rounded-lg">
                    <Eye class="w-4 h-4 mr-2" />
                    Variables
                </Tabs.Trigger>
                <Tabs.Trigger value="scripts" class="rounded-lg">
                    <Code class="w-4 h-4 mr-2" />
                    Scripts
                </Tabs.Trigger>
            </Tabs.List>

            <!-- Console Tab -->
            <Tabs.Content
                value="console"
                class="flex-1 flex flex-col p-4 pt-2 space-y-3"
            >
                <!-- Console Controls -->
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="relative flex-1 min-w-0">
                        <div
                            class="absolute left-3 top-1/2 transform -translate-y-1/2 z-10"
                        >
                            <Search class="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Filter logs..."
                            bind:value={logFilter}
                            class="pl-10 pr-4 py-2 bg-muted/40 border-border/40 text-foreground text-sm rounded-lg h-9 focus:border-blue-400/60 focus:bg-muted/60 focus:outline-none transition-all duration-200"
                        />
                    </div>

                    <div class="flex items-center gap-1 overflow-y-scroll">
                        {#each ["info", "warn", "error"] as level}
                            <Button
                                variant={selectedLogLevels.has(level)
                                    ? "secondary"
                                    : "ghost"}
                                size="sm"
                                class="h-9 px-3 text-xs {getLogColor(
                                    level
                                )} {selectedLogLevels.has(level)
                                    ? 'bg-muted/60'
                                    : 'hover:bg-muted/40'}"
                                onclick={() => toggleLogLevel(level)}
                            >
                                <svelte:component
                                    this={getLogIcon(level)}
                                    class="w-3 h-3 mr-1"
                                />
                            </Button>
                        {/each}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        class="h-9 px-3 text-xs hover:bg-red-500/10 hover:text-red-400"
                        onclick={clearLogs}
                        title="Clear logs"
                    >
                        <Trash2 class="w-3 h-3" />
                    </Button>
                </div>

                <!-- Console Output -->
                <div
                    bind:this={consoleContainer}
                    class="flex-1 bg-black/20 backdrop-blur-sm border border-border/40 rounded-xl p-3 overflow-y-auto font-mono text-sm space-y-1 min-h-0"
                >
                    {#each filteredLogs as log (log.id)}
                        <div
                            class="py-2 px-2 {log.level === 'error'
                                ? 'bg-red-500/10'
                                : ''} {log.level === 'warn'
                                ? 'bg-yellow-500/10'
                                : ''} rounded-lg transition-colors space-y-1"
                        >
                            <div
                                class="flex items-center gap-2 min-w-0 flex-shrink-0"
                            >
                                <svelte:component
                                    this={getLogIcon(log.level)}
                                    class="w-3 h-3 {getLogColor(
                                        log.level
                                    )} flex-shrink-0"
                                />
                                <span
                                    class="text-xs text-muted-foreground font-mono"
                                >
                                    {formatTimestamp(log.timestamp)}
                                </span>
                                {#if log.source}
                                    <span
                                        class="text-xs text-muted-foreground bg-muted/30 px-1 rounded"
                                    >
                                        {log.source}
                                    </span>
                                {/if}
                            </div>
                            <div class="pl-5">
                                <div
                                    class="text-foreground break-words leading-relaxed"
                                >
                                    {log.message}
                                </div>
                                {#if log.data}
                                    <div
                                        class="text-xs text-muted-foreground mt-2 bg-muted/20 p-2 rounded border-l-2 border-muted-foreground/20"
                                    >
                                        <pre
                                            class="whitespace-pre-wrap">{JSON.stringify(
                                                log.data,
                                                null,
                                                2
                                            )}</pre>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <div
                            class="flex items-center justify-center h-32 text-muted-foreground"
                        >
                            <div class="text-center">
                                <Terminal
                                    class="w-8 h-8 mx-auto mb-2 opacity-50"
                                />
                                <p class="text-sm">
                                    No logs match current filters
                                </p>
                            </div>
                        </div>
                    {/each}
                </div>
            </Tabs.Content>

            <!-- Variables Tab -->
            <Tabs.Content
                value="variables"
                class="flex-1 flex flex-col p-4 pt-2 space-y-3"
            >
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-sm"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-blue-500/10 rounded-lg">
                            <Eye class="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Runtime Variables
                        </h3>
                        <Badge variant="outline" class="ml-auto"
                            >{variables.length}</Badge
                        >
                    </div>

                    <div class="space-y-2 max-h-96 overflow-y-auto">
                        {#each variables as variable (variable.name)}
                            <div
                                class="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span
                                            class="font-mono text-sm font-medium text-foreground"
                                            >{variable.name}</span
                                        >
                                        <Badge
                                            variant="secondary"
                                            class="text-xs {getVariableColor(
                                                variable.type
                                            )}"
                                        >
                                            {variable.type}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            class="text-xs"
                                        >
                                            {variable.scope}
                                        </Badge>
                                    </div>
                                    <div
                                        class="text-xs text-muted-foreground font-mono bg-black/20 p-2 rounded border-l-2 border-blue-400/30"
                                    >
                                        <pre
                                            class="whitespace-pre-wrap">{formatValue(
                                                variable.value
                                            )}</pre>
                                    </div>
                                </div>
                            </div>
                        {:else}
                            <div
                                class="flex items-center justify-center h-32 text-muted-foreground"
                            >
                                <div class="text-center">
                                    <Eye
                                        class="w-8 h-8 mx-auto mb-2 opacity-50"
                                    />
                                    <p class="text-sm">No variables in scope</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </Tabs.Content>

            <!-- Scripts Tab -->
            <Tabs.Content
                value="scripts"
                class="flex-1 flex flex-col p-4 pt-2 space-y-3"
            >
                <div
                    class="bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-sm"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-purple-500/10 rounded-lg">
                            <Code class="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 class="font-semibold text-lg text-foreground">
                            Running Scripts
                        </h3>
                        <Badge variant="outline" class="ml-auto"
                            >{runningScripts.length}</Badge
                        >
                    </div>

                    <div class="space-y-2 max-h-96 overflow-y-auto">
                        {#each runningScripts as script (script.id)}
                            <div
                                class="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div class="flex items-center gap-2">
                                    {#if script.status === "running"}
                                        <div
                                            class="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                                        ></div>
                                    {:else if script.status === "paused"}
                                        <div
                                            class="w-2 h-2 bg-yellow-400 rounded-full"
                                        ></div>
                                    {:else if script.status === "error"}
                                        <div
                                            class="w-2 h-2 bg-red-400 rounded-full"
                                        ></div>
                                    {:else}
                                        <div
                                            class="w-2 h-2 bg-gray-400 rounded-full"
                                        ></div>
                                    {/if}
                                </div>

                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span
                                            class="font-medium text-foreground"
                                            >{script.name}</span
                                        >
                                        <Badge
                                            variant="secondary"
                                            class="text-xs {script.status ===
                                            'running'
                                                ? 'bg-green-500/10 text-green-400'
                                                : script.status === 'paused'
                                                  ? 'bg-yellow-500/10 text-yellow-400'
                                                  : script.status === 'error'
                                                    ? 'bg-red-500/10 text-red-400'
                                                    : 'bg-gray-500/10 text-gray-400'}"
                                        >
                                            {script.status}
                                        </Badge>
                                    </div>
                                    <div class="text-xs text-muted-foreground">
                                        Started: {formatTimestamp(
                                            script.startTime
                                        )}
                                        • Updated: {formatTimestamp(
                                            script.lastUpdate
                                        )}
                                    </div>
                                </div>

                                <div class="flex items-center gap-1">
                                    {#if script.status === "running"}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-8 w-8 p-0 hover:bg-yellow-500/10 hover:text-yellow-400"
                                            onclick={() =>
                                                runtimeStore.updateScriptStatus(
                                                    script.id,
                                                    "paused"
                                                )}
                                            title="Pause script"
                                        >
                                            <Pause class="w-3 h-3" />
                                        </Button>
                                    {:else if script.status === "paused"}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-400"
                                            onclick={() =>
                                                runtimeStore.updateScriptStatus(
                                                    script.id,
                                                    "running"
                                                )}
                                            title="Resume script"
                                        >
                                            <Play class="w-3 h-3" />
                                        </Button>
                                    {/if}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-400"
                                        onclick={() =>
                                            runtimeStore.removeScript(
                                                script.id
                                            )}
                                        title="Stop script"
                                    >
                                        <Square class="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        {:else}
                            <div
                                class="flex items-center justify-center h-32 text-muted-foreground"
                            >
                                <div class="text-center">
                                    <Code
                                        class="w-8 h-8 mx-auto mb-2 opacity-50"
                                    />
                                    <p class="text-sm">No scripts running</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </Tabs.Content>
        </Tabs.Root>
    </div>
</div>
