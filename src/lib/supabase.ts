import { createClient } from "@supabase/supabase-js";
import {
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
);

// Database types
export interface Project {
    id: string;
    name: string;
    data: any; // JSON field for scene data
    created_at: string;
    updated_at: string;
    owner: string;
}

// Auth helpers
export const auth = {
    // Sign up with email and password
    signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { data, error };
    },

    // Sign in with email and password
    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    // Sign out
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // Get current user
    getUser: async () => {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();
        return { user, error };
    },

    // Get current session
    getSession: async () => {
        const {
            data: { session },
            error,
        } = await supabase.auth.getSession();
        return { session, error };
    },
};

// Project helpers
export const projects = {
    // Get all projects for the current user
    getAll: async () => {
        const { data, error } = await supabase.from("projects").select("*");
        //.order("updated_at", { ascending: false });
        return { data, error };
    },

    // Get a specific project by ID
    getById: async (id: string) => {
        const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", id)
            .single();
        return { data, error };
    },

    // Create a new project
    create: async (name: string, data: any) => {
        const { data: project, error } = await supabase
            .from("projects")
            .insert({
                name,
                data,
                owner: (await auth.getUser()).user?.id || "",
            })
            .select()
            .single();
        return { data: project, error };
    },

    // Update an existing project
    update: async (id: string, name: string, data: any) => {
        const { data: project, error } = await supabase
            .from("projects")
            .update({
                name,
                data,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();
        return { data: project, error };
    },

    // Delete a project
    delete: async (id: string) => {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        return { error };
    },
};
