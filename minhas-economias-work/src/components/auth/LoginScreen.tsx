import { useState } from 'react';
import { Wallet, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabaseConfigured } from '../../lib/supabase';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const handleLogin = async () => {
    setError(''); setBusy(true);
    try { await signInWithGoogle(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar o login Google.'); setBusy(false); }
  };
  return <main className="min-h-[100dvh] flex items-center justify-center p-5 bg-[var(--bg-app)] text-[var(--text-primary)]">
    <section className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-xl text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"><Wallet size={32}/></div>
      <h1 className="text-2xl font-bold">Minhas Economias</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--text-secondary)]">Entre com sua conta Google para acessar seus dados financeiros privados.</p>
      {!supabaseConfigured && <p className="mb-4 rounded-xl bg-amber-500/10 p-3 text-left text-sm text-amber-700">Falta configurar as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na hospedagem.</p>}
      <button disabled={!supabaseConfigured || busy} onClick={handleLogin} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] font-semibold text-white disabled:opacity-50"><LogIn size={18}/>{busy ? 'Redirecionando...' : 'Continuar com Google'}</button>
      {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]"><ShieldCheck size={14}/> Seus dados são isolados por usuário.</p>
    </section>
  </main>;
}
