import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

const GUEST_STORAGE_KEY = 'meuhub_guest_user_session';
const AUTH_USER_CACHE_KEY = 'meuhub_auth_user_cache';
const DEFAULT_USER_ID = 'c72212e7-2b6a-4da7-8745-01eb33414af4';

const createGuestUser = (): User => ({
  id: DEFAULT_USER_ID,
  app_metadata: {},
  user_metadata: { name: 'Usuário Workspace' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'usuario@meuhub.local'
});

function getInitialCachedUser(): User | null {
  try {
    if (typeof window === 'undefined') return null;
    const isGuest = localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
    if (isGuest) return createGuestUser();
    
    const cached = localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as User;
    }
  } catch (e) {
    console.debug('Failed to read initial cached auth user', e);
  }
  return null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isAnonymous: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<boolean>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

const initialCachedUser = getInitialCachedUser();

let isAuthListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialCachedUser,
  session: null,
  loading: false,
  initialized: initialCachedUser !== null,
  isAnonymous: initialCachedUser ? (Boolean((initialCachedUser as { is_anonymous?: boolean }).is_anonymous) || initialCachedUser.email === 'usuario@meuhub.local') : false,
  
  initialize: async () => {
    // Only set loading if we don't have any cached user to prevent UI flickers
    if (!get().user) {
      set({ loading: true });
    }
    
    try {
      // 1. Check supabase session with timeout race
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 2500)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (session?.user) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        try {
          localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(session.user));
        } catch {
          // ignore
        }
        
        const currentUser = get().user;
        const isAnon = Boolean((session.user as { is_anonymous?: boolean }).is_anonymous);
        if (!currentUser || currentUser.id !== session.user.id || currentUser.email !== session.user.email) {
          set({ user: session.user, session, isAnonymous: isAnon, initialized: true, loading: false });
        } else {
          set({ session, isAnonymous: isAnon, initialized: true, loading: false });
        }

        // Migrate any local IndexedDB notes to this authenticated user
        try {
          const { useNoteStore } = await import('@/lib/store/noteStore');
          await useNoteStore.getState().migrateLocalNotesToUser(session.user.id);
        } catch (migErr) {
          console.debug('[AuthStore] Note migration check on init:', migErr);
        }
        return;
      }

      // 2. Check if guest session was active or auto-access is needed
      const isGuest = localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
      if (isGuest) {
        // Attempt real Supabase anonymous sign-in to obtain genuine JWT and auth.uid()
        const signedIn = await get().signInAnonymously();
        if (!signedIn) {
          // Fallback guest user was already set in signInAnonymously if provider was disabled
        }
        return;
      }

      // If no active session found and not guest, keep cached user if present to prevent kick-out
      if (!isGuest && !get().user) {
        localStorage.removeItem(AUTH_USER_CACHE_KEY);
        set({ user: null, session: null, isAnonymous: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      if (!get().user) {
        set({ user: null, session: null, isAnonymous: false });
      }
    } finally {
      set({ loading: false, initialized: true });
    }
    
    // Register singleton auth listener
    if (!isAuthListenerRegistered) {
      isAuthListenerRegistered = true;
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.debug(`[AuthStore] Event: ${event} | User: ${session?.user?.email || session?.user?.id || 'None'}`);

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(AUTH_USER_CACHE_KEY);
          set({ user: null, session: null, isAnonymous: false });
          return;
        }

        if (session?.user) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          try {
            localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(session.user));
          } catch {
            // ignore
          }

          const currentUser = get().user;
          const isAnon = Boolean((session.user as { is_anonymous?: boolean }).is_anonymous);
          if (!currentUser || currentUser.id !== session.user.id || currentUser.email !== session.user.email) {
            console.log(`[AuthStore Audit] User reference updated for new identity: ${session.user.email || session.user.id}`);
            set({ 
              user: session.user, 
              session,
              isAnonymous: isAnon
            });

            // Automatically migrate local IndexedDB notes to the newly active user
            try {
              const { useNoteStore } = await import('@/lib/store/noteStore');
              await useNoteStore.getState().migrateLocalNotesToUser(session.user.id);
            } catch (migErr) {
              console.debug('[AuthStore] Note migration on auth change:', migErr);
            }
          } else {
            console.log(`[AuthStore Audit] ${event}: User identity unchanged. Preserving session.`);
            set({ session, isAnonymous: isAnon });
          }
        }
      });
    }
  },

  signInAnonymously: async (): Promise<boolean> => {
    set({ loading: true });
    try {
      console.log('[AuthStore] Solicitando Supabase signInAnonymously() com emissão de JWT real...');
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        const errObj = error as { code?: string; status?: number; message?: string };
        const isProviderDisabled = errObj.code === 'anonymous_provider_disabled' || 
                                   String(errObj.message).includes('disabled') || 
                                   errObj.status === 422;

        if (isProviderDisabled) {
          console.warn('[AuthStore] Anonymous sign-ins está desativado no painel do Supabase. Operando em modo offline/local com resiliência.');
          localStorage.setItem(GUEST_STORAGE_KEY, 'true');
          const guest = createGuestUser();
          set({ user: guest, session: null, isAnonymous: true, initialized: true, loading: false });
          toast.info('Modo Local ativo. (Para sincronização em nuvem, habilite Anonymous Sign-ins no painel do Supabase).');
          return false;
        }

        throw error;
      }

      if (data.session && data.user) {
        console.log(`[AuthStore] Autenticação anônima concedida com sucesso! UID: ${data.user.id}`);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        try {
          localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(data.user));
        } catch {
          // ignore
        }

        set({
          user: data.user,
          session: data.session,
          isAnonymous: true,
          initialized: true,
          loading: false
        });

        toast.success('Workspace anônimo autenticado com Supabase!');

        // Migrar notas do IndexedDB imediatamente para o novo UID real
        try {
          const { useNoteStore } = await import('@/lib/store/noteStore');
          await useNoteStore.getState().migrateLocalNotesToUser(data.user.id);
        } catch (migErr) {
          console.warn('[AuthStore] Erro ao migrar notas após anonymous login:', migErr);
        }

        return true;
      }

      return false;
    } catch (err) {
      console.error('[AuthStore] Erro ao executar signInAnonymously:', err);
      // Fallback gracioso para modo convidado local
      localStorage.setItem(GUEST_STORAGE_KEY, 'true');
      const guest = createGuestUser();
      set({ user: guest, session: null, isAnonymous: true, initialized: true, loading: false });
      toast.error('Erro na autenticação anônima do Supabase. Iniciando em modo local.');
      return false;
    } finally {
      set({ loading: false });
    }
  },
  
  signInAsGuest: async () => {
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
    
    // Tenta primeiro autenticação anônima oficial do Supabase para ter JWT e RLS funcional
    const ok = await get().signInAnonymously();
    if (!ok && !get().user) {
      const guest = createGuestUser();
      set({ user: guest, session: null, isAnonymous: true, initialized: true, loading: false });
      toast.success('Workspace aberto com sucesso!');
    }
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
      if (data.user) {
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(data.user));
      }
      set({ 
        user: data.user,
        session: data.session,
        initialized: true
      });
      
      toast.success('Login realizado com sucesso!');
      
      // Navigate cleanly without harsh page reload
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
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
      await supabase.auth.signOut();
      set({ user: null, session: null });
      toast.success('Logout realizado com sucesso!');
      
      // Clear memory & redirect to login
      window.location.href = '/';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer logout';
      toast.error(errorMessage);
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  }
}));
