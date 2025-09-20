<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Dialog from "$lib/components/ui/dialog";
    import { materialStore } from "$lib/materialStore";
    import { assetStore } from "$lib/assetStore";
    import { BMaterial } from "$lib/types";
    import {
        Plus,
        Search,
        Filter,
        Grid3x3,
        List,
        Trash2,
        Edit,
        Palette,
        MoreHorizontal,
        Sparkles,
        Circle,
    } from "lucide-svelte";

    const dispatch = createEventDispatcher();

    // View state
    // viewMode removed
    let showCreateDialog = $state(false);
    let newMaterialName = $state("");
    let newMaterialType: "basic" | "pbr" = $state("basic");

    // Local state for search and filter
    let searchQuery = $state("");
    let filterType = $state("all");
    let selectedMaterials = $state<BMaterial[]>([]);

    // Get reactive data from store
    let allMaterials = $derived($materialStore.getAllMaterials());
    let filteredMaterials = $derived(
        allMaterials.filter((material) => {
            if (
                searchQuery &&
                !material.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
                return false;
            }
            if (filterType !== "all" && material.type !== filterType) {
                return false;
            }
            return true;
        })
    );

    // Material type icons mapping
    const getMaterialIcon = (type: "basic" | "pbr") => {
        switch (type) {
            case "basic":
                return Circle;
            case "pbr":
                return Sparkles;
            default:
                return Palette;
        }
    };

    // Material selection
    const handleMaterialClick = (material: BMaterial, event: MouseEvent) => {
        const multiSelect = event.ctrlKey || event.metaKey;

        if (multiSelect) {
            const index = selectedMaterials.findIndex(
                (m) => m.id === material.id
            );
            if (index >= 0) {
                selectedMaterials = selectedMaterials.filter(
                    (_, i) => i !== index
                );
            } else {
                selectedMaterials = [...selectedMaterials, material];
            }
        } else {
            selectedMaterials = [material];
        }

        dispatch("materialSelected", { material });
    };

    const handleMaterialDoubleClick = (material: BMaterial) => {
        dispatch("materialDoubleClick", { material });
    };

    // Search and filter
    const handleSearchInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        searchQuery = target.value;
    };

    const handleFilterChange = (type: string) => {
        filterType = type;
    };

    // Material actions
    const handleDeleteSelected = () => {
        let count = 0;
        for (const material of selectedMaterials) {
            if (materialStore.removeMaterial(material.id)) {
                count++;
            }
        }
        selectedMaterials = [];
        console.log(`Deleted ${count} material(s)`);
    };

    const handleCreateMaterial = async () => {
        if (!newMaterialName.trim()) return;

        try {
            await materialStore.addMaterial(
                newMaterialName.trim(),
                newMaterialType
            );
            newMaterialName = "";
            newMaterialType = "basic";
            showCreateDialog = false;
            console.log(`Created material: ${newMaterialName}`);
        } catch (error) {
            console.error("Failed to create material:", error);
        }
    };

    // Get texture URL from asset store
    const getTextureUrl = (assetId: string): string | undefined => {
        if (!assetId) return undefined;
        const asset = assetStore.getAsset(assetId);
        return asset?.url;
    };
</script>

<div
    class="h-full flex flex-col bg-card/60 backdrop-blur-sm border-l border-border/30"
>
    <!-- Header -->
    <div class="p-4 border-b border-border/30">
        <div class="flex items-center justify-between mb-3">
            <h2
                class="text-lg font-semibold text-foreground flex items-center gap-2"
            >
                <Palette class="w-5 h-5" />
                Material Browser
            </h2>
            <div class="flex items-center gap-2">
                <!-- Create material button -->
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

        <!-- Search and filters -->
        <div class="flex items-center gap-2 mb-3">
            <div class="relative flex-1">
                <Search
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <Input
                    placeholder="Search materials..."
                    value={searchQuery}
                    oninput={handleSearchInput}
                    class="pl-10 h-8"
                />
            </div>

            <!-- Filter dropdown -->
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="outline" size="sm" class="h-8 px-3">
                        <Filter class="w-4 h-4 mr-1" />
                        {filterType === "all"
                            ? "All"
                            : filterType.toUpperCase()}
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item
                        onclick={() => handleFilterChange("all")}
                    >
                        All Materials
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                        onclick={() => handleFilterChange("basic")}
                    >
                        <Circle class="w-4 h-4 mr-2" />
                        Basic Materials
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        onclick={() => handleFilterChange("pbr")}
                    >
                        <Sparkles class="w-4 h-4 mr-2" />
                        PBR Materials
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>

        <!-- Stats and actions -->
        <div
            class="flex items-center justify-between text-sm text-muted-foreground"
        >
            <div class="flex items-center gap-4">
                <span>{filteredMaterials.length} materials</span>
            </div>

            {#if selectedMaterials.length > 0}
                <div class="flex items-center gap-2">
                    <span>{selectedMaterials.length} selected</span>
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

    <!-- Material grid/list -->
    <div class="flex-1 overflow-auto p-4">
        {#if filteredMaterials.length === 0}
            <!-- Empty state -->
            <div class="h-full flex items-center justify-center">
                <div class="text-center">
                    {#if allMaterials.length === 0}
                        <Palette
                            class="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                        />
                        <h3 class="text-lg font-medium text-foreground mb-2">
                            No Materials Yet
                        </h3>
                        <p class="text-muted-foreground mb-4">
                            Create your first material to get started
                        </p>
                        <Button onclick={() => (showCreateDialog = true)}>
                            <Plus class="w-4 h-4 mr-2" />
                            Create Material
                        </Button>
                    {:else}
                        <Search
                            class="w-16 h-16 mx-auto mb-4 text-muted-foreground"
                        />
                        <h3 class="text-lg font-medium text-foreground mb-2">
                            No Results
                        </h3>
                        <p class="text-muted-foreground">
                            Try adjusting your search or filter
                        </p>
                    {/if}
                </div>
            </div>
        {:else}
            <!-- Grid view -->
            <div
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            >
                {#each filteredMaterials as material (material.id)}
                    {@const IconComponent = getMaterialIcon(material.type)}
                    {@const isSelected = selectedMaterials.some(
                        (m) => m.id === material.id
                    )}

                    <div
                        class="group relative bg-card border border-border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                        class:ring-2={isSelected}
                        class:ring-primary={isSelected}
                        onclick={(e) => handleMaterialClick(material, e)}
                        ondblclick={() => handleMaterialDoubleClick(material)}
                    >
                        <!-- Material preview -->
                        <div
                            class="aspect-square bg-muted rounded-md mb-2 overflow-hidden relative"
                        >
                            <!-- Simple color preview for now -->
                            <div
                                class="w-full h-full flex items-center justify-center"
                                style="background: linear-gradient(135deg, {material.color} 0%, {material.color}dd 100%)"
                            >
                                <div
                                    class="w-16 h-16 rounded-full shadow-lg"
                                    style="background-color: {material.color}; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1);"
                                ></div>
                            </div>
                            {#if material.type === "pbr"}
                                <div class="absolute top-1 right-1">
                                    <Sparkles class="w-3 h-3 text-white/80" />
                                </div>
                            {/if}
                        </div>

                        <!-- Material info -->
                        <div class="space-y-1">
                            <p
                                class="text-sm font-medium text-foreground truncate"
                                title={material.name}
                            >
                                {material.name}
                            </p>
                            <div class="flex items-center justify-between">
                                {#if material.builtin}
                                    <span class="text-xs text-muted-foreground">
                                        Built-in
                                    </span>
                                {/if}
                                <Badge variant="secondary" class="text-xs">
                                    MAT
                                </Badge>
                                <div
                                    class="w-4 h-4 rounded-full border border-border"
                                    style="background-color: {material.color}"
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
                                            materialStore.removeMaterial(
                                                material.id
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

<!-- Create Material Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Create New Material</Dialog.Title>
            <Dialog.Description>
                Create a new material for your 3D objects.
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
            <div class="space-y-2">
                <label for="material-name" class="text-sm font-medium"
                    >Name</label
                >
                <Input
                    id="material-name"
                    placeholder="Enter material name..."
                    bind:value={newMaterialName}
                />
            </div>

            <div class="space-y-2">
                <label class="text-sm font-medium">Type</label>
                <div class="flex gap-2">
                    <Button
                        variant={newMaterialType === "basic"
                            ? "default"
                            : "outline"}
                        size="sm"
                        onclick={() => (newMaterialType = "basic")}
                        class="flex-1"
                    >
                        <Circle class="w-4 h-4 mr-2" />
                        Basic
                    </Button>
                    <Button
                        variant={newMaterialType === "pbr"
                            ? "default"
                            : "outline"}
                        size="sm"
                        onclick={() => (newMaterialType = "pbr")}
                        class="flex-1"
                    >
                        <Sparkles class="w-4 h-4 mr-2" />
                        PBR
                    </Button>
                </div>
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
                onclick={handleCreateMaterial}
                disabled={!newMaterialName.trim()}
            >
                Create Material
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
