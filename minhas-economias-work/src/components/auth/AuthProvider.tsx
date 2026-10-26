import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../../lib/supabase';

type AuthContextValue = { session: Session | null; user: User | null; loading: boolean; signInWithGoogle: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabaseConfigured || !supabase) { setLoading(false); return; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase não está configurado. Confira as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw error;
  };
  const signOut = async () => { if (!supabase) return; const { error } = await supabase.auth.signOut(); if (error) throw error; };
  return <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return value;
}
