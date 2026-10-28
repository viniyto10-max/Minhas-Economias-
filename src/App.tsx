/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { useLayoutEffect, useRef, lazy, Suspense } from 'react';
import BottomNav from './components/common/BottomNav';
import { ScreenHeader } from './components/common/ScreenHeader';
import { ReceiptText, Plus, PieChart, BarChart3, Settings } from 'lucide-react';

import { MonthProvider } from './components/common/MonthContext';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import LoginScreen from './components/auth/LoginScreen';
import { supabaseConfigured } from './lib/supabase';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { lazyWithRetry } from './lib/lazyWithRetry';

const Home = lazyWithRetry(() => import('./pages/Home'));
const Lancamentos = lazyWithRetry(() => import('./pages/Lancamentos'));
const Categorias = lazyWithRetry(() => import('./pages/Categorias'));
const Analises = lazyWithRetry(() => import('./pages/Analises'));
const NovoLancamento = lazyWithRetry(() => import('./pages/NovoLancamento'));
const Configuracoes = lazyWithRetry(() => import('./pages/Configuracoes'));
const Privacidade = lazyWithRetry(() => import('./pages/Privacidade'));
const Termos = lazyWithRetry(() => import('./pages/Termos'));

function PageFallback() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-36 bg-[var(--bg-card)] rounded-2xl w-full" />
      <div className="h-24 bg-[var(--bg-card)] rounded-2xl w-full" />
      <div className="h-48 bg-[var(--bg-card)] rounded-2xl w-full" />
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-secondary)]">Carregando sua conta...</div>;
  if (!user || !supabaseConfigured) return <LoginScreen />;
  return <AppLayout onSignOut={signOut} userEmail={user.email ?? ''} userName={String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Minha conta')} avatarUrl={String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '')} />;
}

function AppLayout({ onSignOut, userEmail, userName, avatarUrl }: { onSignOut: () => Promise<void>; userEmail: string; userName: string; avatarUrl: string }) {
  const location = useLocation();
  const path = location.pathname;
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Ao montar o app e ao trocar de tela, forçar scrollLeft = 0 no shell, no <main> e no document.scrollingElement
  useLayoutEffect(() => {
    if (shellRef.current) shellRef.current.scrollLeft = 0;
    if (mainRef.current) mainRef.current.scrollLeft = 0;
    if (document.scrollingElement) document.scrollingElement.scrollLeft = 0;
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  }, [path]);

  let headerConfig = null;
  if (path === '/lancamentos') {
    headerConfig = <ScreenHeader icon={<ReceiptText />} title="Lançamentos" subtitle="Todas as movimentações do mês" />;
  } else if (path === '/novo') {
    headerConfig = <ScreenHeader icon={<Plus />} title="Novo Lançamento" subtitle="Registre uma entrada ou saída" />;
  } else if (path === '/categorias') {
    headerConfig = <ScreenHeader icon={<PieChart />} title="Categorias" subtitle="Para onde seu dinheiro está indo" />;
  } else if (path === '/analises') {
    headerConfig = <ScreenHeader icon={<BarChart3 />} title="Análises" subtitle="Evolução das suas finanças" />;
  } else if (path === '/configuracoes') {
    headerConfig = <ScreenHeader icon={<Settings />} title="Configurações" subtitle="Conta, cadastros e dados" />;
  }

  return (
    <MonthProvider>
      <div
        ref={shellRef}
        className="app-shell flex h-[100dvh] w-full flex-col bg-[var(--bg-app)] overflow-hidden"
      >
        <div className="shrink-0 z-40 w-full">
          {headerConfig}
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[var(--bg-card)] border-b border-[var(--border)]">
            <Link
              to="/configuracoes"
              className="flex items-center gap-2 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer group"
              title="Abrir configurações"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover group-hover:ring-2 group-hover:ring-[var(--primary)] transition-all"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold group-hover:ring-2 group-hover:ring-[var(--primary)] transition-all">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate group-hover:text-[var(--primary)] transition-colors">
                  {userName}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">{userEmail}</p>
              </div>
            </Link>
            <button onClick={() => void onSignOut()} className="text-xs font-semibold text-[var(--primary)] cursor-pointer">Sair</button>
          </div>
        </div>
        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden app-content w-full"
        >
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/analises" element={<Analises />} />
              <Route path="/novo" element={<NovoLancamento />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </Suspense>
        </main>
        <BottomNav />
      </div>
    </MonthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Rotas públicas (acessíveis sem login) */}
              <Route path="/privacidade" element={<Privacidade />} />
              <Route path="/termos" element={<Termos />} />

              {/* Rotas autenticadas */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
