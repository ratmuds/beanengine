<script>
    import { Button } from "$lib/components/ui/button";
</script>

<div
    class="flex flex-col items-center justify-center min-h-screen bg-background"
>
    <div class="max-w-2xl mx-auto text-center space-y-8 px-4">
        <!-- Simple bean logo -->
        <div
            class="inline-block bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full"
        >
            <h1
                class="text-5xl font-bold tracking-tight flex items-center gap-3"
            >
                beanengine
            </h1>
        </div>

        <div class="space-y-4">
            <p class="text-muted-foreground text-xl leading-relaxed">
                A simple game engine to help you transition from Scratch to real
                game development.
            </p>
            <p class="text-muted-foreground">
                Visual scripting, game objects, and easy sharing - all in one
                place.
            </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
                href="/editor"
                size="lg"
                class="bg-orange-500 hover:bg-orange-600 text-white"
            >
                Start Building
            </Button>
            <Button variant="outline" size="lg">Learn More</Button>
        </div>

        <!-- Simple feature list -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-sm">
            <div class="text-center space-y-2">
                <div class="text-2xl">🎨</div>
                <h3 class="font-semibold">Visual Scripting</h3>
                <p class="text-muted-foreground">Drag and drop like Scratch</p>
            </div>
            <div class="text-center space-y-2">
                <div class="text-2xl">🎮</div>
                <h3 class="font-semibold">Game Objects</h3>
                <p class="text-muted-foreground">Sprites, sounds, and scenes</p>
            </div>
            <div class="text-center space-y-2">
                <div class="text-2xl">🚀</div>
                <h3 class="font-semibold">Easy Export</h3>
                <p class="text-muted-foreground">Share your games instantly</p>
            </div>
        </div>
    </div>
</div>
