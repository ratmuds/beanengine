<script>
    import { Button } from "$lib/components/ui/button";
    import {
        Box,
        Code2,
        FileImage,
        Palette,
        Wrench,
        Lightbulb,
    } from "lucide-svelte";

    import { blur, fade } from "svelte/transition";
</script>

<div class="h-screen bg-background flex flex-col">
    <!-- Subtle background accent (consistent with editor panels) -->
    <div
        class="absolute inset-0 bg-gradient-to-br from-blue-300/5 via-transparent to-purple-500/5 pointer-events-none"
    ></div>

    <div
        class="relative z-10 flex flex-col items-center justify-center flex-1 px-4"
    >
        <div class="max-w-3xl w-full space-y-12">
            <!-- Header -->
            <div transition:blur={{ duration: 1000 }} class="space-y-4">
                <h1 class="text-5xl font-bold tracking-tight">
                    <span
                        class="inline-block bg-orange-500 font-white px-3 py-1 mr-1 rounded-lg text-background"
                        >bean</span
                    ><span class="font-bold">engine</span>
                </h1>
                <p class="text-muted-foreground text-lg max-w-2xl">
                    A web-based <b>3D game development</b> tool bridging the gap
                    between visual block programming and professional game engines.
                </p>
            </div>

            <!-- CTA -->
            <div class="flex gap-3" transition:blur={{ delay: 500 }}>
                <Button
                    href="/projects"
                    size="lg"
                    class="bg-orange-500 hover:bg-orange-600 text-white"
                >
                    Open Editor
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    href="https://github.com/ratmuds/beanengine"
                    target="_blank"
                >
                    View Source
                </Button>
            </div>

            <!-- Features Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                <div
                    transition:fade={{ duration: 1100 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <Code2 class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">Custom Visual Scripting</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Block-based programming language built from scratch with
                        event-driven logic and variables.
                    </p>
                </div>

                <div
                    transition:fade={{ duration: 1200 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <Box class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">3D Scene Editor</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Real-time 3D viewport with transform controls, object
                        hierarchy, and physics integration.
                    </p>
                </div>

                <div
                    transition:fade={{ duration: 1300 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <FileImage class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">Asset Management</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Import and manage 3D models (GLTF), textures, and custom
                        materials with cloud storage.
                    </p>
                </div>

                <div
                    transition:fade={{ duration: 1400 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <Palette class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">UI System</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Built-in UI elements with flexible layout system for
                        in-game interfaces.
                    </p>
                </div>

                <div
                    transition:fade={{ duration: 1500 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <Wrench class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">Physics & Constraints</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Rapier physics engine with collision detection, rigid
                        bodies, and joint constraints.
                    </p>
                </div>

                <div
                    transition:fade={{ duration: 1600 }}
                    class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-5 space-y-2"
                >
                    <div class="flex items-center gap-2 text-foreground">
                        <Lightbulb class="w-5 h-5 text-orange-500" />
                        <h3 class="font-semibold">AI Assistant</h3>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Integrated AI agent for creating and modifying game
                        objects through natural language.
                    </p>
                </div>
            </div>

            <!-- Status Notice -->
            <div
                transition:fade={{ duration: 2000 }}
                class="bg-card/40 backdrop-blur-sm border border-border/30 rounded-lg p-4"
            >
                <p class="text-sm text-muted-foreground text-center">
                    <span class="font-semibold text-foreground">Note:</span> bean
                    engine is a proof-of-concept project. It is not production-ready
                    software.
                </p>
            </div>
        </div>
    </div>
</div>

<style>
    h1 {
        font-family: "Space Mono", monospace;
        font-weight: 700;
        font-style: italic;
    }
</style>
