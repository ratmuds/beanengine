<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button";
    import {
        ResizablePaneGroup,
        ResizablePane,
        ResizableHandle,
    } from "$lib/components/ui/resizable";
    import { Separator } from "$lib/components/ui/separator";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuCheckboxItem,
        DropdownMenuTrigger,
    } from "$lib/components/ui/dropdown-menu";

    import {
        Play,
        Pause,
        Move,
        RotateCw,
        Scaling,
        House,
        Earth,
        LayoutDashboard,
        MousePointer2,
        Box,
        Camera,
        Lightbulb,
        Settings,
        X,
        Code2,
        Monitor,
        Palette,
        Package,
        FileImage,
        Music,
        Gamepad2,
        Clapperboard,
        Plus,
        Sparkles,
        Save,
    } from "lucide-svelte";

    import { Canvas } from "@threlte/core";
    import Scene from "$lib/components/editor/ViewportScene.svelte";
    import GameRuntime from "$lib/components/GameRuntime.svelte";
    import RuntimeUI from "$lib/runtime/RuntimeUI.svelte";
    import CustomCodeEditor from "$lib/components/CodeEditor.svelte";
    import ObjectExplorer from "$lib/components/editor/ObjectExplorer.svelte";
    import CodePalette from "$lib/components/code/CodePalette.svelte";
    import PropertiesPanel from "$lib/components/editor/PropertiesPanel.svelte";
    import DevToolsPanel from "$lib/components/DevToolsPanel.svelte";
    import ViewportLoader from "$lib/components/editor/ViewportLoader.svelte";

    import * as Types from "$lib/types";
    import { sceneStore } from "$lib/sceneStore";

    import AssetBrowser from "$lib/components/editor/AssetBrowser.svelte";
    import MaterialBrowser from "$lib/components/editor/MaterialBrowser.svelte";
    import ParticleBrowser from "$lib/components/editor/ParticleBrowser.svelte";
    import { materialStore } from "$lib/materialStore";
    import { assetStore } from "$lib/assetStore";
    import { particleStore } from "$lib/particleStore";
    import { runtimeStore } from "$lib/runtimeStore";
    import type { BAsset } from "$lib/types";

    function handleAddObject(
        event: CustomEvent<{ parentId: string | number; type?: string }>
    ) {
        const { type, parentId } = event.detail;

        if (!type) {
            console.warn("No object type specified");
            return;
        }

        // Use the generic createObject method
        sceneStore.createObject(type.toLowerCase(), parentId);
        console.log(`Created ${type} object with parent:`, parentId);
    }

    function handleReparentObject(
        event: CustomEvent<{ objectId: string; newParentId: string | number }>
    ) {
        const { objectId, newParentId } = event.detail;
        sceneStore.reparentObject(objectId, newParentId);
    }

    function createScript(parentId: string | number) {
        sceneStore.createScript(parentId);
    }

    let selectedObject = $state(-1);
    let objectExplorerRef = $state<any>();

    // Keyboard shortcuts
    function handleKeydown(event: KeyboardEvent) {
        // Don't handle shortcuts if user is typing in an input field
        const target = event.target as HTMLElement;
        if (
            target &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable ||
                target.closest("input") ||
                target.closest("textarea"))
        ) {
            return;
        }

        if (event.shiftKey && event.key.toLowerCase() === "a") {
            event.preventDefault();
            // Trigger add object dialog in ObjectExplorer
            if (objectExplorerRef) {
                console.log(
                    "opening add dialog. selectedObject:",
                    selectedObject
                );
                objectExplorerRef.openAddDialog(
                    selectedObject === -1 ? null : selectedObject
                );
            }
        }

        // Tool selection shortcuts (1-4)
        if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
            switch (event.key) {
                case "1":
                    event.preventDefault();
                    activeTool = "select";
                    break;
                case "2":
                    event.preventDefault();
                    activeTool = "move";
                    transformMode = "translate";
                    break;
                case "3":
                    event.preventDefault();
                    activeTool = "rotate";
                    transformMode = "rotate";
                    break;
                case "4":
                    event.preventDefault();
                    activeTool = "scale";
                    transformMode = "scale";
                    break;
            }
        }
    }

    // Tab management state
    interface TabInfo {
        id: string;
        label: string;
        icon: any;
        closeable: boolean;
        visible: boolean;
    }

    const availableTabs: TabInfo[] = [
        {
            id: "viewport",
            label: "Viewport",
            icon: Monitor,
            closeable: false,
            visible: true,
        },
        {
            id: "script",
            label: "Script",
            icon: Code2,
            closeable: true,
            visible: true,
        },
        {
            id: "materials",
            label: "Materials",
            icon: Palette,
            closeable: true,
            visible: false,
        },
        {
            id: "particles",
            label: "Particles",
            icon: Sparkles,
            closeable: true,
            visible: false,
        },
        {
            id: "assets",
            label: "Assets",
            icon: Package,
            closeable: true,
            visible: false,
        },
        {
            id: "textures",
            label: "Textures",
            icon: FileImage,
            closeable: true,
            visible: false,
        },
        {
            id: "audio",
            label: "Audio",
            icon: Music,
            closeable: true,
            visible: false,
        },
        {
            id: "input",
            label: "Input",
            icon: Gamepad2,
            closeable: true,
            visible: false,
        },
        {
            id: "animation",
            label: "Animation",
            icon: Clapperboard,
            closeable: true,
            visible: false,
        },
    ];

    let openTabs = $state(availableTabs.filter((tab) => tab.visible));
    let activeTab = $state("viewport");
    let selectedScriptId = $state(null);
    let selectedScriptObject = $state(null);

    // Get scripts from scene - reactive to store changes
    let scripts = $derived(
        $sceneStore
            ? $sceneStore.scene.objects.filter((obj) => obj.type === "script")
            : []
    );

    // Update selected script object when selectedScriptId changes
    $effect(() => {
        if (selectedScriptId && scripts.length > 0) {
            selectedScriptObject =
                scripts.find((script) => script.id === selectedScriptId) ||
                null;
        } else if (scripts.length > 0 && !selectedScriptId) {
            // Auto-select the first script if none is selected
            selectedScriptId = scripts[0].id;
            selectedScriptObject = scripts[0];
        } else {
            selectedScriptObject = null;
        }
    });

    function closeTab(tabId: string) {
        if (tabId === activeTab && openTabs.length > 1) {
            const currentIndex = openTabs.findIndex((tab) => tab.id === tabId);
            const nextTab =
                openTabs[currentIndex + 1] || openTabs[currentIndex - 1];
            activeTab = nextTab.id;
        }
        openTabs = openTabs.filter((tab) => tab.id !== tabId);
        availableTabs.find((tab) => tab.id === tabId)!.visible = false;
    }

    function openTab(tabId: string) {
        const tab = availableTabs.find((t) => t.id === tabId);
        if (tab && !tab.visible) {
            tab.visible = true;
            openTabs = [...openTabs, tab];
            activeTab = tabId;
        }
    }

    // Properties panel handlers
    function handlePropertyChange(part: Types.BPart) {
        // Update the object in the store
        sceneStore.updateObject(part);
        console.log("Property changed:", part);
    }

    // Add initial test objects on mount
    onMount(() => {
        const testPart = new Types.BPart("Test Object", null, null);
        testPart.position = new Types.BVector3(0, 0, 0);
        testPart.scale = new Types.BVector3(10, 1, 10);
        sceneStore.addObject(testPart);

        initializeViewport();
    });

    // Loading state
    let isViewportLoading = $state(true);
    let loadingText = $state("Starting...");

    // Read project id from route and load if present
    let projectId = $page.params.id;

    async function tryLoadProjectById() {
        try {
            console.log("Attempting to load project with ID:", projectId);
            if (!projectId) return;

            loadingText = `Loading project ${projectId}...`;
            const raw = localStorage.getItem(`beanengine:project:${projectId}`);
            console.log("Raw project data:", raw);
            if (!raw) return;

            const payload = JSON.parse(raw);
            console.log("Loaded project data:", payload);
            sceneStore.clearScene();
            sceneStore.deserialize(payload);
        } catch (err) {
            console.error("Failed to load project", err);
        }
    }

    async function saveProject() {
        try {
            console.log("Attempting to save project with ID:", projectId);
            if (!projectId) return;

            const payload = sceneStore.serialize();
            localStorage.setItem(
                `beanengine:project:${projectId}`,
                JSON.stringify(payload)
            );

            console.log("Project saved:", payload);
        } catch (err) {
            console.error("Failed to save project", err);
        }
    }

    async function initializeViewport() {
        isViewportLoading = true;
        const steps = [
            { text: "Initializing viewport...", delay: 150 },
            { text: "Preparing scene...", delay: 150 },
            { text: "Loading assets...", delay: 150 },
        ];

        await tryLoadProjectById();

        for (const step of steps) {
            loadingText = step.text;
            await new Promise((r) => setTimeout(r, step.delay));
        }

        isViewportLoading = false;

        // Expand panels after viewport loads with smooth transition
        await new Promise((resolve) => setTimeout(resolve, 200));
        leftPanelSize = 20;
        rightPanelSize = 20;
        centerPanelSize = 60;
    }

    // Panel collapse state
    let leftPanelSize = $state(0);
    let rightPanelSize = $state(0);
    let centerPanelSize = $state(100);

    // Transform tool state
    let activeTool = $state("select");
    let transformMode = $state("translate");
    let transformSpace = $state("local");

    // Visual scripting compiled code
    let compiledCode = $state([]);

    // Simulate loading process
    // async function initializeViewport() {
    //     const loadingSteps = [
    //         { text: "Loading components...", delay: 800 },
    //         { text: "Finalizing", delay: 400 },
    //     ];
    //
    //     for (const step of loadingSteps) {
    //         loadingText = step.text;
    //         await new Promise((resolve) => setTimeout(resolve, step.delay));
    //     }
    //
    //     isViewportLoading = false;
    //
    //     // Expand panels after viewport loads with smooth transition
    //     await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay for smooth transition
    //     leftPanelSize = 20;
    //     rightPanelSize = 20;
    //     centerPanelSize = 60;
    // }

    // play mode

    let play = $state(false);

    function togglePlay() {
        play = !play;
        console.log("Play mode:", play);

        if (play) {
            runtimeStore.clearLogs();
            // Store current panel sizes before entering play mode
            // Then hide panels for full-screen game view
            /*leftPanelSize = 0;
            rightPanelSize = 0;
            centerPanelSize = 100;*/
        } else {
            // Restore panels when exiting play mode
            /*leftPanelSize = 20;
            rightPanelSize = 20;
            centerPanelSize = 60;*/
        }
    }

    // Asset browser handlers
    function handleAssetSelected(event: CustomEvent<{ asset: BAsset }>) {
        console.log("Asset selected:", event.detail.asset.metadata.name);
    }

    function handleAssetDoubleClick(event: CustomEvent<{ asset: BAsset }>) {
        const asset = event.detail.asset;
        console.log("Asset double-clicked:", asset.metadata.name);

        // For 3D meshes, create a new part with the mesh
        if (asset.metadata.type === "mesh") {
            const newPart = sceneStore.createPartInFrontOfCamera(-1);
            // In a real implementation, you'd load the mesh and assign it
            // newPart.mesh = asset.metadata.id; // Reference to the asset
            console.log("Created part with mesh:", asset.metadata.name);
        }
    }

    // ObjectExplorer event handlers
    function handleCopyObject(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        console.log("Object copied:", id);
        // The actual copying is handled in ObjectExplorer component
    }

    function handlePasteObject(
        event: CustomEvent<{ copiedObject: any; parentId: string | number }>
    ) {
        const { copiedObject, parentId } = event.detail;
        console.log(
            "Pasting object:",
            copiedObject.name,
            "to parent:",
            parentId
        );

        // Create a new object based on the copied object
        const newObject = copiedObject.clone();
        // Generate a new unique ID
        newObject.id = crypto.randomUUID();
        // Update the name to indicate it's a copy
        newObject.name = `${copiedObject.name} Copy`;
        // Set the parent
        newObject.parentId = parentId === -1 ? null : parentId;

        // Add to scene
        sceneStore.addObject(newObject);
        console.log("Object pasted with new ID:", newObject.id);
    }

    function handleDuplicateObject(
        event: CustomEvent<{ originalId: string; duplicatedObject: any }>
    ) {
        const { originalId, duplicatedObject } = event.detail;
        console.log("Duplicating object:", originalId);

        // Create a new object based on the duplicated object
        const newObject = duplicatedObject.clone();

        // Update the name to indicate it's a duplicate
        newObject.name = `${duplicatedObject.name} Copy`;

        // Add to scene with same parent as original
        sceneStore.addObject(newObject);
        console.log("Object duplicated with new ID:", newObject.id);
    }

    function handleDeleteObject(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        console.log("Deleting object:", id);

        // Find the object first
        const objectToDelete = sceneStore.getObjectById(id);
        if (objectToDelete) {
            // Remove from scene
            sceneStore.removeObject(objectToDelete);

            // If the deleted object was selected, clear selection
            if (selectedObject === id) {
                selectedObject = -1;
            }
        } else {
            console.warn("Object not found for deletion:", id);
        }
    }

    function handleGotoObject(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        console.log("Going to object:", id);
        // This could focus the camera on the object or highlight it in the viewport
        // For now, just select it
        selectedObject = id;
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div
    class="h-screen w-full bg-background flex flex-col overflow-hidden relative"
>
    <!-- Dynamic background blobs -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <!-- Dynamic color-shifting blobs -->
        <div
            class="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse"
            style="animation-duration: 4s;"
        ></div>
        <div
            class="absolute -bottom-16 -right-16 w-64 h-64 bg-gradient-to-tl from-cyan-400/12 via-blue-500/8 to-indigo-400/6 rounded-full blur-2xl animate-pulse"
            style="animation-duration: 3.5s; animation-delay: 1s;"
        ></div>

        <!-- Top-left ambient -->
        <div
            class="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-emerald-500/18 via-teal-400/12 to-cyan-500/8 rounded-full blur-3xl animate-pulse"
            style="animation-duration: 5s; animation-delay: 2s;"
        ></div>
        <div
            class="absolute top-32 -left-16 w-40 h-40 bg-gradient-to-r from-orange-400/15 via-amber-400/10 to-yellow-400/8 rounded-full blur-2xl animate-pulse"
            style="animation-duration: 3s; animation-delay: 0.5s;"
        ></div>
    </div>

    <!-- Top Navigation Bar -->
    <div
        class="h-16 bg-card/80 backdrop-blur-sm border-b border-border/40 flex items-center px-8 relative z-10 shadow-sm {play
            ? 'bg-gradient-to-r from-green-500/20 via-green-500/5 to-transparent border-green-400/30'
            : ''}"
    >
        <div class="flex items-center gap-8 flex-1">
            <!-- Project Name -->
            <Button
                class="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-xl transition-all duration-200"
                variant="ghost"
            >
                <div
                    class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm"
                ></div>
                <span class="text-foreground font-semibold text-base"
                    >Test Project</span
                >
            </Button>

            <!-- Action Buttons -->
            <div class="flex items-center gap-4 ml-8">
                <!-- Play/Stop Button -->
                {#if !play}
                    <Button
                        size="lg"
                        class="group h-12 px-10 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:via-green-400 hover:to-teal-400 hover:scale-110 active:scale-95 text-white font-bold shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                        onclick={togglePlay}
                    >
                        <!-- Shimmer effect -->
                        <div
                            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                        ></div>

                        <Play
                            class="w-6 h-6 mr-4 fill-current group-hover:animate-pulse"
                        />
                        <span class="text-lg tracking-wide relative z-10"
                            >Play</span
                        >

                        <!-- Particle effect -->
                        <div
                            class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"
                        ></div>
                    </Button>
                {:else}
                    <Button
                        size="lg"
                        class="group h-12 px-10 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-400 hover:via-pink-400 hover:to-rose-400 hover:scale-110 active:scale-95 text-white font-bold shadow-2xl hover:shadow-red-500/25 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                        onclick={togglePlay}
                    >
                        <!-- Shimmer effect -->
                        <div
                            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                        ></div>

                        <Pause
                            class="w-6 h-6 mr-4 fill-current group-hover:animate-pulse"
                        />
                        <span class="text-lg tracking-wide relative z-10"
                            >Stop</span
                        >

                        <!-- Particle effect -->
                        <div
                            class="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"
                        ></div>
                    </Button>
                {/if}

                <Separator
                    orientation="vertical"
                    class="h-10 mx-3 opacity-30"
                />

                <!-- Transform Tools -->
                <div
                    class="flex items-center bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-2 gap-1 shadow-sm"
                >
                    <Button
                        variant={activeTool === "select"
                            ? "secondary"
                            : "ghost"}
                        size="sm"
                        class="group h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 {activeTool ===
                        'select'
                            ? 'bg-primary/10 text-primary hover:text-primary'
                            : 'hover:bg-muted/60'}"
                        onclick={() => (activeTool = "select")}
                        title="Select Tool (1)"
                    >
                        <MousePointer2
                            class="w-5 h-5 transition-transform duration-200 group-hover:scale-125"
                        />
                    </Button>
                    <Button
                        variant={activeTool === "move" ? "secondary" : "ghost"}
                        size="sm"
                        class="group h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 {activeTool ===
                        'move'
                            ? 'bg-blue-500/10 text-blue-500 hover:text-blue-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "move";
                            transformMode = "translate";
                        }}
                        title="Move Tool (2)"
                    >
                        <Move
                            class="w-5 h-5 transition-transform duration-200 group-hover:scale-125 group-hover:translate-x-1"
                        />
                    </Button>
                    <Button
                        variant={activeTool === "rotate"
                            ? "secondary"
                            : "ghost"}
                        size="sm"
                        class="group h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 {activeTool ===
                        'rotate'
                            ? 'bg-green-500/10 text-green-500 hover:text-green-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "rotate";
                            transformMode = "rotate";
                        }}
                        title="Rotate Tool (3)"
                    >
                        <RotateCw
                            class="w-5 h-5 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-[30deg]"
                        />
                    </Button>
                    <Button
                        variant={activeTool === "scale" ? "secondary" : "ghost"}
                        size="sm"
                        class="group h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 {activeTool ===
                        'scale'
                            ? 'bg-purple-500/10 text-purple-500 hover:text-purple-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "scale";
                            transformMode = "scale";
                        }}
                        title="Scale Tool (4)"
                    >
                        <Scaling
                            class="w-5 h-5 transition-transform duration-200 group-hover:scale-150"
                        />
                    </Button>
                </div>

                <Separator
                    orientation="vertical"
                    class="h-10 mx-3 opacity-30"
                />

                <!-- Transform Space Mode -->
                <Button
                    variant="outline"
                    size="sm"
                    class="h-10 px-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-card/80 hover:border-border/60 transition-all duration-200 shadow-sm"
                    onclick={() =>
                        (transformSpace =
                            transformSpace === "world" ? "local" : "world")}
                    title={transformSpace === "world"
                        ? "Switch to Local Space"
                        : "Switch to World Space"}
                >
                    <div class="flex items-center gap-2">
                        {#if transformSpace === "world"}
                            <Earth class="w-4 h-4 text-blue-500" />
                            <span class="text-sm font-medium">World</span>
                        {:else}
                            <Box class="w-4 h-4 text-orange-500" />
                            <span class="text-sm font-medium">Local</span>
                        {/if}
                    </div>
                </Button>

                <!-- Save Button -->
                <Button
                    variant="outline"
                    size="sm"
                    class="h-10 px-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-card/80 hover:border-border/60 transition-all duration-200 shadow-sm"
                    onclick={() => saveProject()}
                    title="Save Project"
                >
                    <div class="flex items-center gap-2">
                        <Save class="w-4 h-4 text-green-500" />
                        <span class="text-sm font-medium">Save</span>
                    </div>
                </Button>
            </div>
        </div>

        <!-- Right side buttons -->
        <div class="flex items-center gap-3">
            <Button
                variant="ghost"
                size="sm"
                class="h-10 w-10 p-0 rounded-xl bg-card/40 hover:bg-card/60 text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm border border-border/40"
                title="Settings"
            >
                <Settings class="w-5 h-5" />
            </Button>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden relative z-10">
        <ResizablePaneGroup direction="horizontal" class="h-full">
            <!-- Left Panel - Conditional Content -->
            <ResizablePane
                defaultSize={leftPanelSize}
                size={leftPanelSize}
                minSize={0}
                maxSize={35}
                collapsible={true}
                collapsedSize={0}
                class="transition-all duration-700 ease-out"
            >
                {#if activeTab === "viewport"}
                    <ObjectExplorer
                        bind:this={objectExplorerRef}
                        bind:selectedObject
                        on:addObject={handleAddObject}
                        on:reparentObject={handleReparentObject}
                        on:copyObject={handleCopyObject}
                        on:pasteObject={handlePasteObject}
                        on:duplicateObject={handleDuplicateObject}
                        on:deleteObject={handleDeleteObject}
                        on:gotoObject={handleGotoObject}
                    />
                {:else if activeTab === "script"}
                    <CodePalette selectedScript={selectedScriptObject} />
                {:else}
                    <!-- Default to Object Explorer for other tabs -->
                    <ObjectExplorer
                        bind:this={objectExplorerRef}
                        bind:selectedObject
                        on:addObject={handleAddObject}
                        on:reparentObject={handleReparentObject}
                        on:copyObject={handleCopyObject}
                        on:pasteObject={handlePasteObject}
                        on:duplicateObject={handleDuplicateObject}
                        on:deleteObject={handleDeleteObject}
                        on:gotoObject={handleGotoObject}
                    />
                {/if}
            </ResizablePane>

            <ResizableHandle />

            <!-- Center Panel - Tabbed Interface -->
            <ResizablePane
                defaultSize={centerPanelSize}
                size={centerPanelSize}
                minSize={40}
                class="transition-all duration-700 ease-out"
            >
                <div class="h-full bg-card/40 backdrop-blur-sm">
                    <Tabs.Root
                        bind:value={activeTab}
                        class="h-full flex flex-col"
                    >
                        <!-- Tab Header -->
                        <div
                            class="h-12 bg-card/50 backdrop-blur-sm border-b border-border/30 flex items-center px-3"
                        >
                            <Tabs.List
                                class="h-8 bg-transparent p-0 flex-1 gap-1"
                            >
                                {#each openTabs as tab}
                                    <div class="flex items-center relative">
                                        <Tabs.Trigger
                                            value={tab.id}
                                            class="h-8 px-4 text-sm rounded-lg border-0 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 font-medium"
                                        >
                                            <tab.icon class="w-4 h-4 mr-2" />
                                            {tab.label}
                                        </Tabs.Trigger>
                                        {#if tab.closeable}
                                            <button
                                                class="absolute -right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-red-500/20 rounded-md flex items-center justify-center z-10 transition-colors duration-200"
                                                on:click|stopPropagation={() =>
                                                    closeTab(tab.id)}
                                                title="Close tab"
                                            >
                                                <X class="w-3 h-3" />
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </Tabs.List>

                            <!-- Add Tab Menu  -->
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200"
                                        title="Add tab"
                                    >
                                        <Plus class="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    class="w-48 bg-card/95 backdrop-blur-md border-border/60 rounded-xl shadow-lg"
                                >
                                    {#each availableTabs as tab}
                                        <DropdownMenuCheckboxItem
                                            class="text-foreground hover:bg-muted/60 rounded-lg m-1 transition-colors duration-200"
                                            checked={tab.visible}
                                            onclick={() => {
                                                if (tab.visible) {
                                                    closeTab(tab.id);
                                                } else {
                                                    openTab(tab.id);
                                                }
                                            }}
                                        >
                                            <tab.icon class="w-4 h-4 mr-3" />
                                            {tab.label}
                                        </DropdownMenuCheckboxItem>
                                    {/each}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <!-- Tab Contents -->
                        <div class="flex-1 overflow-hidden">
                            <Tabs.Content
                                value="viewport"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-transparent relative overflow-hidden {play
                                        ? 'border-green-500 border-2'
                                        : ''}"
                                >
                                    {#if !isViewportLoading}
                                        <div
                                            class="absolute inset-0 flex items-center justify-center"
                                            transition:fade={{ duration: 500 }}
                                        >
                                            <Canvas
                                                shadows
                                                toneMapping={3}
                                                dpr={2}
                                            >
                                                {#if play}
                                                    <GameRuntime />
                                                {:else}
                                                    <Scene
                                                        bind:selectedObject
                                                        {activeTool}
                                                        {transformMode}
                                                        {transformSpace}
                                                    />
                                                {/if}
                                            </Canvas>
                                            {#if play}
                                                <div class="mt-5">
                                                    <RuntimeUI />
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}

                                    <!-- Loading overlay -->
                                    <ViewportLoader
                                        isLoading={isViewportLoading}
                                        {loadingText}
                                    />
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="script" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-background/20 flex flex-col"
                                >
                                    <!-- Script Editor Header -->
                                    <div
                                        class="h-10 bg-muted/40 border-b border-border/30 flex items-center px-4"
                                    >
                                        <div class="flex items-center gap-2">
                                            <Code2
                                                class="w-4 h-4 text-blue-400"
                                            />
                                            <span
                                                class="text-foreground text-sm font-medium"
                                                >Script Editor</span
                                            >
                                        </div>
                                        <div
                                            class="ml-auto flex items-center gap-3"
                                        >
                                            <select
                                                bind:value={selectedScriptId}
                                                class="bg-muted/50 text-foreground text-sm px-3 py-1 rounded border border-border/30 focus:border-blue-500 focus:outline-none"
                                                disabled={scripts.length === 0}
                                            >
                                                {#if scripts.length === 0}
                                                    <option value={null}
                                                        >No scripts available</option
                                                    >
                                                {:else}
                                                    {#each scripts as script}
                                                        <option
                                                            value={script.id}
                                                            >{script.name}</option
                                                        >
                                                    {/each}
                                                {/if}
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Code Workspace -->
                                    {#if scripts.length === 0}
                                        <div
                                            class="flex-1 flex items-center justify-center bg-background/20"
                                        >
                                            <div class="text-center">
                                                <Code2
                                                    class="w-12 h-12 mx-auto mb-4 text-muted-foreground"
                                                />
                                                <p
                                                    class="text-foreground text-lg font-medium mb-2"
                                                >
                                                    No Scripts Found
                                                </p>
                                                <p
                                                    class="text-muted-foreground text-sm mb-4"
                                                >
                                                    Create a script in the
                                                    Object Explorer to get
                                                    started
                                                </p>
                                                <Button
                                                    onclick={() => {
                                                        console.log(
                                                            "Creating new script"
                                                        );
                                                        createScript(-1);
                                                    }}
                                                    class="bg-blue-500 hover:bg-blue-400"
                                                >
                                                    <Plus
                                                        class="w-4 h-4 mr-2"
                                                    />
                                                    Create Script
                                                </Button>
                                            </div>
                                        </div>
                                    {:else}
                                        <CustomCodeEditor
                                            bind:compiledCode
                                            selectedScript={selectedScriptObject}
                                        />
                                    {/if}

                                    <!-- Debug: Show compiled code -->
                                    {#if compiledCode.length > 0}
                                        <div
                                            class="absolute bottom-4 right-4 bg-black/80 text-green-400 p-2 rounded text-xs max-w-64 max-h-32 overflow-auto"
                                        >
                                            <div class="font-bold mb-1">
                                                Compiled Code:
                                            </div>
                                            <pre>{JSON.stringify(
                                                    compiledCode,
                                                    null,
                                                    1
                                                )}</pre>
                                        </div>
                                    {/if}
                                </div>
                            </Tabs.Content>

                            <!-- Placeholder content for other tabs -->
                            <Tabs.Content
                                value="materials"
                                class="h-full m-0 p-0"
                            >
                                <MaterialBrowser />
                            </Tabs.Content>

                            <Tabs.Content
                                value="particles"
                                class="h-full m-0 p-0"
                            >
                                <ParticleBrowser />
                            </Tabs.Content>

                            <Tabs.Content value="assets" class="h-full m-0 p-0">
                                <AssetBrowser
                                    onassetSelected={handleAssetSelected}
                                    onassetDoubleClick={handleAssetDoubleClick}
                                />
                            </Tabs.Content>

                            <Tabs.Content
                                value="textures"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <FileImage
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Texture Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Import and organize textures
                                        </p>
                                    </div>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="audio" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Music
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Audio Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Manage sounds and music
                                        </p>
                                    </div>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="input" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Gamepad2
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Input Manager
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Configure input controls
                                        </p>
                                    </div>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content
                                value="animation"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Clapperboard
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Animation Editor
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Create and edit animations
                                        </p>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </div>
                    </Tabs.Root>
                </div>
            </ResizablePane>

            <ResizableHandle />

            <!-- Right Panel - Properties / DevTools -->
            <ResizablePane
                defaultSize={rightPanelSize}
                size={rightPanelSize}
                minSize={0}
                maxSize={35}
                collapsible={true}
                collapsedSize={0}
                class="transition-all duration-700 ease-out"
            >
                <!-- this p is for helping svelte realize to switch the panels, idk why this fixes it but yeah -->
                <p class="hidden">{play}</p>

                {#if play}
                    <DevToolsPanel />
                {:else}
                    <PropertiesPanel
                        {selectedObject}
                        onPropertyChange={handlePropertyChange}
                    />
                {/if}
            </ResizablePane>
        </ResizablePaneGroup>
    </div>
</div>
