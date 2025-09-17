import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, auth } from './supabase';
import { browser } from '$app/environment';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    // Initialize auth state
    init: async () => {
      if (!browser) return;

      try {
        // Get initial session
        const { session } = await auth.getSession();
        
        set({
          user: session?.user ?? null,
          session,
          loading: false,
        });

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          
          set({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        set({
          user: null,
          session: null,
          loading: false,
        });
      }
    },

    // Sign in
    signIn: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true }));
      
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        update(state => ({ ...state, loading: false }));
        return { error };
      }
      
      return { data, error: null };
    },

    // Sign up
    signUp: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true }));
      
      const { data, error } = await auth.signUp(email, password);
      
      if (error) {
        update(state => ({ ...state, loading: false }));
        return { error };
      }
      
      return { data, error: null };
    },

    // Sign out
    signOut: async () => {
      update(state => ({ ...state, loading: true }));
      
      const { error } = await auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        update(state => ({ ...state, loading: false }));
        return { error };
      }
      
      return { error: null };
    },

    // Check if user is authenticated
    isAuthenticated: () => {
      let isAuth = false;
      subscribe(state => {
        isAuth = !!state.user && !state.loading;
      })();
      return isAuth;
    },
  };
}

export const authStore = createAuthStore();

// Initialize auth store when module loads
if (browser) {
  authStore.init();
}