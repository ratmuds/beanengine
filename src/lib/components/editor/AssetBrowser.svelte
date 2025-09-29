<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { assetStore } from '$lib/assetStore';
    import {
        Upload,
        Search,
        Filter,
        Grid3x3,
        List,
        Trash2,
        Download,
        Package,
        Image,
        Music,
        FileText,
        Box,
        Palette,
        MoreHorizontal,
        FolderOpen
    } from 'lucide-svelte';

    const dispatch = createEventDispatcher();

    // View state
    let viewMode = $state('grid');
    let dragOver = $state(false);
    let uploadInput;

    // Local state for search and filter
    let searchQuery = $state('');
    let filterType = $state('all');
    let selectedAssets = $state([]);
    
    // Get reactive data from store
    let allAssets = $derived($assetStore.getAllAssets());
    let filteredAssets = $derived(allAssets.filter(asset => {
        if (searchQuery && !asset.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (filterType !== 'all' && asset.metadata.type !== filterType) {
            return false;
        }
        return true;
    }));

    // File type icons mapping
    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'mesh': return Box;
            case 'texture': return Image;
            case 'audio': return Music;
            case 'material': return Palette;
            case 'script': return FileText;
            default: return Package;
        }
    };

    // File size formatting
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Upload handling
    const handleFileUpload = async (files: FileList) => {
        if (files.length === 0) return;
        
        try {
            for (const file of files) {
                await assetStore.addAsset(file);
            }
            console.log(`Uploaded ${files.length} asset(s)`);
        } catch (error) {
            console.error('Failed to upload assets:', error);
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        dragOver = false;
        
        const files = event.dataTransfer?.files;
        if (files) {
            handleFileUpload(files);
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        dragOver = true;
    };

    const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        dragOver = false;
    };

    // Asset selection
    const handleAssetClick = (asset, event) => {
        const multiSelect = event.ctrlKey || event.metaKey;
        
        if (multiSelect) {
            const index = selectedAssets.findIndex(a => a.metadata.id === asset.metadata.id);
            if (index >= 0) {
                selectedAssets = selectedAssets.filter((_, i) => i !== index);
            } else {
                selectedAssets = [...selectedAssets, asset];
            }
        } else {
            selectedAssets = [asset];
        }
        
        dispatch('assetSelected', { asset });
    };

    const handleAssetDoubleClick = (asset) => {
        dispatch('assetDoubleClick', { asset });
    };

    // Search and filter
    const handleSearchInput = (event) => {
        const target = event.target;
        searchQuery = target.value;
    };

    const handleFilterChange = (type: string) => {
        filterType = type;
    };

    // Asset actions
    const handleDeleteSelected = () => {
        let count = 0;
        for (const asset of selectedAssets) {
            if (assetStore.removeAsset(asset.metadata.id)) {
                count++;
            }
        }
        selectedAssets = [];
        console.log(`Deleted ${count} asset(s)`);
    };

    const handleDownloadAsset = (asset) => {
        if (asset.url) {
            const a = document.createElement('a');
            a.href = asset.url;
            a.download = asset.metadata.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
</script>

<div class="h-full flex flex-col bg-card/60 backdrop-blur-sm border-l border-border/30">
    <!-- Header -->
    <div class="p-4 border-b border-border/30">
        <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package class="w-5 h-5" />
                Asset Browser
            </h2>
            <div class="flex items-center gap-2">
                <!-- View mode toggle -->
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => viewMode = viewMode === 'grid' ? 'list' : 'grid'}
                    class="h-8 w-8 p-0"
                >
                    {#if viewMode === 'grid'}
                        <List class="w-4 h-4" />
                    {:else}
                        <Grid3x3 class="w-4 h-4" />
                    {/if}
                </Button>
                
                <!-- Upload button -->
                <Button
                    size="sm"
                    onclick={() => uploadInput?.click()}
                    class="h-8 px-3"
                >
                    <Upload class="w-4 h-4 mr-1" />
                    Upload
                </Button>
            </div>
        </div>

        <!-- Search and filters -->
        <div class="flex items-center gap-2 mb-3">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search assets..."
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
                        {filterType === 'all' ? 'All' : filterType}
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item onclick={() => handleFilterChange('all')}>
                        All Assets
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onclick={() => handleFilterChange('mesh')}>
                        <Box class="w-4 h-4 mr-2" />
                        3D Meshes
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => handleFilterChange('texture')}>
                        <Image class="w-4 h-4 mr-2" />
                        Textures
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => handleFilterChange('audio')}>
                        <Music class="w-4 h-4 mr-2" />
                        Audio
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => handleFilterChange('material')}>
                        <Palette class="w-4 h-4 mr-2" />
                        Materials
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onclick={() => handleFilterChange('script')}>
                        <FileText class="w-4 h-4 mr-2" />
                        Scripts
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>

        <!-- Stats and actions -->
        <div class="flex items-center justify-between text-sm text-muted-foreground">
            <div class="flex items-center gap-4">
                <span>{filteredAssets.length} assets</span>
                <span>{formatFileSize(allAssets.reduce((total, asset) => total + asset.metadata.size, 0))}</span>
            </div>
            
            {#if selectedAssets.length > 0}
                <div class="flex items-center gap-2">
                    <span>{selectedAssets.length} selected</span>
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

    <!-- Asset grid/list -->
    <div 
        class="flex-1 overflow-auto p-4"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        class:drag-over={dragOver}
    >
        {#if filteredAssets.length === 0}
            <!-- Empty state -->
            <div class="h-full flex items-center justify-center">
                <div class="text-center">
                    {#if allAssets.length === 0}
                        <FolderOpen class="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 class="text-lg font-medium text-foreground mb-2">No Assets Yet</h3>
                        <p class="text-muted-foreground mb-4">Upload your first 3D model, texture, or audio file</p>
                        <Button onclick={() => uploadInput?.click()}>
                            <Upload class="w-4 h-4 mr-2" />
                            Upload Assets
                        </Button>
                    {:else}
                        <Search class="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 class="text-lg font-medium text-foreground mb-2">No Results</h3>
                        <p class="text-muted-foreground">Try adjusting your search or filter</p>
                    {/if}
                </div>
            </div>
        {:else if viewMode === 'grid'}
            <!-- Grid view -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {#each filteredAssets as asset (asset.metadata.id)}
                    {@const IconComponent = getAssetIcon(asset.metadata.type)}
                    {@const isSelected = selectedAssets.some(a => a.metadata.id === asset.metadata.id)}
                    
                    <div 
                        class="group relative bg-card border border-border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                        class:ring-2={isSelected}
                        class:ring-primary={isSelected}
                        onclick={(e) => handleAssetClick(asset, e)}
                        ondblclick={() => handleAssetDoubleClick(asset)}
                    >
                        <!-- Asset preview/icon -->
                        <div class="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center">
                            {#if asset.metadata.type === 'texture' && asset.url}
                                <img 
                                    src={asset.url} 
                                    alt={asset.metadata.name}
                                    class="w-full h-full object-cover rounded-md"
                                />
                            {:else}
                                <IconComponent class="w-8 h-8 text-muted-foreground" />
                            {/if}
                        </div>
                        
                        <!-- Asset info -->
                        <div class="space-y-1">
                            <p class="text-sm font-medium text-foreground truncate" title={asset.metadata.name}>
                                {asset.metadata.name}
                            </p>
                            <div class="flex items-center justify-between">
                                <Badge variant="secondary" class="text-xs">
                                    {asset.metadata.fileType.toUpperCase()}
                                </Badge>
                                <span class="text-xs text-muted-foreground">
                                    {formatFileSize(asset.metadata.size)}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Actions (shown on hover) -->
                        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button variant="ghost" size="sm" class="h-6 w-6 p-0">
                                        <MoreHorizontal class="w-3 h-3" />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    <DropdownMenu.Item onclick={() => handleDownloadAsset(asset)}>
                                        <Download class="w-4 h-4 mr-2" />
                                        Download
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item onclick={() => assetStore.removeAsset(asset.metadata.id)}>
                                        <Trash2 class="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <!-- List view -->
            <div class="space-y-1">
                {#each filteredAssets as asset (asset.metadata.id)}
                    {@const IconComponent = getAssetIcon(asset.metadata.type)}
                    {@const isSelected = selectedAssets.some(a => a.metadata.id === asset.metadata.id)}
                    
                    <div 
                        class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                        class:bg-primary-10={isSelected}
                        onclick={(e) => handleAssetClick(asset, e)}
                        ondblclick={() => handleAssetDoubleClick(asset)}
                    >
                        <IconComponent class="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-foreground truncate">
                                {asset.metadata.name}
                            </p>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {asset.metadata.fileType.toUpperCase()}
                        </Badge>
                        <span class="text-xs text-muted-foreground w-16 text-right">
                            {formatFileSize(asset.metadata.size)}
                        </span>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild let:builder>
                                <Button builders={[builder]} variant="ghost" size="sm" class="h-6 w-6 p-0">
                                    <MoreHorizontal class="w-3 h-3" />
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                                <DropdownMenu.Item onclick={() => handleDownloadAsset(asset)}>
                                    <Download class="w-4 h-4 mr-2" />
                                    Download
                                </DropdownMenu.Item>
                                <DropdownMenu.Item onclick={() => assetStore.removeAsset(asset.metadata.id)}>
                                    <Trash2 class="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Drag overlay -->
    {#if dragOver}
        <div class="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50">
            <div class="text-center">
                <Upload class="w-12 h-12 mx-auto mb-2 text-primary" />
                <p class="text-lg font-medium text-primary">Drop files to upload</p>
            </div>
        </div>
    {/if}
</div>

<!-- Hidden file input -->
<input
    bind:this={uploadInput}
    type="file"
    multiple
    accept=".gltf,.glb,.obj,.fbx,.png,.jpg,.jpeg,.gif,.mp3,.wav,.ogg"
    onchange={(e) => {
        const files = e.target?.files;
        if (files) handleFileUpload(files);
    }}
    class="hidden"
/>