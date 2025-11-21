import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,
  
  initialize: async () => {
    set({ loading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        set({ 
          user: session.user,
          session,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ loading: false, initialized: true });
    }
    
    // Setup auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      set({ 
        user: session?.user || null,
        session
      });
    });
  },
  
  signIn: async (email: string, password: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      set({ 
        user: data.user,
        session: data.session
      });
      
      toast.success('Login realizado com sucesso!');
      
      // Force page reload to ensure proper navigation
      window.location.href = '/';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(errorMessage);
      console.error('Sign in error:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  signUp: async (email: string, password: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      toast.success('Cadastro realizado! Verifique seu e-mail para confirmar.');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      toast.error(errorMessage);
      console.error('Sign up error:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  signOut: async () => {
    set({ loading: true });
    
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
      toast.success('Logout realizado com sucesso!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer logout';
      toast.error(errorMessage);
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  }
}));