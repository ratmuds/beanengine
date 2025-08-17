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
    import CustomCodeEditor from "$lib/components/CustomCodeEditor.svelte";
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
    <!-- Blurred blob overlay -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <!-- Main bottom-right blob cluster -->
        <div
            class="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl"
        ></div>
        <div
            class="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/8 rounded-full blur-2xl"
        ></div>

        <!-- Subtle top-left ambient -->
        <div
            class="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl"
        ></div>
        <div
            class="absolute top-32 -left-16 w-40 h-40 bg-indigo-500/15 rounded-full blur-2xl"
        ></div>
    </div>

    <!-- Top Navigation Bar -->
    <div
        class="h-14 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center px-6 relative z-10 {play
            ? 'bg-gradient-to-r from-green-800/50 via-green-800/10 to-transparent'
            : ''}"
    >
        <div class="flex items-center gap-6 flex-1">
            <!-- Project Name -->
            <Button class="flex items-center gap-3 px-3 py-2" variant="ghost">
                <div
                    class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md"
                ></div>
                <span class="text-foreground font-semibold text-sm"
                    >Test Project</span
                >
            </Button>

            <!-- Top Bar Tabs -->
            <Tabs.Root value="home">
                <Tabs.List class="bg-muted/50">
                    <Tabs.Trigger value="home" class="px-4 py-2">
                        <House class="w-4 h-4 mr-2" />
                        Home
                    </Tabs.Trigger>
                    <Tabs.Trigger value="object" class="px-4 py-2">
                        <Box class="w-4 h-4 mr-2" />
                        Objects
                    </Tabs.Trigger>
                    <Tabs.Trigger value="ui" class="px-4 py-2">
                        <LayoutDashboard class="w-4 h-4 mr-2" />
                        UI
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>

            <!-- Action Buttons -->
            <div class="flex items-center gap-3 ml-6">
                <!-- Play/Stop Button -->
                {#if !play}
                    <Button
                        size="sm"
                        class="h-9 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-medium shadow-sm transition-all duration-200"
                        onclick={togglePlay}
                    >
                        <Play class="w-4 h-4 mr-2 fill-current" />
                        Play
                    </Button>
                {:else}
                    <Button
                        size="sm"
                        class="h-9 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium shadow-sm transition-all duration-200"
                        onclick={togglePlay}
                    >
                        <Pause class="w-4 h-4 mr-2 fill-current" />
                        Stop
                    </Button>
                {/if}

                <Separator orientation="vertical" class="h-8 mx-2" />

                <!-- Transform Tools -->
                <div class="flex items-center bg-muted/40 rounded-lg p-1 gap-1">
                    <Button
                        variant={activeTool === "select" ? "secondary" : "ghost"}
                        size="sm"
                        class="w-9 h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground"
                        onclick={() => (activeTool = "select")}
                    >
                        <MousePointer2 class="w-4 h-4" />
                    </Button>
                    <Button
                        variant={activeTool === "move" ? "secondary" : "ghost"}
                        size="sm"
                        class="w-9 h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground"
                        onclick={() => {
                            activeTool = "move";
                            transformMode = "translate";
                        }}
                    >
                        <Move class="w-4 h-4" />
                    </Button>
                    <Button
                        variant={activeTool === "rotate" ? "secondary" : "ghost"}
                        size="sm"
                        class="w-9 h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground"
                        onclick={() => {
                            activeTool = "rotate";
                            transformMode = "rotate";
                        }}
                    >
                        <RotateCw class="w-4 h-4" />
                    </Button>
                    <Button
                        variant={activeTool === "scale" ? "secondary" : "ghost"}
                        size="sm"
                        class="w-9 h-8 px-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground"
                        onclick={() => {
                            activeTool = "scale";
                            transformMode = "scale";
                        }}
                    >
                        <Scaling class="w-4 h-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" class="h-8 mx-2" />

                <!-- Transform Space Mode -->
                <Button
                    variant="outline"
                    size="sm"
                    class="h-9 px-3 text-muted-foreground hover:bg-muted hover:text-foreground border-border/50 transition-all duration-200"
                    onclick={() =>
                        (transformSpace =
                            transformSpace === "world" ? "local" : "world")}
                >
                    <div class="flex items-center gap-2">
                        {#if transformSpace === "world"}
                            <Earth class="w-4 h-4" />
                            <span class="text-xs font-medium">World</span>
                        {:else}
                            <Box class="w-4 h-4" />
                            <span class="text-xs font-medium">Local</span>
                        {/if}
                    </div>
                </Button>
            </div>
        </div>

        <!-- Right side buttons -->
        <div class="flex items-center gap-3">
            <Button
                variant="ghost"
                size="sm"
                class="h-9 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <Settings class="w-4 h-4" />
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
                        <!-- Tab Header with Close Buttons and More Menu -->
                        <div
                            class="h-8 bg-muted/60 backdrop-blur-sm border-b border-border/30 flex items-center px-1"
                        >
                            <Tabs.List class="h-6 bg-transparent p-0 flex-1">
                                {#each openTabs as tab}
                                    <div class="flex items-center relative">
                                        <Tabs.Trigger
                                            value={tab.id}
                                            class="h-6 px-2 text-xs rounded-none border-r border-border/30 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground text-muted-foreground hover:text-foreground"
                                        >
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-3 h-3 mr-1"
                                            />
                                            {tab.label}
                                        </Tabs.Trigger>
                                        {#if tab.closeable}
                                            <button
                                                class="absolute -right-1 top-0 h-4 w-4 p-0 hover:bg-red-500/20 rounded-sm flex items-center justify-center z-10"
                                                on:click|stopPropagation={() =>
                                                    closeTab(tab.id)}
                                            >
                                                <X class="w-2.5 h-2.5" />
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </Tabs.List>

                            <!-- Three Dots Menu -->
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                        <Plus class="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    class="w-40 bg-card/90 backdrop-blur-sm border-border"
                                >
                                    {#each availableTabs as tab}
                                        <DropdownMenuCheckboxItem
                                            class="text-foreground hover:bg-muted/60"
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
                                                class="w-4 h-4 mr-2"
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
                                                    <GameRuntime {sceneStore} {compiledCode} />
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
                                        <div class="absolute bottom-4 right-4 bg-black/80 text-green-400 p-2 rounded text-xs max-w-64 max-h-32 overflow-auto">
                                            <div class="font-bold mb-1">Compiled Code:</div>
                                            <pre>{JSON.stringify(compiledCode, null, 1)}</pre>
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
