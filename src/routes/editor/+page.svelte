<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
    } from "$lib/components/ui/card";
    import {
        ResizablePaneGroup,
        ResizablePane,
        ResizableHandle,
    } from "$lib/components/ui/resizable";
    import { Separator } from "$lib/components/ui/separator";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuCheckboxItem,
        DropdownMenuTrigger,
        DropdownMenuSeparator,
    } from "$lib/components/ui/dropdown-menu";
    import {
        Play,
        Square,
        Pause,
        RotateCcw,
        Move,
        RotateCw,
        Scale,
        House,
        LayoutDashboard,
        MousePointer2,
        Scaling,
        Folder,
        FolderOpen,
        Box,
        Camera,
        Lightbulb,
        Settings,
        Eye,
        EyeOff,
        Lock,
        Unlock,
        MoreHorizontal,
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

    import { fade } from "svelte/transition";

    import { Canvas } from "@threlte/core";
    import Scene from "$lib/components/ViewportScene.svelte";
    import ScratchBlocksEditor from "$lib/components/ScratchBlocksEditor.svelte";
    import ItemSwitcher from "$lib/components/ItemSwitcher.svelte";
    import ClassSelector from "$lib/components/ClassSelector.svelte";
    import ObjectExplorer from "$lib/components/ObjectExplorer.svelte";
    import PropertiesPanel from "$lib/components/PropertiesPanel.svelte";
    import ViewportLoader from "$lib/components/ViewportLoader.svelte";
    import * as Types from "$lib/types";
    import Input from "$lib/components/ui/input/input.svelte";

    // Mock data for object explorer
    let sceneObjects = [
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
    ];

    // Mock objects for properties panel demonstration
    const mockObjects = [
        {
            name: "Player",
            id: "player1",
            type: "Part" as const,
            position: { x: 0, y: 5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            material: "Metal",
            castShadows: true,
            receiveShadows: true,
            visible: true,
        },
        {
            name: "Main Camera",
            id: "camera1",
            type: "Node3D" as const,
            position: { x: -10, y: 10, z: 10 },
            rotation: { x: -25, y: 45, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
        {
            name: "Directional Light",
            id: "light1",
            type: "Light" as const,
            position: { x: 0, y: 20, z: 0 },
            rotation: { x: -45, y: 30, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: "#fff5b3",
            intensity: 2.5,
            lightType: "directional" as const,
        },
        {
            name: "Environment",
            id: "env1",
            type: "Object" as const,
        },
    ];

    let selectedObject = mockObjects[0];

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

    let openTabs = availableTabs.filter((tab) => tab.visible);
    let activeTab = "viewport";
    let selectedScript = "PlayerController";

    // Class management
    let currentClasses = ["Transform", "MeshRenderer", "PlayerController"];

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

    function getObjectIcon(type: string) {
        switch (type) {
            case "camera":
                return Camera;
            case "light":
                return Lightbulb;
            case "folder":
                return Folder;
            case "mesh":
                return Box;
            default:
                return Box;
        }
    }

    function handleAddClass(event: CustomEvent<{ className: string }>) {
        const { className } = event.detail;
        if (!currentClasses.includes(className)) {
            currentClasses = [...currentClasses, className];
        }
    }

    function handleRemoveClass(event: CustomEvent<{ className: string }>) {
        const { className } = event.detail;
        currentClasses = currentClasses.filter((c) => c !== className);
    }

    // Object Explorer handlers
    function handleSelectObject(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        console.log("Selected object:", id);

        // Find mock object by ID
        const foundObject = mockObjects.find((obj) => obj.id === id);
        if (foundObject) {
            selectedObject = foundObject;
        }
    }

    function handleToggleExpanded(event: CustomEvent<{ id: string }>) {
        const { id } = event.detail;
        sceneObjects = sceneObjects.map((obj) =>
            obj.id === id ? { ...obj, expanded: !obj.expanded } : obj
        );
    }

    function handleAddObject(event: CustomEvent<{ parentId?: string }>) {
        console.log("Add object:", event.detail);
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
    function handlePropertyChange(
        event: CustomEvent<{ property: string; value: any }>
    ) {
        const { property, value } = event.detail;
        if (selectedObject) {
            selectedObject = { ...selectedObject, [property]: value };
        }
    }

    const testScene = new Types.BScene();
    let testPart = new Types.BPart("Test Object", null, null);
    testPart.position = new Types.BVector3(0, 5, 0);
    testPart.scale = new Types.BVector3(1, 1, 10);
    testScene.addObject(testPart);

    // Loading state
    let isViewportLoading = true;
    let loadingText = "Starting...";

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
    }

    // Start loading when component mounts
    import { onMount } from "svelte";
    onMount(() => {
        initializeViewport();
    });
</script>

<div class="h-screen w-full bg-gray-950 flex flex-col overflow-hidden relative">
    <!-- Blurred blob overlay -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <!-- Main bottom-right blob cluster -->
        <div
            class="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        ></div>
        <div
            class="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl"
        ></div>

        <!-- Subtle top-left ambient -->
        <div
            class="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/35 rounded-full blur-3xl"
        ></div>
        <div
            class="absolute top-32 -left-16 w-40 h-40 bg-indigo-500/25 rounded-full blur-2xl"
        ></div>
    </div>

    <!-- Top Navigation Bar -->
    <div
        class="h-12 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center px-4 relative z-10"
    >
        <div class="flex items-center gap-4 flex-1">
            <!-- Project Name -->
            <Button class="flex items-center gap-2" variant="ghost">
                <div
                    class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"
                ></div>
                <span class="text-gray-200 font-medium text-sm"
                    >Test Project</span
                >
            </Button>

            <!-- Top Bar Tabs -->
            <Tabs.Root value="home">
                <Tabs.List>
                    <Tabs.Trigger value="home"><House /></Tabs.Trigger>
                    <Tabs.Trigger value="object"><Box /></Tabs.Trigger>
                    <Tabs.Trigger value="ui"><LayoutDashboard /></Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1 ml-8">
                <Button
                    size="sm"
                    class="h-8 px-3 bg-green-800 text-green-400 hover:bg-green-500/20"
                >
                    <Play class="w-4 h-4 mr-1" />
                    Play
                </Button>

                <Separator orientation="vertical" class="h-6 mx-2" />

                <Button
                    variant="secondary"
                    size="sm"
                    class="w-8 h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <MousePointer2 class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="w-8 h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <Move class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="w-8 h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <RotateCw class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="w-8 h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <Scaling class="w-4 h-4" />
                </Button>
            </div>
        </div>

        <!-- Right side buttons -->
        <div class="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-slate-300 hover:bg-slate-600"
            >
                <Settings class="w-4 h-4" />
            </Button>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden relative z-10">
        <ResizablePaneGroup direction="horizontal" class="h-full">
            <!-- Left Panel - Object Explorer -->
            <ResizablePane defaultSize={20} minSize={15} maxSize={35}>
                <ObjectExplorer
                    {sceneObjects}
                    on:selectObject={handleSelectObject}
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
            <ResizablePane defaultSize={60} minSize={40}>
                <div class="h-full bg-gray-900/40 backdrop-blur-sm">
                    <Tabs.Root
                        bind:value={activeTab}
                        class="h-full flex flex-col"
                    >
                        <!-- Tab Header with Close Buttons and More Menu -->
                        <div
                            class="h-8 bg-gray-800/60 backdrop-blur-sm border-b border-gray-700/30 flex items-center px-1"
                        >
                            <Tabs.List class="h-6 bg-transparent p-0 flex-1">
                                {#each openTabs as tab}
                                    <div class="flex items-center relative">
                                        <Tabs.Trigger
                                            value={tab.id}
                                            class="h-6 px-2 text-xs rounded-none border-r border-gray-700/30 data-[state=active]:bg-gray-700/60 data-[state=active]:text-gray-200 text-gray-400 hover:text-gray-200"
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
                                        class="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                                    >
                                        <Plus class="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    class="w-40 bg-gray-800/90 backdrop-blur-sm border-gray-700"
                                >
                                    {#each availableTabs as tab}
                                        <DropdownMenuCheckboxItem
                                            class="text-gray-300 hover:bg-gray-700/60"
                                            checked={tab.visible}
                                            on:click={() => {
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
                                    class="h-full bg-transparent relative overflow-hidden"
                                >
                                    {#if !isViewportLoading}
                                        <div
                                            class="absolute inset-0 flex items-center justify-center"
                                            transition:fade={{ duration: 500 }}
                                        >
                                            <Canvas>
                                                <Scene scene={testScene} />
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
                                    class="h-full bg-gray-900/20 flex flex-col"
                                >
                                    <!-- Script Editor Header -->
                                    <div
                                        class="h-10 bg-gray-800/40 border-b border-gray-700/30 flex items-center px-4"
                                    >
                                        <div class="flex items-center gap-2">
                                            <Code2
                                                class="w-4 h-4 text-blue-400"
                                            />
                                            <span
                                                class="text-gray-300 text-sm font-medium"
                                                >Script Editor</span
                                            >
                                        </div>
                                        <div
                                            class="ml-auto flex items-center gap-3"
                                        >
                                            <select
                                                bind:value={selectedScript}
                                                class="bg-gray-700/50 text-gray-300 text-sm px-3 py-1 rounded border border-gray-600/30 focus:border-blue-500 focus:outline-none"
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
                                                on:click={() =>
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
                                    <ScratchBlocksEditor />
                                </div>
                            </Tabs.Content>

                            <!-- Placeholder content for other tabs -->
                            <Tabs.Content
                                value="materials"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-gray-900/20 flex items-center justify-center"
                                >
                                    <div class="text-center">
                                        <Palette
                                            class="w-12 h-12 mx-auto mb-3 text-gray-600"
                                        />
                                        <p class="text-gray-500 text-sm">
                                            Materials Editor
                                        </p>
                                        <p class="text-gray-600 text-xs">
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
            <ResizablePane defaultSize={20} minSize={15} maxSize={35}>
                <PropertiesPanel
                    {selectedObject}
                    {currentClasses}
                    on:propertyChange={handlePropertyChange}
                    on:addClass={handleAddClass}
                    on:removeClass={handleRemoveClass}
                />
            </ResizablePane>
        </ResizablePaneGroup>
    </div>
</div>
