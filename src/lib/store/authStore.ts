import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

const GUEST_STORAGE_KEY = 'meuhub_guest_user_session';
const DEFAULT_USER_ID = 'c72212e7-2b6a-4da7-8745-01eb33414af4';

const createGuestUser = (): User => ({
  id: DEFAULT_USER_ID,
  app_metadata: {},
  user_metadata: { name: 'Usuário Workspace' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'usuario@meuhub.local'
});

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => void;
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
      // Fast check if guest session was active
      const isGuest = localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
      if (isGuest) {
        const guest = createGuestUser();
        set({ user: guest, initialized: true, loading: false });
        return;
      }

      // Check supabase session with a guaranteed 1500ms timeout race to prevent infinite hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 1500)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (session) {
        set({ 
          user: session.user,
          session,
        });
      } else {
        // If not authenticated in preview, automatically enable workspace guest mode
        const guest = createGuestUser();
        localStorage.setItem(GUEST_STORAGE_KEY, 'true');
        set({
          user: guest,
          session: null
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      const guest = createGuestUser();
      set({ user: guest });
    } finally {
      set({ loading: false, initialized: true });
    }
    
    // Setup auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        set({ 
          user: session.user,
          session
        });
      }
    });
  },
  
  signInAsGuest: () => {
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    const guest = createGuestUser();
    set({ user: guest, session: null, initialized: true });
    toast.success('Workspace aberto com sucesso!');
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      localStorage.removeItem(GUEST_STORAGE_KEY);
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
      localStorage.removeItem(GUEST_STORAGE_KEY);
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
