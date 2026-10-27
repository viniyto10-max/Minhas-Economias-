import { Link } from "react-router-dom";
import React, { useState } from 'react';
import { 
  User, 
  Users, 
  CreditCard, 
  Tag, 
  Palette, 
  Bell, 
  LogOut, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  AlertCircle,
  Database,
  Download,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthProvider';
import { useCadastros } from '../hooks/useCadastros';
import { useNotification } from '../hooks/useNotification';
import { ResponsavelAvatar } from '../components/common/ResponsavelAvatar';
import ThemeToggle from '../components/common/ThemeToggle';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { Responsavel, PaymentMethod, Category, TipoFormaPagamento } from '../types';

const CORES_PREDEFINIDAS = [
  { hex: '#10B981', label: 'Verde' },
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#8B5CF6', label: 'Roxo' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#F59E0B', label: 'Âmbar' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#06B6D4', label: 'Ciano' },
  { hex: '#64748B', label: 'Grafite' },
];

const TIPOS_PAGAMENTO: { id: TipoFormaPagamento; label: string }[] = [
  { id: 'cartao', label: 'Cartão de crédito' },
  { id: 'conta', label: 'Conta' },
  { id: 'pix', label: 'Pix' },
  { id: 'dinheiro', label: 'Dinheiro' },
];

export default function Configuracoes() {
  const { user, signOut } = useAuth();
  const {
    categorias,
    responsaveis,
    formasPagamento,
    loading: loadingCadastros,
    erro: erroCadastros,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
    criarResponsavel,
    atualizarResponsavel,
    excluirResponsavel,
    criarFormaPagamento,
    atualizarFormaPagamento,
    excluirFormaPagamento,
    atualizarProfile,
  } = useCadastros();

  const { permission, enabled: notifEnabled, toggleNotifications } = useNotification();

  // Estados de feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Seus Dados (Exportação CSV e Exclusão de Conta)
  const [isExporting, setIsExporting] = useState(false);
  const [modalExcluirConta, setModalExcluirConta] = useState(false);
  const [textoConfirmacaoConta, setTextoConfirmacaoConta] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 3500);
  };

  // Modais de Edição / Criação
  const [modalResponsavel, setModalResponsavel] = useState<{
    open: boolean;
    item?: Responsavel | null;
    nome: string;
    foto_url: string;
    erro?: string;
  }>({ open: false, nome: '', foto_url: '' });

  const [modalPagamento, setModalPagamento] = useState<{
    open: boolean;
    item?: PaymentMethod | null;
    nome: string;
    tipo: TipoFormaPagamento;
    cor: string;
    erro?: string;
  }>({ open: false, nome: '', tipo: 'cartao', cor: CORES_PREDEFINIDAS[0].hex });

  const [modalCategoria, setModalCategoria] = useState<{
    open: boolean;
    item?: Category | null;
    nome: string;
    erro?: string;
  }>({ open: false, nome: '' });

  // Confirmação de exclusão
  const [modalExclusao, setModalExclusao] = useState<{
    open: boolean;
    tipo: 'responsavel' | 'pagamento' | 'categoria';
    id: string;
    nome: string;
  } | null>(null);

  // Handlers - Exportar CSV
  const handleExportarCSV = async () => {
    if (!user || !supabase) return;
    setIsExporting(true);
    try {
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('transactions')
          .select(
            'data_hora, movimento, valor, descricao, confirmado, categories(name), responsaveis(nome), payment_methods(nome)'
          )
          .eq('user_id', user.id)
          .order('data_hora', { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allRows.length === 0) {
        showToast('Nenhum lançamento encontrado para exportar.', 'error');
        setIsExporting(false);
        return;
      }

      const sanitizeCSV = (text: string | null | undefined): string => {
        if (!text) return '';
        let str = String(text).trim();
        if (/^[=+\-@]/.test(str)) {
          str = "'" + str;
        }
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      const headers = [
        'data',
        'hora',
        'tipo',
        'valor',
        'categoria',
        'forma de pagamento',
        'responsável',
        'descrição',
        'confirmado',
      ].join(';');

      const csvLines = allRows.map((row) => {
        const dt = new Date(row.data_hora);
        const dataStr = !isNaN(dt.getTime()) ? format(dt, 'dd/MM/yyyy') : '';
        const horaStr = !isNaN(dt.getTime()) ? format(dt, 'HH:mm') : '';
        const tipoStr = sanitizeCSV(row.movimento);
        const valNum = Number(row.valor) || 0;
        const valStr = valNum.toFixed(2).replace('.', ',');
        const catStr = sanitizeCSV(row.categories?.name || '');
        const pagStr = sanitizeCSV(row.payment_methods?.nome || '');
        const respStr = sanitizeCSV(row.responsaveis?.nome || '');
        const descStr = sanitizeCSV(row.descricao || '');
        const confStr = row.confirmado ? 'Sim' : 'Não';

        return [
          dataStr,
          horaStr,
          tipoStr,
          valStr,
          catStr,
          pagStr,
          respStr,
          descStr,
          confStr,
        ].join(';');
      });

      const bom = '\uFEFF';
      const csvContent = bom + [headers, ...csvLines].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = format(new Date(), 'yyyy-MM-dd');
      link.href = url;
      link.setAttribute('download', `minhas-economias-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Dados exportados com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      showToast('Não foi possível exportar os dados.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handlers - Excluir Conta
  const handleExcluirConta = async () => {
    if (textoConfirmacaoConta.trim() !== 'EXCLUIR') return;
    setIsDeletingAccount(true);

    try {
      if (!supabase) throw new Error('Supabase indisponível.');

      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      // Preserva tema no localStorage se existir
      const themeKey = 'minhas-economias-theme';
      const savedTheme = localStorage.getItem(themeKey);

      localStorage.clear();
      if (savedTheme) {
        localStorage.setItem(themeKey, savedTheme);
      }

      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {
          console.error('Erro ao limpar cache:', e);
        }
      }

      await signOut();
      alert('Conta excluída');
      window.location.href = '/';
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      showToast(
        'Ocorreu um erro ao excluir a conta. Tente novamente ou entre em contato.',
        'error'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Handlers - Responsável
  const handleSalvarResponsavel = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = modalResponsavel.nome.trim();
    if (!nomeLimpo) {
      setModalResponsavel((prev) => ({ ...prev, erro: 'O nome é obrigatório.' }));
      return;
    }
    if (nomeLimpo.length > 80) {
      setModalResponsavel((prev) => ({ ...prev, erro: 'O nome deve ter até 80 caracteres.' }));
      return;
    }

    const duplicado = responsaveis.some(
      (r) =>
        r.id !== modalResponsavel.item?.id &&
        r.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (duplicado) {
      setModalResponsavel((prev) => ({
        ...prev,
        erro: 'Já existe um responsável cadastrado com este nome.',
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalResponsavel.item) {
        await atualizarResponsavel(modalResponsavel.item.id, {
          nome: nomeLimpo,
          foto_url: modalResponsavel.foto_url.trim() || null,
        });
        showToast('Responsável atualizado com sucesso.');
      } else {
        await criarResponsavel({
          nome: nomeLimpo,
          foto_url: modalResponsavel.foto_url.trim() || null,
        });
        showToast('Responsável adicionado com sucesso.');
      }
      setModalResponsavel({ open: false, nome: '', foto_url: '' });
    } catch (err) {
      setModalResponsavel((prev) => ({
        ...prev,
        erro: err instanceof Error ? err.message : 'Falha ao salvar responsável.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers - Forma de Pagamento
  const handleSalvarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = modalPagamento.nome.trim();
    if (!nomeLimpo) {
      setModalPagamento((prev) => ({ ...prev, erro: 'O nome é obrigatório.' }));
      return;
    }
    if (nomeLimpo.length > 80) {
      setModalPagamento((prev) => ({ ...prev, erro: 'O nome deve ter até 80 caracteres.' }));
      return;
    }

    const duplicado = formasPagamento.some(
      (f) =>
        f.id !== modalPagamento.item?.id &&
        f.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (duplicado) {
      setModalPagamento((prev) => ({
        ...prev,
        erro: 'Já existe uma forma de pagamento cadastrada com este nome.',
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalPagamento.item) {
        await atualizarFormaPagamento(modalPagamento.item.id, {
          nome: nomeLimpo,
          tipo: modalPagamento.tipo,
          cor: modalPagamento.cor,
        });
        showToast('Forma de pagamento atualizada com sucesso.');
      } else {
        await criarFormaPagamento({
          nome: nomeLimpo,
          tipo: modalPagamento.tipo,
          cor: modalPagamento.cor,
        });
        showToast('Forma de pagamento adicionada com sucesso.');
      }
      setModalPagamento({ open: false, nome: '', tipo: 'cartao', cor: CORES_PREDEFINIDAS[0].hex });
    } catch (err) {
      setModalPagamento((prev) => ({
        ...prev,
        erro: err instanceof Error ? err.message : 'Falha ao salvar forma de pagamento.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers - Categoria
  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = modalCategoria.nome.trim();
    if (!nomeLimpo) {
      setModalCategoria((prev) => ({ ...prev, erro: 'O nome é obrigatório.' }));
      return;
    }
    if (nomeLimpo.length > 80) {
      setModalCategoria((prev) => ({ ...prev, erro: 'O nome deve ter até 80 caracteres.' }));
      return;
    }

    const duplicado = categorias.some(
      (c) =>
        c.id !== modalCategoria.item?.id &&
        c.name.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (duplicado) {
      setModalCategoria((prev) => ({
        ...prev,
        erro: 'Já existe uma categoria cadastrada com este nome.',
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalCategoria.item) {
        await atualizarCategoria(modalCategoria.item.id, nomeLimpo);
        showToast('Categoria atualizada com sucesso.');
      } else {
        await criarCategoria(nomeLimpo);
        showToast('Categoria adicionada com sucesso.');
      }
      setModalCategoria({ open: false, nome: '' });
    } catch (err) {
      setModalCategoria((prev) => ({
        ...prev,
        erro: err instanceof Error ? err.message : 'Falha ao salvar categoria.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmação de exclusão
  const handleExecutarExclusao = async () => {
    if (!modalExclusao) return;
    setIsSubmitting(true);
    try {
      if (modalExclusao.tipo === 'responsavel') {
        await excluirResponsavel(modalExclusao.id);
        showToast(`Responsável "${modalExclusao.nome}" excluído.`);
      } else if (modalExclusao.tipo === 'pagamento') {
        await excluirFormaPagamento(modalExclusao.id);
        showToast(`Forma de pagamento "${modalExclusao.nome}" excluída.`);
      } else if (modalExclusao.tipo === 'categoria') {
        await excluirCategoria(modalExclusao.id);
        showToast(`Categoria "${modalExclusao.nome}" excluída.`);
      }
      setModalExclusao(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao excluir item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userName = String(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Minha conta'
  );
  const userEmail = user?.email ?? '';
  const avatarUrl = String(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? '');

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-28">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 border ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white border-red-600'
              : 'bg-[var(--primary)] text-white border-emerald-600'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Erro Geral de Cadastros */}
      {erroCadastros && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{erroCadastros}</span>
        </div>
      )}

      {/* SEÇÃO A: CONTA */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <User size={18} className="text-[var(--primary)]" />
          <h2 className="font-bold text-sm text-[var(--text-primary)]">Conta do Usuário</h2>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-lg">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{userName}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{userEmail}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Google Autenticado
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 active:scale-95 transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer ml-auto"
          >
            <LogOut size={16} />
            <span>Sair da conta</span>
          </button>
        </div>
      </section>

      {/* SEÇÃO B: RESPONSÁVEIS */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--primary)]" />
            <h2 className="font-bold text-sm text-[var(--text-primary)]">Responsáveis</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalResponsavel({ open: true, nome: '', foto_url: '' })}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo</span>
          </button>
        </div>

        {loadingCadastros ? (
          <div className="py-6 flex justify-center text-[var(--text-secondary)]">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : responsaveis.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
            Nenhum responsável cadastrado. Clique em <strong>Novo</strong> para adicionar.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {responsaveis.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ResponsavelAvatar name={r.nome} fotoUrl={r.foto_url ?? undefined} size={38} />
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {r.nome}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setModalResponsavel({
                        open: true,
                        item: r,
                        nome: r.nome,
                        foto_url: r.foto_url ?? '',
                      })
                    }
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors flex items-center justify-center cursor-pointer"
                    title="Editar responsável"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModalExclusao({
                        open: true,
                        tipo: 'responsavel',
                        id: r.id,
                        nome: r.nome,
                      })
                    }
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center cursor-pointer"
                    title="Excluir responsável"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEÇÃO C: FORMAS DE PAGAMENTO */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[var(--primary)]" />
            <h2 className="font-bold text-sm text-[var(--text-primary)]">Formas de Pagamento</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setModalPagamento({
                open: true,
                nome: '',
                tipo: 'cartao',
                cor: CORES_PREDEFINIDAS[0].hex,
              })
            }
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Nova</span>
          </button>
        </div>

        {loadingCadastros ? (
          <div className="py-6 flex justify-center text-[var(--text-secondary)]">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : formasPagamento.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
            Nenhuma forma de pagamento cadastrada. Clique em <strong>Nova</strong> para adicionar.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {formasPagamento.map((fp) => {
              const tipoLabel =
                TIPOS_PAGAMENTO.find((t) => t.id === fp.tipo)?.label ?? fp.tipo;
              return (
                <div key={fp.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-black/10"
                      style={{ backgroundColor: fp.cor }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {fp.nome}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] capitalize">
                        {tipoLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setModalPagamento({
                          open: true,
                          item: fp,
                          nome: fp.nome,
                          tipo: fp.tipo,
                          cor: fp.cor,
                        })
                      }
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors flex items-center justify-center cursor-pointer"
                      title="Editar forma de pagamento"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModalExclusao({
                          open: true,
                          tipo: 'pagamento',
                          id: fp.id,
                          nome: fp.nome,
                        })
                      }
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center cursor-pointer"
                      title="Excluir forma de pagamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SEÇÃO D: CATEGORIAS */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-[var(--primary)]" />
            <h2 className="font-bold text-sm text-[var(--text-primary)]">Categorias</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalCategoria({ open: true, nome: '' })}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Nova</span>
          </button>
        </div>

        {loadingCadastros ? (
          <div className="py-6 flex justify-center text-[var(--text-secondary)]">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : categorias.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-3 text-center">
            Nenhuma categoria cadastrada. Clique em <strong>Nova</strong> para adicionar.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto pr-1">
            {categorias.map((cat) => (
              <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center shrink-0">
                    <Tag size={14} />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setModalCategoria({
                        open: true,
                        item: cat,
                        nome: cat.name,
                      })
                    }
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors flex items-center justify-center cursor-pointer"
                    title="Renomear categoria"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModalExclusao({
                        open: true,
                        tipo: 'categoria',
                        id: cat.id,
                        nome: cat.name,
                      })
                    }
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center cursor-pointer"
                    title="Excluir categoria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEÇÃO E: APARÊNCIA E APLICATIVO */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Palette size={18} className="text-[var(--primary)]" />
          <h2 className="font-bold text-sm text-[var(--text-primary)]">Aparência e Aplicativo</h2>
        </div>

        {/* Alternar tema */}
        <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Tema visual</p>
            <p className="text-[11px] text-[var(--text-secondary)]">Alternar entre modo claro e escuro</p>
          </div>
          <div className="min-h-[44px] flex items-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Refazer introdução */}
        <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Refazer introdução</p>
            <p className="text-[11px] text-[var(--text-secondary)]">Reiniciar o fluxo de onboarding do primeiro acesso</p>
          </div>
          <button
            type="button"
            onClick={() =>
              atualizarProfile(user?.id ?? '', null).then(() => window.location.reload())
            }
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors text-xs font-semibold cursor-pointer"
          >
            Zerar onboarding
          </button>
        </div>

        {/* Notificações diárias */}
        <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
          <div className="pr-3">
            <div className="flex items-center gap-1.5">
              <Bell size={15} className="text-[var(--primary)]" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">Lembrete diário</p>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Notificação diária às 20h para registrar lançamentos
            </p>
            {permission === 'denied' && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                Permissão de notificações bloqueada no navegador.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={permission === 'denied'}
            onClick={() => void toggleNotifications(!notifEnabled)}
            className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              notifEnabled
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            {notifEnabled ? 'Ativado' : 'Ativar'}
          </button>
        </div>

        {/* Instalar PWA */}
        <div className="py-2">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Aplicativo no Dispositivo</p>
          <p className="text-[11px] text-[var(--text-secondary)] mb-3">
            Instale o Minhas Economias para acesso rápido e funcionamento otimizado.
          </p>
          <PWAInstallButton />
        </div>
      </section>

      {/* SEÇÃO F: SEUS DADOS */}
      <section className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Database size={18} className="text-[var(--primary)]" />
          <h2 className="font-bold text-sm text-[var(--text-primary)]">Seus Dados</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border)] flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Exportação de dados</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Baixe uma cópia completa de todos os seus lançamentos em formato CSV.
              </p>
            </div>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportarCSV}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--primary)] transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
              ) : (
                <Download size={16} className="text-[var(--primary)]" />
              )}
              <span>Exportar meus dados (CSV)</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-2 flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-red-500">Excluir conta definitivamente</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Apaga permanentemente sua conta e todos os seus lançamentos e cadastros.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setModalExcluirConta(true);
                setTextoConfirmacaoConta('');
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={16} />
              <span>Excluir minha conta</span>
            </button>
          </div>
        </div>
      </section>

      {/* MODAL: RESPONSÁVEL */}
      {modalResponsavel.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {modalResponsavel.item ? 'Editar Responsável' : 'Novo Responsável'}
              </h3>
              <button
                type="button"
                onClick={() => setModalResponsavel({ open: false, nome: '', foto_url: '' })}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarResponsavel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={modalResponsavel.nome}
                  onChange={(e) =>
                    setModalResponsavel((prev) => ({ ...prev, nome: e.target.value, erro: undefined }))
                  }
                  placeholder="Ex: João, Maria..."
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  URL da Foto (opcional)
                </label>
                <input
                  type="url"
                  value={modalResponsavel.foto_url}
                  onChange={(e) =>
                    setModalResponsavel((prev) => ({
                      ...prev,
                      foto_url: e.target.value,
                      erro: undefined,
                    }))
                  }
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border)]">
                <ResponsavelAvatar
                  name={modalResponsavel.nome || 'Preview'}
                  fotoUrl={modalResponsavel.foto_url || undefined}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                    {modalResponsavel.nome || 'Nome do responsável'}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Pré-visualização</p>
                </div>
              </div>

              {modalResponsavel.erro && (
                <p className="text-xs text-red-500">{modalResponsavel.erro}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalResponsavel({ open: false, nome: '', foto_url: '' })}
                  className="min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Salvar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORMA DE PAGAMENTO */}
      {modalPagamento.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {modalPagamento.item ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setModalPagamento({
                    open: false,
                    nome: '',
                    tipo: 'cartao',
                    cor: CORES_PREDEFINIDAS[0].hex,
                  })
                }
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarPagamento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={modalPagamento.nome}
                  onChange={(e) =>
                    setModalPagamento((prev) => ({ ...prev, nome: e.target.value, erro: undefined }))
                  }
                  placeholder="Ex: Cartão Nubank, Banco Inter..."
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Tipo *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_PAGAMENTO.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setModalPagamento((prev) => ({ ...prev, tipo: t.id }))}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        modalPagamento.tipo === t.id
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] font-bold'
                          : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{t.label}</span>
                      {modalPagamento.tipo === t.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Cor de Identificação
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CORES_PREDEFINIDAS.map((c) => {
                    const isSelected = modalPagamento.cor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setModalPagamento((prev) => ({ ...prev, cor: c.hex }))}
                        className={`min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-[var(--primary)] ring-offset-2 scale-105 border-white/40'
                            : 'border-transparent hover:scale-102'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {isSelected && <Check size={16} className="text-white drop-shadow-md" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {modalPagamento.erro && (
                <p className="text-xs text-red-500">{modalPagamento.erro}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    setModalPagamento({
                      open: false,
                      nome: '',
                      tipo: 'cartao',
                      cor: CORES_PREDEFINIDAS[0].hex,
                    })
                  }
                  className="min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Salvar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORIA */}
      {modalCategoria.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {modalCategoria.item ? 'Renomear Categoria' : 'Nova Categoria'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCategoria({ open: false, nome: '' })}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarCategoria} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={modalCategoria.nome}
                  onChange={(e) =>
                    setModalCategoria((prev) => ({ ...prev, nome: e.target.value, erro: undefined }))
                  }
                  placeholder="Ex: Farmácia, Viagens, Lazer..."
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {modalCategoria.erro && (
                <p className="text-xs text-red-500">{modalCategoria.erro}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalCategoria({ open: false, nome: '' })}
                  className="min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Salvar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE ITEM */}
      {modalExclusao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Confirmar Exclusão</h3>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Tem certeza que deseja excluir <strong>"{modalExclusao.nome}"</strong>?
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
              Os lançamentos antigos continuarão com o nome que tinham, mas este cadastro não aparecerá para novas operações.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setModalExclusao(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecutarExclusao}
                className="min-h-[44px] px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                <span>Sim, excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR CONTA */}
      {modalExcluirConta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Excluir Conta</h3>
                <p className="text-[10px] text-red-500 font-semibold">Ação irreversível</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Esta ação apagará permanentemente todos os seus lançamentos, categorias, responsáveis e preferências. <strong>Sua conta será completamente removida e esta ação não poderá ser desfeita.</strong>
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-[var(--text-primary)]">
                Digite <span className="font-mono text-red-500 font-bold">EXCLUIR</span> para confirmar:
              </label>
              <input
                type="text"
                value={textoConfirmacaoConta}
                onChange={(e) => setTextoConfirmacaoConta(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setModalExcluirConta(false)}
                className="min-h-[44px] px-4 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || textoConfirmacaoConta.trim() !== 'EXCLUIR'}
                onClick={handleExcluirConta}
                className="min-h-[44px] px-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                {isDeletingAccount && <Loader2 size={14} className="animate-spin" />}
                <span>Excluir definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links legais */}
      <div className="flex justify-center gap-4 py-4 text-xs">
        <Link to="/termos" className="text-[var(--text-secondary)] hover:text-[var(--primary)] underline">Termos de Uso</Link>
        <Link to="/privacidade" className="text-[var(--text-secondary)] hover:text-[var(--primary)] underline">Política de Privacidade</Link>
      </div>
    </div>
  );
}
