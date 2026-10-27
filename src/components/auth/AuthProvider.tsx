import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../../lib/supabase';

type AuthContextValue = { 
  session: Session | null; 
  user: User | null; 
  loading: boolean; 
  signInWithGoogle: () => Promise<void>; 
  signOut: () => Promise<void> 
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const performSignOut = async () => {
    if (!supabase) return;
    
    // Limpeza de estado em memória e localStorage
    localStorage.removeItem('minhas_economias_ultimo_responsavel_' + session?.user?.id);
    
    // Limpar caches (exceto o do app - manter 'pwa-')
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (!key.startsWith('pwa-')) {
          await caches.delete(key);
        }
      }
    }
    
    await supabase.auth.signOut();
    setSession(null);
  };

  useEffect(() => {
    if (!supabaseConfigured || !supabase) { setLoading(false); return; }
    
    supabase.auth.getSession().then(({ data }) => { 
      setSession(data.session); 
      setLoading(false); 
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !nextSession) {
        if (session) {
          alert('Sua sessão expirou. Entre novamente.');
          await performSignOut();
        }
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, [session]);

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin } 
    });
    if (error) throw new Error('Não foi possível iniciar o login: ' + error.message);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signOut: performSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return value;
}
