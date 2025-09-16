<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { T } from "@threlte/core";
    import { Grid, OrbitControls } from "@threlte/extras";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Dialog from "$lib/components/ui/dialog";
    import { particleStore } from "$lib/particleStore";
    import { BParticle } from "$lib/types";
    import {
        Plus,
        Search,
        Filter,
        Trash2,
        Edit,
        Sparkles,
        MoreHorizontal,
        Play,
        Settings,
        Zap,
    } from "lucide-svelte";

    const dispatch = createEventDispatcher();

    // View state
    let showCreateDialog = $state(false);
    let newParticleName = $state("");

    // Local state for search and filter
    let searchQuery = $state("");
    let selectedParticles = $state<BParticle[]>([]);
    let selectedParticle = $state<BParticle | null>(null);

    // Get reactive data from store
    let allParticles = $derived($particleStore.getAllParticles());
    let filteredParticles = $derived(
        allParticles.filter((particle) => {
            if (
                searchQuery &&
                !particle.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
                return false;
            }
            return true;
        })
    );

    // Particle selection
    const handleParticleClick = (particle: BParticle, event: MouseEvent) => {
        const multiSelect = event.ctrlKey || event.metaKey;

        if (multiSelect) {
            const index = selectedParticles.findIndex(
                (p) => p.id === particle.id
            );
            if (index >= 0) {
                selectedParticles = selectedParticles.filter(
                    (_, i) => i !== index
                );
            } else {
                selectedParticles = [...selectedParticles, particle];
            }
        } else {
            selectedParticles = [particle];
            selectedParticle = particle;
        }

        dispatch("particleSelected", { particle });
    };

    const handleParticleDoubleClick = (particle: BParticle) => {
        dispatch("particleDoubleClick", { particle });
    };

    // Search
    const handleSearchInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        searchQuery = target.value;
    };

    // Particle actions
    const handleDeleteSelected = () => {
        let count = 0;
        for (const particle of selectedParticles) {
            if (particleStore.removeParticle(particle.id)) {
                count++;
            }
        }
        selectedParticles = [];
        selectedParticle = null;
        console.log(`Deleted ${count} particle(s)`);
    };

    const handleCreateParticle = async () => {
        if (!newParticleName.trim()) return;

        try {
            await particleStore.addParticle(newParticleName.trim());
            newParticleName = "";
            showCreateDialog = false;
            console.log(`Created particle: ${newParticleName}`);
        } catch (error) {
            console.error("Failed to create particle:", error);
        }
    };
</script>

<div class="h-full flex bg-card/60 backdrop-blur-sm border-l border-border/30">
    <!-- Left Panel - Particle Grid -->
    <div class="flex-1 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-border/30">
            <div class="flex items-center justify-between mb-3">
                <h2
                    class="text-lg font-semibold text-foreground flex items-center gap-2"
                >
                    <Sparkles class="w-5 h-5" />
                    Particle Browser
                </h2>
                <div class="flex items-center gap-2">
                    <!-- Create particle button -->
                    <Button
                        size="sm"
                        onclick={() => (showCreateDialog = true)}
                        class="h-8 px-3"
                    >
                        <Plus class="w-4 h-4 mr-1" />
                        Create
                    </Button>
                </div>
            </div>

            <!-- Search -->
            <div class="flex items-center gap-2 mb-3">
                <div class="relative flex-1">
                    <Search
                        class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <Input
                        placeholder="Search particles..."
                        value={searchQuery}
                        oninput={handleSearchInput}
                        class="pl-10 h-8"
                    />
                </div>
            </div>

            <!-- Stats and actions -->
            <div
                class="flex items-center justify-between text-sm text-muted-foreground"
            >
                <div class="flex items-center gap-4">
                    <span>{filteredParticles.length} particles</span>
                </div>

                {#if selectedParticles.length > 0}
                    <div class="flex items-center gap-2">
                        <span>{selectedParticles.length} selected</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={handleDeleteSelected}
                            class="h-6 px-2 text-destructive hover:text-destructive"
                        >
                            <Trash2 class="w-3 h-3" />
                        </Button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Particle grid -->
        <div class="flex-1 overflow-auto p-4">
            {#if filteredParticles.length === 0}
                <!-- Empty state -->
                <div class="h-full flex items-center justify-center">
                    <div class="text-center">
                        {#if allParticles.length === 0}
                            <Sparkles
                                class="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                            />
                            <h3
                                class="text-lg font-medium text-foreground mb-2"
                            >
                                No Particles Yet
                            </h3>
                            <p class="text-muted-foreground mb-4">
                                Create your first particle system to get started
                            </p>
                            <Button onclick={() => (showCreateDialog = true)}>
                                <Plus class="w-4 h-4 mr-2" />
                                Create Particle
                            </Button>
                        {:else}
                            <Search
                                class="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                            />
                            <h3
                                class="text-lg font-medium text-foreground mb-2"
                            >
                                No Results
                            </h3>
                            <p class="text-muted-foreground">
                                Try adjusting your search
                            </p>
                        {/if}
                    </div>
                </div>
            {:else}
                <!-- Grid view -->
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                >
                    {#each filteredParticles as particle (particle.id)}
                        {@const isSelected = selectedParticles.some(
                            (p) => p.id === particle.id
                        )}

                        <div
                            class="group relative bg-card border border-border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                            class:ring-2={isSelected}
                            class:ring-primary={isSelected}
                            onclick={(e) => handleParticleClick(particle, e)}
                            ondblclick={() =>
                                handleParticleDoubleClick(particle)}
                        >
                            <!-- Particle preview -->
                            <div
                                class="aspect-square bg-muted rounded-md mb-2 overflow-hidden relative"
                            >
                                <!-- Animated particle preview -->
                                <div
                                    class="w-full h-full flex items-center justify-center relative"
                                    style="background: radial-gradient(circle, {particle.color}50 0%, transparent 70%)"
                                ></div>
                            </div>

                            <!-- Particle info -->
                            <div class="space-y-1">
                                <p
                                    class="text-sm font-medium text-foreground truncate"
                                    title={particle.name}
                                >
                                    {particle.name}
                                </p>
                                <div class="flex items-center justify-between">
                                    <Badge variant="secondary" class="text-xs">
                                        PARTICLE
                                    </Badge>
                                    <div
                                        class="w-4 h-4 rounded-full border border-border"
                                        style="background-color: {particle.color}"
                                    ></div>
                                </div>
                            </div>

                            <!-- Actions (shown on hover) -->
                            <div
                                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-6 w-6 p-2 bg-muted"
                                        >
                                            <MoreHorizontal
                                                class="w-3 h-3 text-white"
                                            />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        <DropdownMenu.Item>
                                            <Edit class="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                particleStore.removeParticle(
                                                    particle.id
                                                )}
                                        >
                                            <Trash2 class="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    <!-- Right Panel - Particle Preview & Settings -->
    <div class="w-80 bg-zinc-900/50 border-l border-border/30 flex flex-col">
        {#if selectedParticle}
            <!-- Particle Preview -->
            <div class="p-4 border-b border-border/30">
                <h3
                    class="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"
                >
                    <Play class="w-4 h-4" />
                    Preview
                </h3>
                <div
                    class="aspect-square bg-muted/50 rounded-lg border border-border/20 relative overflow-hidden"
                >
                    <!-- Particle preview -->
                    <div
                        class="absolute inset-0 flex items-center justify-center"
                    ></div>

                    <!-- Animated background effect -->
                    <div
                        class="absolute inset-0 opacity-20"
                        style="background: radial-gradient(circle at 50% 50%, {selectedParticle.color} 0%, transparent 50%)"
                    ></div>
                </div>
            </div>

            <!-- Particle Settings -->
            <div class="flex-1 p-4">
                <h3
                    class="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"
                >
                    <Settings class="w-4 h-4" />
                    Settings
                </h3>

                <!-- Placeholder settings -->
                <div class="space-y-4">
                    <div class="space-y-2">
                        <label
                            class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                            Name
                        </label>
                        <Input
                            value={selectedParticle.name}
                            class="h-8 text-sm"
                            readonly
                        />
                    </div>

                    <div class="space-y-2">
                        <label
                            class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                            Color
                        </label>
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded border border-border"
                                style="background-color: {selectedParticle.color}"
                            ></div>
                            <Input
                                value={selectedParticle.color}
                                class="h-8 text-sm flex-1"
                                readonly
                            />
                        </div>
                    </div>

                    <!-- Placeholder for future settings -->
                    <div class="pt-4 border-t border-border/30">
                        <div class="text-center text-muted-foreground">
                            <Settings class="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p class="text-xs">Advanced particle settings</p>
                            <p class="text-xs">will be added here</p>
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- No selection state -->
            <div class="flex-1 flex items-center justify-center p-4">
                <div class="text-center">
                    <Sparkles
                        class="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50"
                    />
                    <p class="text-sm text-muted-foreground">
                        Select a particle to view
                    </p>
                    <p class="text-sm text-muted-foreground">
                        preview and settings
                    </p>
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- Create Particle Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Create New Particle</Dialog.Title>
            <Dialog.Description>
                Create a new particle system for your scene.
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
            <div class="space-y-2">
                <label for="particle-name" class="text-sm font-medium"
                    >Name</label
                >
                <Input
                    id="particle-name"
                    placeholder="Enter particle name..."
                    bind:value={newParticleName}
                />
            </div>
        </div>

        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (showCreateDialog = false)}
            >
                Cancel
            </Button>
            <Button
                onclick={handleCreateParticle}
                disabled={!newParticleName.trim()}
            >
                Create Particle
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
