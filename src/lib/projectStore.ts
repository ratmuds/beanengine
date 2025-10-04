import { writable } from "svelte/store";
import { projects, type Project } from "./supabase";
import { sceneStore } from "./sceneStore";
import { authStore } from "./authStore";
import { get } from "svelte/store";

interface ProjectState {
    projects: Project[];
    currentProject: Project | null;
    loading: boolean;
    error: string | null;
    projectName?: string;
}

const initialState: ProjectState = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    projectName: "Untitled",
};

function createProjectStore() {
    const { subscribe, set, update } = writable<ProjectState>(initialState);

    return {
        subscribe,

        // Load all projects for the current user
        loadProjects: async () => {
            update((state) => ({ ...state, loading: true, error: null }));

            try {
                const { data, error } = await projects.getAll();

                if (error) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: error.message,
                    }));
                    return { error };
                }

                update((state) => ({
                    ...state,
                    projects: data || [],
                    loading: false,
                }));

                return { data, error: null };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                update((state) => ({
                    ...state,
                    loading: false,
                    error: errorMessage,
                }));
                return { error: { message: errorMessage } };
            }
        },

        // Create a new project
        createProject: async (name: string) => {
            update((state) => ({ ...state, loading: true, error: null }));

            try {
                const { data, error } = await projects.create(name, {
                    objects: [],
                    variables: [],
                });

                if (error) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: error.message,
                    }));
                    return { error };
                }

                update((state) => ({
                    ...state,
                    projects: [data, ...state.projects],
                    currentProject: data,
                    loading: false,
                }));

                return { data, error: null };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                update((state) => ({
                    ...state,
                    loading: false,
                    error: errorMessage,
                }));
                return { error: { message: errorMessage } };
            }
        },

        // Save current project
        saveProject: async (projectId?: string | number, name?: string) => {
            update((state) => ({ ...state, loading: true, error: null }));

            try {
                const currentState = get({ subscribe });

                // Normalize projectId to string for comparison
                const normalizedId = projectId?.toString();

                // Find the target project:
                // 1. If projectId is provided, try to find it in the projects array
                // 2. If not found in array but matches currentProject, use currentProject
                // 3. Otherwise fall back to currentProject if no projectId provided
                let targetProject = normalizedId
                    ? currentState.projects.find(
                          (p) => p.id.toString() === normalizedId
                      )
                    : null;

                // If not found in array, check if it matches currentProject
                if (
                    !targetProject &&
                    normalizedId &&
                    currentState.currentProject?.id.toString() === normalizedId
                ) {
                    targetProject = currentState.currentProject;
                }

                // If still no target and no projectId specified, use currentProject
                if (!targetProject && !normalizedId) {
                    targetProject = currentState.currentProject;
                }

                if (!targetProject) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: "No project selected",
                    }));
                    return { error: { message: "No project selected" } };
                }

                // Get current scene data
                const sceneData = sceneStore.serialize();
                const projectName = name || targetProject.name;

                const { data, error } = await projects.update(
                    targetProject.id,
                    projectName,
                    sceneData
                );

                if (error) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: error.message,
                    }));
                    return { error };
                }

                update((state) => ({
                    ...state,
                    projects: state.projects.map((p) =>
                        p.id === data.id ? data : p
                    ),
                    currentProject:
                        state.currentProject?.id === data.id
                            ? data
                            : state.currentProject,
                    loading: false,
                }));

                return { data, error: null };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                update((state) => ({
                    ...state,
                    loading: false,
                    error: errorMessage,
                }));
                return { error: { message: errorMessage } };
            }
        },

        // Load a project into the scene
        loadProject: async (projectId: string) => {
            update((state) => ({ ...state, loading: true, error: null }));

            try {
                const { data, error } = await projects.getById(projectId);

                if (error) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: error.message,
                    }));
                    return { error };
                }

                // Set name
                if (data) {
                    set({ ...initialState, projectName: data.name });
                }

                // Load the project data into the scene
                sceneStore.deserialize(data.data);

                update((state) => ({
                    ...state,
                    currentProject: data,
                    loading: false,
                }));

                return { data, error: null };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                update((state) => ({
                    ...state,
                    loading: false,
                    error: errorMessage,
                }));
                return { error: { message: errorMessage } };
            }
        },

        // Delete a project
        deleteProject: async (projectId: string) => {
            update((state) => ({ ...state, loading: true, error: null }));

            try {
                const { error } = await projects.delete(projectId);

                if (error) {
                    update((state) => ({
                        ...state,
                        loading: false,
                        error: error.message,
                    }));
                    return { error };
                }

                update((state) => ({
                    ...state,
                    projects: state.projects.filter((p) => p.id !== projectId),
                    currentProject:
                        state.currentProject?.id === projectId
                            ? null
                            : state.currentProject,
                    loading: false,
                }));

                return { error: null };
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                update((state) => ({
                    ...state,
                    loading: false,
                    error: errorMessage,
                }));
                return { error: { message: errorMessage } };
            }
        },

        // Set current project
        setCurrentProject: (project: Project | null) => {
            update((state) => ({ ...state, currentProject: project }));
        },

        // Clear error
        clearError: () => {
            update((state) => ({ ...state, error: null }));
        },
    };
}

export const projectStore = createProjectStore();
