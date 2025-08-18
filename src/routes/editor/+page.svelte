<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

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
    } from "lucide-svelte";

    import { Canvas } from "@threlte/core";
    import Scene from "$lib/components/ViewportScene.svelte";
    import GameRuntime from "$lib/components/GameRuntime.svelte";
    import CustomCodeEditor from "$lib/components/CodeEditor.svelte";
    import ObjectExplorer from "$lib/components/ObjectExplorer.svelte";
    import PropertiesPanel from "$lib/components/PropertiesPanel.svelte";
    import ViewportLoader from "$lib/components/ViewportLoader.svelte";

    import * as Types from "$lib/types";
    import { sceneStore } from "$lib/sceneStore";

    // Mock data for object explorer
    let sceneObjects = $state([
        {
            id: "camera1",
            name: "Main Camera",
            type: "camera",
            expanded: false,
            depth: 0,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "light1",
            name: "Directional Light",
            type: "light",
            expanded: false,
            depth: 0,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "player1",
            name: "Player",
            type: "object",
            expanded: true,
            depth: 0,
            visible: true,
            locked: false,
            children: ["playermodel1", "playercontroller1"],
        },
        {
            id: "playermodel1",
            name: "PlayerModel",
            type: "mesh",
            expanded: false,
            depth: 1,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "playercontroller1",
            name: "PlayerController",
            type: "script",
            expanded: false,
            depth: 1,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "env1",
            name: "Environment",
            type: "folder",
            expanded: true,
            depth: 0,
            visible: true,
            locked: false,
            children: ["ground1", "buildings1", "trees1"],
        },
        {
            id: "ground1",
            name: "Ground",
            type: "mesh",
            expanded: false,
            depth: 1,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "buildings1",
            name: "Buildings",
            type: "folder",
            expanded: false,
            depth: 1,
            visible: true,
            locked: false,
            children: [],
        },
        {
            id: "trees1",
            name: "Trees",
            type: "folder",
            expanded: false,
            depth: 1,
            visible: true,
            locked: false,
            children: [],
        },
    ]);

    let selectedObject = $state(-1);

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
    let selectedScript = $state("PlayerController");

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

    // Object Explorer handlers
    function handleToggleExpanded(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        sceneObjects = sceneObjects.map((obj) =>
            obj.id === id ? { ...obj, expanded: !obj.expanded } : obj
        );
    }

    function handleAddObject(
        event: CustomEvent<{ parentId?: string; type?: string }>
    ) {
        const { type } = event.detail;

        if (type === "Part") {
            createPartInFrontOfCamera();
        } else {
            console.log("Add object:", event.detail);
        }
    }

    function createPartInFrontOfCamera() {
        const partId = `part_${Date.now()}`;
        sceneStore.createPartInFrontOfCamera();

        // Get the latest part that was just added
        const scene = $sceneStore.getScene();
        const latestPart = scene.objects[scene.objects.length - 1];

        sceneObjects = [...sceneObjects, latestPart];
    }

    function handleDeleteObject(event: CustomEvent<{ id: string }>) {
        console.log("Delete object:", event.detail.id);
    }

    function handleDuplicateObject(event: CustomEvent<{ id: string }>) {
        console.log("Duplicate object:", event.detail.id);
    }

    function handleCopyObject(event: CustomEvent<{ id: string }>) {
        console.log("Copy object:", event.detail.id);
    }

    function handleToggleVisibility(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        sceneObjects = sceneObjects.map((obj) =>
            obj.id === id ? { ...obj, visible: !obj.visible } : obj
        );
    }

    function handleToggleLock(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        sceneObjects = sceneObjects.map((obj) =>
            obj.id === id ? { ...obj, locked: !obj.locked } : obj
        );
    }

    function handleGotoObject(event: CustomEvent<{ id: string }>) {
        console.log("Go to object:", event.detail.id);
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
        testPart.position = new Types.BVector3(0, 5, 0);
        testPart.scale = new Types.BVector3(1, 1, 10);
        sceneStore.addObject(testPart);

        const testPart2 = new Types.BPart("Test Object 2", null, null);
        testPart2.position = new Types.BVector3(2, 5, 0);
        testPart2.scale = new Types.BVector3(1, 1, 10);
        sceneStore.addObject(testPart2);

        initializeViewport();
    });

    // Loading state
    let isViewportLoading = $state(true);
    let loadingText = $state("Starting...");

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
    async function initializeViewport() {
        const loadingSteps = [
            { text: "Loading components...", delay: 800 },
            { text: "Finalizing", delay: 400 },
        ];

        for (const step of loadingSteps) {
            loadingText = step.text;
            await new Promise((resolve) => setTimeout(resolve, step.delay));
        }

        isViewportLoading = false;

        // Expand panels after viewport loads with smooth transition
        await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay for smooth transition
        leftPanelSize = 20;
        rightPanelSize = 20;
        centerPanelSize = 60;
    }

    // play mode mock code

    let play = $state(false);

    function togglePlay() {
        play = !play;
        console.log("Play mode:", play);

        if (play) {
            leftPanelSize = 0;
            rightPanelSize = 0;
            centerPanelSize = 100;
        } else {
            leftPanelSize = 20;
            rightPanelSize = 20;
            centerPanelSize = 60;

            // TODO: make this remember previous size
        }
    }
</script>

<div
    class="h-screen w-full bg-background flex flex-col overflow-hidden relative"
>
    <!-- M3 Expressive: Vibrant dynamic background blobs -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <!-- Dynamic color-shifting blobs with M3 Expressive colors -->
        <div
            class="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-pink-500/10 rounded-full blur-3xl animate-pulse"
            style="animation-duration: 4s;"
        ></div>
        <div
            class="absolute -bottom-16 -right-16 w-64 h-64 bg-gradient-to-tl from-cyan-400/12 via-blue-500/8 to-indigo-400/6 rounded-full blur-2xl animate-pulse"
            style="animation-duration: 3.5s; animation-delay: 1s;"
        ></div>

        <!-- Playful top-left ambient with personality -->
        <div
            class="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-emerald-500/18 via-teal-400/12 to-cyan-500/8 rounded-full blur-3xl animate-pulse"
            style="animation-duration: 5s; animation-delay: 2s;"
        ></div>
        <div
            class="absolute top-32 -left-16 w-40 h-40 bg-gradient-to-r from-orange-400/15 via-amber-400/10 to-yellow-400/8 rounded-full blur-2xl animate-pulse"
            style="animation-duration: 3s; animation-delay: 0.5s;"
        ></div>

        <!-- Additional M3 Expressive elements -->
        <div
            class="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-rose-400/10 to-pink-400/6 rounded-full blur-xl animate-pulse"
            style="animation-duration: 4.5s; animation-delay: 1.5s;"
        ></div>
    </div>

    <!-- Top Navigation Bar - Enhanced with better spacing and typography -->
    <div
        class="h-16 bg-card/80 backdrop-blur-sm border-b border-border/40 flex items-center px-8 relative z-10 shadow-sm {play
            ? 'bg-gradient-to-r from-green-500/20 via-green-500/5 to-transparent border-green-400/30'
            : ''}"
    >
        <div class="flex items-center gap-8 flex-1">
            <!-- Project Name - Enhanced with better styling -->
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

            <!-- Top Bar Tabs - Enhanced with rounded corners and better spacing -->
            <Tabs.Root value="home">
                <Tabs.List
                    class="bg-muted/40 rounded-xl border border-border/40"
                >
                    <Tabs.Trigger
                        value="home"
                        class="px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                        <House class="w-4 h-4 mr-2" />
                        Home
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="object"
                        class="px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                        <Box class="w-4 h-4 mr-2" />
                        Objects
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="ui"
                        class="px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                        <LayoutDashboard class="w-4 h-4 mr-2" />
                        UI
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>

            <!-- Action Buttons -->
            <div class="flex items-center gap-4 ml-8">
                <!-- Play/Stop Button - Much larger and more prominent -->
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
                        class="group h-14 px-10 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-400 hover:via-pink-400 hover:to-rose-400 hover:scale-110 active:scale-95 text-white font-bold shadow-2xl hover:shadow-red-500/25 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                        onclick={togglePlay}
                    >
                        <!-- M3 Expressive: Shimmer effect -->
                        <div
                            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                        ></div>

                        <Pause
                            class="w-6 h-6 mr-4 fill-current group-hover:animate-pulse"
                        />
                        <span class="text-lg tracking-wide relative z-10"
                            >Stop</span
                        >

                        <!-- M3 Expressive: Fun particle effect -->
                        <div
                            class="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"
                        ></div>
                    </Button>
                {/if}

                <Separator
                    orientation="vertical"
                    class="h-10 mx-3 opacity-30"
                />

                <!-- Transform Tools - Modern pill container -->
                <div
                    class="flex items-center bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-2 gap-1 shadow-sm"
                >
                    <Button
                        variant={activeTool === "select"
                            ? "secondary"
                            : "ghost"}
                        size="sm"
                        class="h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 {activeTool ===
                        'select'
                            ? 'bg-primary/10 text-primary hover:text-primary'
                            : 'hover:bg-muted/60'}"
                        onclick={() => (activeTool = "select")}
                        title="Select Tool"
                    >
                        <MousePointer2 class="w-5 h-5" />
                    </Button>
                    <Button
                        variant={activeTool === "move" ? "secondary" : "ghost"}
                        size="sm"
                        class="h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 {activeTool ===
                        'move'
                            ? 'bg-blue-500/10 text-blue-500 hover:text-blue-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "move";
                            transformMode = "translate";
                        }}
                        title="Move Tool"
                    >
                        <Move class="w-5 h-5" />
                    </Button>
                    <Button
                        variant={activeTool === "rotate"
                            ? "secondary"
                            : "ghost"}
                        size="sm"
                        class="h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 {activeTool ===
                        'rotate'
                            ? 'bg-green-500/10 text-green-500 hover:text-green-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "rotate";
                            transformMode = "rotate";
                        }}
                        title="Rotate Tool"
                    >
                        <RotateCw class="w-5 h-5" />
                    </Button>
                    <Button
                        variant={activeTool === "scale" ? "secondary" : "ghost"}
                        size="sm"
                        class="h-10 w-10 px-0 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 {activeTool ===
                        'scale'
                            ? 'bg-purple-500/10 text-purple-500 hover:text-purple-500'
                            : 'hover:bg-muted/60'}"
                        onclick={() => {
                            activeTool = "scale";
                            transformMode = "scale";
                        }}
                        title="Scale Tool"
                    >
                        <Scaling class="w-5 h-5" />
                    </Button>
                </div>

                <Separator
                    orientation="vertical"
                    class="h-10 mx-3 opacity-30"
                />

                <!-- Transform Space Mode - Enhanced pill button -->
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
            </div>
        </div>

        <!-- Right side buttons - Enhanced with pill styling -->
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
            <!-- Left Panel - Object Explorer -->
            <ResizablePane
                defaultSize={leftPanelSize}
                size={leftPanelSize}
                minSize={0}
                maxSize={35}
                collapsible={true}
                collapsedSize={0}
                class="transition-all duration-700 ease-out"
            >
                <ObjectExplorer
                    {sceneStore}
                    bind:selectedObject
                    on:toggleExpanded={handleToggleExpanded}
                    on:addObject={handleAddObject}
                    on:deleteObject={handleDeleteObject}
                    on:duplicateObject={handleDuplicateObject}
                    on:copyObject={handleCopyObject}
                    on:toggleVisibility={handleToggleVisibility}
                    on:toggleLock={handleToggleLock}
                    on:gotoObject={handleGotoObject}
                />
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
                        <!-- Tab Header - Enhanced with modern styling -->
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
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-4 h-4 mr-2"
                                            />
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

                            <!-- Add Tab Menu - Enhanced -->
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
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-4 h-4 mr-3"
                                            />
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
                                            <Canvas>
                                                {#if play}
                                                    <GameRuntime
                                                        {sceneStore}
                                                        {compiledCode}
                                                        variables={[
                                                            {
                                                                name: "playerY",
                                                                value: 42,
                                                                type: "number",
                                                            },
                                                            {
                                                                name: "score",
                                                                value: 100,
                                                                type: "number",
                                                            },
                                                        ]}
                                                    />
                                                {:else}
                                                    <Scene
                                                        {sceneStore}
                                                        bind:selectedObject
                                                        {activeTool}
                                                        {transformMode}
                                                        {transformSpace}
                                                    />
                                                {/if}
                                            </Canvas>
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
                                                bind:value={selectedScript}
                                                class="bg-muted/50 text-foreground text-sm px-3 py-1 rounded border border-border/30 focus:border-blue-500 focus:outline-none"
                                            >
                                                <option value="PlayerController"
                                                    >PlayerController</option
                                                >
                                                <option value="GameManager"
                                                    >GameManager</option
                                                >
                                                <option value="EnemyAI"
                                                    >EnemyAI</option
                                                >
                                            </select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-7 px-3 text-xs text-green-400 hover:bg-green-500/20"
                                                onclick={() =>
                                                    console.log(
                                                        "Run script:",
                                                        selectedScript
                                                    )}
                                            >
                                                <Play class="w-3 h-3 mr-1" />
                                                Run
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- Blockly Workspace -->
                                    <CustomCodeEditor bind:compiledCode />

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
                                <div
                                    class="h-full bg-background/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Palette
                                            class="w-12 h-12 mx-auto mb-3 text-muted-foreground"
                                        />
                                        <p class="text-foreground text-sm">
                                            Materials Editor
                                        </p>
                                        <p
                                            class="text-muted-foreground text-xs"
                                        >
                                            Create and edit materials here
                                        </p>
                                    </div>
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="assets" class="h-full m-0 p-0">
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Package
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Asset Browser
                                        </p>
                                        <p class="text-gray-600 text-xs">
                                            Browse and manage your assets
                                        </p>
                                    </div>
                                </div>
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

            <!-- Right Panel - Properties -->
            <ResizablePane
                defaultSize={rightPanelSize}
                size={rightPanelSize}
                minSize={0}
                maxSize={35}
                collapsible={true}
                collapsedSize={0}
                class="transition-all duration-700 ease-out"
            >
                <PropertiesPanel
                    {sceneStore}
                    {selectedObject}
                    onPropertyChange={handlePropertyChange}
                />
            </ResizablePane>
        </ResizablePaneGroup>
    </div>
</div>
