<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import Input from "$lib/components/ui/input/input.svelte";
    import { Switch } from "$lib/components/ui/switch";
    import Vector3Input from "./Vector3Input.svelte";
    import ClassSelector from "./ClassSelector.svelte";
    import {
        ChevronDown,
        ChevronRight,
        Box,
        Move3d,
        Palette,
        Eye,
        Search,
        Sun,
        Settings,
        MoreHorizontal,
        Hash,
    } from "lucide-svelte";

    interface Vector3 {
        x: number;
        y: number;
        z: number;
    }

    interface ObjectProperties {
        name: string;
        id: string;
        type: "Object" | "Node3D" | "Part" | "Light";
        // Node3D properties
        position?: Vector3;
        rotation?: Vector3;
        scale?: Vector3;
        // Part properties
        material?: string;
        castShadows?: boolean;
        receiveShadows?: boolean;
        visible?: boolean;
        // Light properties
        color?: string;
        intensity?: number;
        lightType?: "directional" | "point" | "spot";
    }

    let { selectedObject, currentClasses } = $props();

    const dispatch = createEventDispatcher<{
        propertyChange: { property: string; value: any };
        addClass: { className: string };
        removeClass: { className: string };
    }>();

    let expandedSections = $state({
        object: true,
        transform: true,
        part: true,
        light: true,
    });

    function toggleSection(section: keyof typeof expandedSections) {
        expandedSections[section] = !expandedSections[section];
    }

    function handlePropertyChange(property: string, value: any) {
        dispatch("propertyChange", { property, value });
    }

    function isNode3D(obj: ObjectProperties): boolean {
        return (
            obj.type === "Node3D" || obj.type === "Part" || obj.type === "Light"
        );
    }

    function isPart(obj: ObjectProperties): boolean {
        return obj.type === "Part";
    }

    function isLight(obj: ObjectProperties): boolean {
        return obj.type === "Light";
    }
</script>

<div
    class="h-full bg-card/60 backdrop-blur-sm border-l border-border/30 flex flex-col relative overflow-hidden"
>
    <!-- Subtle gradient accent -->
    <div class="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-blue-500/3 pointer-events-none"></div>
    
    <!-- Header -->
    <div class="p-4 border-b border-border/30 relative z-10">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-foreground font-semibold">Properties</h2>
            <Button
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-muted-foreground hover:text-green-400 hover:bg-green-500/20"
                on:click={() => dispatch("addObject", {})}
            >
                <MoreHorizontal class="w-4 h-4" />
            </Button>
        </div>

        <!-- Search -->
        <div class="mt-3 relative">
            <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <Input
                type="text"
                placeholder="Search properties..."
                class="pl-8 bg-muted/50 border-border/30 text-foreground text-sm h-8 focus:border-blue-500 focus:outline-none"
            />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto relative z-10">
        {#if selectedObject}
            <!-- Object Name -->
            <div class="px-3 py-2 border-b border-border/20">
                <label class="text-xs text-muted-foreground block mb-1 ml-1"
                    >Object Name</label
                >

                <Input
                    type="text"
                    value={selectedObject.name}
                    class="bg-transparent border-0 text-foreground text-sm font-medium h-auto focus:ring-0 focus:border-0"
                    on:input={(e) =>
                        handlePropertyChange("name", e.target.value)}
                />
                <div
                    class="text-xs text-muted-foreground font-mono mt-0.5 ml-1 flex items-center gap-1"
                >
                    <Hash class="w-3 h-3" />
                    {selectedObject.id}
                </div>
            </div>

            <!-- Transform Section -->
            {#if isNode3D(selectedObject)}
                <div class="border-b border-border/20">
                    <button
                        class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
                        on:click={() => toggleSection("transform")}
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                            <Move3d class="w-4 h-4 text-blue-400" />
                            Transform
                        </div>
                        {#if expandedSections.transform}
                            <ChevronDown class="w-3 h-3 text-muted-foreground" />
                        {:else}
                            <ChevronRight class="w-3 h-3 text-muted-foreground" />
                        {/if}
                    </button>
                    {#if expandedSections.transform}
                        <div class="px-3 pb-2 space-y-2">
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Position</label
                                >
                                <Vector3Input
                                    value={selectedObject.position || {
                                        x: 0,
                                        y: 0,
                                        z: 0,
                                    }}
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "position",
                                            e.detail.value
                                        )}
                                />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Rotation</label
                                >
                                <Vector3Input
                                    value={selectedObject.rotation || {
                                        x: 0,
                                        y: 0,
                                        z: 0,
                                    }}
                                    step={1}
                                    precision={1}
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "rotation",
                                            e.detail.value
                                        )}
                                />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Scale</label
                                >
                                <Vector3Input
                                    value={selectedObject.scale || {
                                        x: 1,
                                        y: 1,
                                        z: 1,
                                    }}
                                    step={0.1}
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "scale",
                                            e.detail.value
                                        )}
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Part Section -->
            {#if isPart(selectedObject)}
                <div class="border-b border-border/20">
                    <button
                        class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
                        on:click={() => toggleSection("part")}
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                            <Palette class="w-4 h-4 text-purple-400" />
                            Part
                        </div>
                        {#if expandedSections.part}
                            <ChevronDown class="w-3 h-3 text-muted-foreground" />
                        {:else}
                            <ChevronRight class="w-3 h-3 text-muted-foreground" />
                        {/if}
                    </button>
                    {#if expandedSections.part}
                        <div class="px-3 pb-2 space-y-2">
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Material</label
                                >
                                <select
                                    value={selectedObject.material || "Default"}
                                    class="w-full bg-muted/50 border border-border/30 text-foreground text-xs px-2 py-1.5 rounded focus:border-purple-400 focus:outline-none"
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "material",
                                            e.target.value
                                        )}
                                >
                                    <option value="Default">Default</option>
                                    <option value="Metal">Metal</option>
                                    <option value="Wood">Wood</option>
                                    <option value="Glass">Glass</option>
                                    <option value="Plastic">Plastic</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs text-muted-foreground"
                                        >Shadows</label
                                    >
                                    <Switch
                                        size="sm"
                                        checked={selectedObject.castShadows !==
                                            false}
                                        on:change={(e) =>
                                            handlePropertyChange(
                                                "castShadows",
                                                e.detail
                                            )}
                                    />
                                </div>
                                <div class="flex items-center justify-between">
                                    <label class="text-xs text-muted-foreground"
                                        >Receive</label
                                    >
                                    <Switch
                                        size="sm"
                                        checked={selectedObject.receiveShadows !==
                                            false}
                                        on:change={(e) =>
                                            handlePropertyChange(
                                                "receiveShadows",
                                                e.detail
                                            )}
                                    />
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <label
                                    class="text-xs text-muted-foreground flex items-center gap-1"
                                >
                                    <Eye class="w-3 h-3" />
                                    Visible
                                </label>
                                <Switch
                                    size="sm"
                                    checked={selectedObject.visible !== false}
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "visible",
                                            e.detail
                                        )}
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Light Section -->
            {#if isLight(selectedObject)}
                <div class="border-b border-border/20">
                    <button
                        class="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
                        on:click={() => toggleSection("light")}
                    >
                        <div
                            class="flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                            <Sun class="w-4 h-4 text-yellow-400" />
                            Light
                        </div>
                        {#if expandedSections.light}
                            <ChevronDown class="w-3 h-3 text-muted-foreground" />
                        {:else}
                            <ChevronRight class="w-3 h-3 text-muted-foreground" />
                        {/if}
                    </button>
                    {#if expandedSections.light}
                        <div class="px-3 pb-2 space-y-2">
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Type</label
                                >
                                <select
                                    value={selectedObject.lightType ||
                                        "directional"}
                                    class="w-full bg-muted/50 border border-border/30 text-foreground text-xs px-2 py-1.5 rounded focus:border-yellow-400 focus:outline-none"
                                    on:change={(e) =>
                                        handlePropertyChange(
                                            "lightType",
                                            e.target.value
                                        )}
                                >
                                    <option value="directional"
                                        >Directional</option
                                    >
                                    <option value="point">Point</option>
                                    <option value="spot">Spot</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Color</label
                                >
                                <div class="flex gap-1.5">
                                    <input
                                        type="color"
                                        value={selectedObject.color ||
                                            "#ffffff"}
                                        class="w-8 h-6 bg-muted/50 border border-border/30 rounded cursor-pointer"
                                        on:input={(e) =>
                                            handlePropertyChange(
                                                "color",
                                                e.target.value
                                            )}
                                    />
                                    <Input
                                        type="text"
                                        value={selectedObject.color ||
                                            "#ffffff"}
                                        class="flex-1 bg-muted/50 border-border/30 text-foreground text-xs font-mono h-6 px-2"
                                        on:input={(e) =>
                                            handlePropertyChange(
                                                "color",
                                                e.target.value
                                            )}
                                    />
                                </div>
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-muted-foreground block"
                                    >Intensity</label
                                >
                                <Input
                                    type="number"
                                    value={selectedObject.intensity || 1.0}
                                    step={0.1}
                                    min={0}
                                    class="bg-muted/50 border-border/30 text-foreground text-xs h-6 px-2 focus:border-yellow-400"
                                    on:input={(e) =>
                                        handlePropertyChange(
                                            "intensity",
                                            parseFloat(e.target.value) || 0
                                        )}
                                />
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Classes Section -->
            <div class="border-b border-border/20">
                <div class="px-3 py-2">
                    <div
                        class="flex items-center gap-2 text-sm font-medium text-foreground mb-2"
                    >
                        <Settings class="w-4 h-4 text-orange-400" />
                        Classes
                    </div>
                    <ClassSelector
                        {currentClasses}
                        on:addClass={(e) => dispatch("addClass", e.detail)}
                        on:removeClass={(e) =>
                            dispatch("removeClass", e.detail)}
                    />
                </div>
            </div>
        {:else}
            <!-- No object selected state -->
            <div
                class="flex flex-col items-center justify-center h-64 text-center px-4"
            >
                <Box class="w-8 h-8 text-muted-foreground mb-2" />
                <p class="text-muted-foreground text-sm">
                    Select an object to view properties
                </p>
            </div>
        {/if}
    </div>
</div>
