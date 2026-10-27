import { useState } from 'react';
import { Wallet, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabaseConfigured, isInvalidSupabaseUrl } from '../../lib/supabase';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar o login Google.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-5 bg-[var(--bg-app)] text-[var(--text-primary)]">
      <section className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-7 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
          <Wallet size={32} />
        </div>
        <h1 className="text-2xl font-bold">Minhas Economias</h1>
        <p className="mt-2 mb-6 text-sm text-[var(--text-secondary)]">
          Entre com sua conta Google para acessar seus dados financeiros privados.
        </p>

        {isInvalidSupabaseUrl && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-left text-xs text-red-600 dark:text-red-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle size={14} className="shrink-0" />
              <span>URL do Supabase incorreta</span>
            </div>
            <p>
              A variável <code className="bg-red-500/20 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> na Vercel foi preenchida com a URL da Vercel. Ela deve ser a <strong>Project URL</strong> do Supabase (ex: <code>https://xxxx.supabase.co</code>).
            </p>
          </div>
        )}

        {!supabaseConfigured && !isInvalidSupabaseUrl && (
          <p className="mb-4 rounded-xl bg-amber-500/10 p-3 text-left text-sm text-amber-700 dark:text-amber-400">
            Falta configurar as variáveis <code className="font-mono text-xs">VITE_SUPABASE_URL</code> e <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> na hospedagem.
          </p>
        )}

        <button
          disabled={!supabaseConfigured || busy}
          onClick={handleLogin}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
        >
          <LogIn size={18} />
          {busy ? 'Redirecionando...' : 'Continuar com Google'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {error}
          </p>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <ShieldCheck size={14} /> Seus dados são isolados por usuário.
        </p>
      </section>
    </main>
  );
}
