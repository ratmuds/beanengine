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
    import {
        Tabs,
        TabsList,
        TabsTrigger,
        TabsContent,
    } from "$lib/components/ui/tabs";
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

    import { Canvas } from "@threlte/core";
    import Scene from "$lib/components/ViewportScene.svelte";
    import ScratchBlocksEditor from "$lib/components/ScratchBlocksEditor.svelte";
    import ItemSwitcher from "$lib/components/ItemSwitcher.svelte";
    import * as Types from "$lib/types";

    // Mock data for object explorer
    const sceneObjects = [
        { name: "Main Camera", type: "camera", expanded: false, depth: 0 },
        { name: "Directional Light", type: "light", expanded: false, depth: 0 },
        { name: "Player", type: "object", expanded: true, depth: 0 },
        { name: "PlayerModel", type: "mesh", expanded: false, depth: 1 },
        { name: "PlayerController", type: "script", expanded: false, depth: 1 },
        { name: "Environment", type: "folder", expanded: true, depth: 0 },
        { name: "Ground", type: "mesh", expanded: false, depth: 1 },
        { name: "Buildings", type: "folder", expanded: false, depth: 1 },
        { name: "Trees", type: "folder", expanded: false, depth: 1 },
    ];

    // Mock properties
    const selectedObjectProps = {
        name: "Player",
        transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
        components: [
            "Transform",
            "MeshRenderer",
            "PlayerController",
            "Rigidbody",
        ],
    };

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

    const testScene = new Types.BScene();
    let testPart = new Types.BPart("Test Object", null, null);
    testPart.position = new Types.BVector3(0, 5, 0);
    testPart.scale = new Types.BVector3(1, 1, 10);
    testScene.addObject(testPart);
</script>

<div class="h-screen w-full bg-gray-950 flex flex-col overflow-hidden relative">
    <!-- Global gradient overlay -->
    <div
        class="absolute inset-0 bg-gradient-to-t from-blue-500/15 via-blue-500/5 to-transparent pointer-events-none z-0"
    ></div>

    <!-- Top Navigation Bar -->
    <div
        class="h-12 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 flex items-center px-4 relative z-10"
    >
        <div class="flex items-center gap-4 flex-1">
            <!-- Project Name -->
            <div class="flex items-center gap-2">
                <div
                    class="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"
                ></div>
                <span class="text-gray-200 font-medium text-sm"
                    >Test Project</span
                >
            </div>

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
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <MousePointer2 class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <Move class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
                >
                    <RotateCw class="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2 text-slate-300 hover:bg-slate-600"
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
                <div
                    class="h-full bg-gray-900/60 backdrop-blur-sm border-r border-gray-700/30"
                >
                    <div class="p-4">
                        <h2 class="text-gray-200 font-semibold mb-2">
                            Object Explorer
                        </h2>

                        <ItemSwitcher
                            name="Scene"
                            options={["Default"]}
                            defaultOption="Default"
                        >
                            <FolderOpen class="w-4 h-4" /></ItemSwitcher
                        >

                        <Separator class="my-2" />

                        <div class="space-y-1">
                            {#each sceneObjects as obj}
                                {@const Icon = getObjectIcon(obj.type)}
                                <div
                                    class="flex items-center gap-2 px-2 py-2 rounded text-sm text-gray-300 hover:bg-gray-800/60 cursor-pointer"
                                    style="margin-left: {obj.depth * 12}px"
                                >
                                    {#if obj.type === "folder"}
                                        {#if obj.expanded}
                                            <FolderOpen
                                                class="w-4 h-4 text-gray-400"
                                            />
                                        {:else}
                                            <Folder
                                                class="w-4 h-4 text-gray-400"
                                            />
                                        {/if}
                                    {:else}
                                        <Icon class="w-4 h-4 text-gray-400" />
                                    {/if}
                                    <span class="flex-1 font-medium"
                                        >{obj.name}</span
                                    >
                                    <div
                                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Eye
                                            class="w-3.5 h-3.5 text-gray-500 hover:text-gray-300"
                                        />
                                        <Unlock
                                            class="w-3.5 h-3.5 text-gray-500 hover:text-gray-300"
                                        />
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </ResizablePane>

            <ResizableHandle />

            <!-- Center Panel - Tabbed Interface -->
            <ResizablePane defaultSize={60} minSize={40}>
                <div class="h-full bg-gray-900/40 backdrop-blur-sm">
                    <Tabs bind:value={activeTab} class="h-full flex flex-col">
                        <!-- Tab Header with Close Buttons and More Menu -->
                        <div
                            class="h-8 bg-gray-800/60 backdrop-blur-sm border-b border-gray-700/30 flex items-center px-1"
                        >
                            <TabsList class="h-6 bg-transparent p-0 flex-1">
                                {#each openTabs as tab}
                                    <div class="flex items-center relative">
                                        <TabsTrigger
                                            value={tab.id}
                                            class="h-6 px-2 text-xs rounded-none border-r border-gray-700/30 data-[state=active]:bg-gray-700/60 data-[state=active]:text-gray-200 text-gray-400 hover:text-gray-200"
                                        >
                                            <svelte:component
                                                this={tab.icon}
                                                class="w-3 h-3 mr-1"
                                            />
                                            {tab.label}
                                        </TabsTrigger>
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
                            </TabsList>

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
                            <TabsContent
                                value="viewport"
                                class="h-full m-0 p-0"
                            >
                                <div
                                    class="h-full bg-transparent relative overflow-hidden"
                                >
                                    <div
                                        class="absolute inset-0 flex items-center justify-center"
                                    >
                                        <Canvas>
                                            <Scene scene={testScene} />
                                        </Canvas>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="script" class="h-full m-0 p-0">
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
                            </TabsContent>

                            <!-- Placeholder content for other tabs -->
                            <TabsContent
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
                            </TabsContent>

                            <TabsContent value="assets" class="h-full m-0 p-0">
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
                            </TabsContent>

                            <TabsContent
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
                            </TabsContent>

                            <TabsContent value="audio" class="h-full m-0 p-0">
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
                            </TabsContent>

                            <TabsContent value="input" class="h-full m-0 p-0">
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
                            </TabsContent>

                            <TabsContent
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
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </ResizablePane>

            <ResizableHandle />

            <!-- Right Panel - Properties -->
            <ResizablePane defaultSize={20} minSize={15} maxSize={35}>
                <div
                    class="h-full bg-gray-900/60 backdrop-blur-sm border-l border-gray-700/30"
                >
                    <div class="p-4">
                        <h3
                            class="text-gray-300 font-medium text-sm mb-4 flex items-center gap-2"
                        >
                            <Settings class="w-4 h-4" />
                            Properties
                        </h3>

                        {#if selectedObjectProps}
                            <Card
                                class="bg-gray-800/40 backdrop-blur-sm border-gray-700/30 mb-4"
                            >
                                <CardHeader class="pb-2 p-4">
                                    <CardTitle
                                        class="text-gray-200 text-sm font-medium"
                                        >{selectedObjectProps.name}</CardTitle
                                    >
                                </CardHeader>
                                <CardContent class="pt-0 p-4">
                                    <!-- Transform Section -->
                                    <div class="space-y-6">
                                        <div>
                                            <h4
                                                class="text-gray-300 text-sm font-medium mb-3"
                                            >
                                                Position
                                            </h4>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label
                                                        for="pos-x"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >X</label
                                                    >
                                                    <input
                                                        id="pos-x"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .x}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="pos-y"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Y</label
                                                    >
                                                    <input
                                                        id="pos-y"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .y}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="pos-z"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Z</label
                                                    >
                                                    <input
                                                        id="pos-z"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.position
                                                            .z}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4
                                                class="text-gray-300 text-sm font-medium mb-3"
                                            >
                                                Scale
                                            </h4>
                                            <div class="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label
                                                        for="scale-x"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >X</label
                                                    >
                                                    <input
                                                        id="scale-x"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.x}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="scale-y"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Y</label
                                                    >
                                                    <input
                                                        id="scale-y"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.y}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        for="scale-z"
                                                        class="text-gray-400 text-xs block mb-2"
                                                        >Z</label
                                                    >
                                                    <input
                                                        id="scale-z"
                                                        type="number"
                                                        value={selectedObjectProps
                                                            .transform.scale.z}
                                                        class="w-full bg-gray-700/50 border border-gray-600/30 text-gray-200 text-sm px-3 py-2 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        {:else}
                            <div class="text-center py-8">
                                <Box
                                    class="w-8 h-8 mx-auto mb-3 text-gray-600"
                                />
                                <p class="text-gray-500 text-sm">
                                    Select an object to view properties
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>
            </ResizablePane>
        </ResizablePaneGroup>
    </div>
</div>
