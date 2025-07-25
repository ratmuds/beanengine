<script>
    import { Button } from "$lib/components/ui/button";
</script>

<div
    class="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden"
>
    <!-- Decorative pill elements -->
    <div class="absolute top-20 left-10 w-16 h-8 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-20 rotate-12"></div>
    <div class="absolute top-40 right-16 w-12 h-6 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full opacity-30 -rotate-45"></div>
    <div class="absolute bottom-32 left-20 w-20 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-25 rotate-45"></div>
    <div class="absolute bottom-48 right-8 w-14 h-7 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-20 -rotate-12"></div>
    <div class="absolute top-1/3 left-4 w-10 h-5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-15 rotate-90"></div>
    <div class="absolute top-1/2 right-12 w-18 h-9 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full opacity-20 -rotate-30"></div>

    <div class="max-w-2xl mx-auto text-center space-y-8 px-4 relative z-10">
        <!-- Bean-styled logo -->
        <div class="relative">
            <h1 class="text-5xl font-bold tracking-tight flex items-center justify-center gap-1">
                <span class="bg-gradient-to-br from-amber-600 to-orange-700 dark:from-amber-400 dark:to-orange-500 text-white px-4 py-2 rounded-full transform -rotate-12 shadow-lg" 
                      style="border-radius: 60% 40% 40% 60% / 60% 30% 70% 40%;">
                    bean
                </span>
                <span class="text-foreground">engine</span>
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
                class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-8 shadow-lg transform hover:scale-105 transition-all"
            >
                Start Building
            </Button>
            <Button variant="outline" size="lg" class="rounded-full px-8 border-2 hover:bg-muted/50 transition-all">
                Learn More
            </Button>
        </div>

        <!-- Pill-styled feature list -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div class="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-full p-6 text-center space-y-3 border border-pink-100 dark:border-pink-800/30 hover:shadow-lg transition-all hover:scale-105">
                <div class="text-3xl">🎨</div>
                <h3 class="font-semibold text-pink-800 dark:text-pink-200">Visual Scripting</h3>
                <p class="text-pink-600 dark:text-pink-300 text-sm">Drag and drop like Scratch</p>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-full p-6 text-center space-y-3 border border-blue-100 dark:border-blue-800/30 hover:shadow-lg transition-all hover:scale-105">
                <div class="text-3xl">🎮</div>
                <h3 class="font-semibold text-blue-800 dark:text-blue-200">Game Objects</h3>
                <p class="text-blue-600 dark:text-blue-300 text-sm">Sprites, sounds, and scenes</p>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-full p-6 text-center space-y-3 border border-green-100 dark:border-green-800/30 hover:shadow-lg transition-all hover:scale-105">
                <div class="text-3xl">🚀</div>
                <h3 class="font-semibold text-green-800 dark:text-green-200">Easy Export</h3>
                <p class="text-green-600 dark:text-green-300 text-sm">Share your games instantly</p>
            </div>
        </div>
    </div>
</div>
