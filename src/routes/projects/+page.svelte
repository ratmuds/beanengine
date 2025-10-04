<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { authStore } from "$lib/authStore";
    import { projectStore } from "$lib/projectStore";
    import { sceneStore } from "$lib/sceneStore";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Badge } from "$lib/components/ui/badge";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Dialog from "$lib/components/ui/dialog";
    import {
        Plus,
        Search,
        Filter,
        Trash2,
        Edit,
        FolderOpen,
        Save,
        Home,
        User,
        LogOut,
        Calendar,
        Clock,
        MoreHorizontal,
        Folder,
    } from "lucide-svelte";

    let showCreateDialog = $state(false);
    let newProjectName = $state("");
    let editingProject: string | null = $state(null);
    let editingName = $state("");
    let searchQuery = $state("");
    let selectedProjects = $state<any[]>([]);

    // Filtered projects based on search
    let filteredProjects = $derived(
        $projectStore.projects.filter((project) => {
            if (
                searchQuery &&
                !project.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
                return false;
            }
            return true;
        })
    );

    onMount(async () => {
        // Redirect if not authenticated
        if (!$authStore.user) {
            goto("/login");
            return;
        }

        // Load projects
        await projectStore.loadProjects();
    });

    async function createProject() {
        if (!newProjectName.trim()) return;

        const result = await projectStore.createProject(newProjectName.trim());

        if (!result.error) {
            showCreateDialog = false;
            newProjectName = "";
        }
    }

    async function loadProject(projectId: string) {
        // Navigate to editor
        goto(`/editor/${projectId}`);
    }

    async function deleteProject(projectId: string) {
        if (
            confirm(
                "Are you sure you want to delete this project? This action cannot be undone."
            )
        ) {
            await projectStore.deleteProject(projectId);
        }
    }

    async function startEditing(project: any) {
        editingProject = project.id;
        editingName = project.name;
    }

    async function saveEdit() {
        if (!editingProject || !editingName.trim()) return;

        await projectStore.saveProject(editingProject, editingName.trim());
        editingProject = null;
        editingName = "";
    }

    function cancelEdit() {
        editingProject = null;
        editingName = "";
    }

    async function signOut() {
        await authStore.signOut();
        goto("/login");
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Project selection
    const handleProjectClick = (project: any, event: MouseEvent) => {
        const multiSelect = event.ctrlKey || event.metaKey;

        if (multiSelect) {
            const index = selectedProjects.findIndex(
                (p) => p.id === project.id
            );
            if (index >= 0) {
                selectedProjects = selectedProjects.filter(
                    (_, i) => i !== index
                );
            } else {
                selectedProjects = [...selectedProjects, project];
            }
        } else {
            selectedProjects = [project];
        }
    };

    const handleSearchInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        searchQuery = target.value;
    };

    const handleDeleteSelected = async () => {
        for (const project of selectedProjects) {
            await projectStore.deleteProject(project.id);
        }
        selectedProjects = [];
    };
</script>

<svelte:head>
    <title>Projects - Bean Engine</title>
</svelte:head>

<div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border bg-card/60 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <Folder class="w-6 h-6 text-primary" />
                    <h1 class="text-2xl font-bold text-foreground">Projects</h1>
                </div>
                <div class="flex items-center gap-4">
                    <div
                        class="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        <User class="w-4 h-4" />
                        <span>{$authStore.user?.email}</span>
                    </div>
                    <Button variant="outline" size="sm" onclick={signOut}>
                        <LogOut class="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-6 py-6">
        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <Button onclick={() => (showCreateDialog = true)}>
                    <Plus class="w-4 h-4 mr-2" />
                    New Project
                </Button>
                <Button variant="outline" onclick={() => goto("/")}>
                    <Home class="w-4 h-4 mr-2" />
                    Back to Editor
                </Button>
            </div>
        </div>

        <!-- Search and Filter Bar -->
        <div
            class="bg-card/60 backdrop-blur-sm border border-border/30 rounded-lg p-4 mb-6"
        >
            <div class="flex items-center justify-between mb-3">
                <h2
                    class="text-lg font-semibold text-foreground flex items-center gap-2"
                >
                    <FolderOpen class="w-5 h-5" />
                    Project Library
                </h2>
            </div>

            <div class="flex items-center gap-3 mb-3">
                <div class="relative flex-1 max-w-md">
                    <Search
                        class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        oninput={handleSearchInput}
                        class="pl-10 h-9"
                    />
                </div>
            </div>

            <div
                class="flex items-center justify-between text-sm text-muted-foreground"
            >
                <div class="flex items-center gap-4">
                    <span>{filteredProjects.length} projects</span>
                </div>

                {#if selectedProjects.length > 0}
                    <div class="flex items-center gap-2">
                        <span>{selectedProjects.length} selected</span>
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

        {#if $projectStore.loading}
            <div class="flex items-center justify-center py-16">
                <div class="text-center">
                    <div
                        class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
                    ></div>
                    <p class="text-muted-foreground">Loading projects...</p>
                </div>
            </div>
        {:else if $projectStore.error}
            <div class="flex items-center justify-center py-16">
                <div class="text-center">
                    <div
                        class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <Trash2 class="w-8 h-8 text-destructive" />
                    </div>
                    <h3 class="text-lg font-medium text-foreground mb-2">
                        Error Loading Projects
                    </h3>
                    <p class="text-muted-foreground mb-4">
                        {$projectStore.error}
                    </p>
                    <Button onclick={() => projectStore.loadProjects()}>
                        Retry
                    </Button>
                </div>
            </div>
        {:else if filteredProjects.length === 0}
            <div class="flex items-center justify-center py-16">
                <div class="text-center">
                    {#if $projectStore.projects.length === 0}
                        <div
                            class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <Folder class="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 class="text-lg font-medium text-foreground mb-2">
                            No Projects Yet
                        </h3>
                        <p class="text-muted-foreground mb-4">
                            Create your first project to get started with Bean
                            Engine.
                        </p>
                        <Button onclick={() => (showCreateDialog = true)}>
                            <Plus class="w-4 h-4 mr-2" />
                            Create First Project
                        </Button>
                    {:else}
                        <div
                            class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                            <Search class="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 class="text-lg font-medium text-foreground mb-2">
                            No Results
                        </h3>
                        <p class="text-muted-foreground">
                            Try adjusting your search query
                        </p>
                    {/if}
                </div>
            </div>
        {:else}
            <!-- Projects Grid -->
            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {#each filteredProjects as project (project.id)}
                    {@const isSelected = selectedProjects.some(
                        (p) => p.id === project.id
                    )}
                    {@const isCurrent =
                        $projectStore.currentProject?.id === project.id}

                    <div
                        class="group relative bg-card border border-border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                        class:ring-2={isSelected}
                        class:ring-primary={isSelected}
                        class:border-primary={isCurrent}
                        class:shadow-md={isCurrent}
                        onclick={(e) => handleProjectClick(project, e)}
                        ondblclick={() => loadProject(project.id)}
                    >
                        <!-- Project Preview -->
                        <div
                            class="aspect-video bg-muted rounded-md mb-3 overflow-hidden relative flex items-center justify-center"
                        >
                            <div class="text-center">
                                <Folder
                                    class="w-12 h-12 text-muted-foreground mx-auto mb-2"
                                />
                                <div class="text-xs text-muted-foreground">
                                    Project
                                </div>
                            </div>

                            {#if isCurrent}
                                <div class="absolute top-2 left-2">
                                    <Badge variant="default" class="text-xs">
                                        Current
                                    </Badge>
                                </div>
                            {/if}
                        </div>

                        <!-- Project Info -->
                        <div class="space-y-2">
                            {#if editingProject === project.id}
                                <Input
                                    bind:value={editingName}
                                    onkeydown={(e) =>
                                        e.key === "Enter" && saveEdit()}
                                    onblur={saveEdit}
                                    class="h-8 font-medium"
                                    autofocus
                                />
                            {:else}
                                <h3
                                    class="font-medium text-foreground truncate"
                                    title={project.name}
                                >
                                    {project.name}
                                </h3>
                            {/if}

                            <div
                                class="space-y-1 text-xs text-muted-foreground"
                            >
                                <div class="flex items-center gap-1">
                                    <Clock class="w-3 h-3" />
                                    <span
                                        >Updated {formatDate(
                                            project.updated_at
                                        )}</span
                                    >
                                </div>
                                <div class="flex items-center gap-1">
                                    <Calendar class="w-3 h-3" />
                                    <span
                                        >Created {formatDate(
                                            project.created_at
                                        )}</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="mt-4 flex items-center justify-between">
                            <Button
                                size="sm"
                                onclick={() => loadProject(project.id)}
                                class="flex-1 mr-2"
                            >
                                <FolderOpen class="w-4 h-4 mr-1" />
                                Load
                            </Button>

                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="h-8 w-8 p-0"
                                    >
                                        <MoreHorizontal class="w-4 h-4" />
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    {#if editingProject === project.id}
                                        <DropdownMenu.Item onclick={saveEdit}>
                                            <Edit class="w-4 h-4 mr-2" />
                                            Save
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item onclick={cancelEdit}>
                                            Cancel
                                        </DropdownMenu.Item>
                                    {:else}
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                startEditing(project)}
                                        >
                                            <Edit class="w-4 h-4 mr-2" />
                                            Rename
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                deleteProject(project.id)}
                                            class="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 class="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenu.Item>
                                    {/if}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Create Project Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Create New Project</Dialog.Title>
            <Dialog.Description>
                Create a new project to start building your game.
            </Dialog.Description>
        </Dialog.Header>

        <form
            onsubmit={(e) => {
                e.preventDefault();
                createProject();
            }}
            class="space-y-4"
        >
            <div class="space-y-2">
                <label for="projectName" class="text-sm font-medium"
                    >Project Name</label
                >
                <Input
                    id="projectName"
                    placeholder="Enter project name..."
                    bind:value={newProjectName}
                    required
                    autofocus
                />
            </div>

            <Dialog.Footer>
                <Button
                    type="button"
                    variant="outline"
                    onclick={() => (showCreateDialog = false)}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={!newProjectName.trim() || $projectStore.loading}
                >
                    {#if $projectStore.loading}
                        <div
                            class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
                        ></div>
                        Creating...
                    {:else}
                        <Plus class="w-4 h-4 mr-2" />
                        Create Project
                    {/if}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
