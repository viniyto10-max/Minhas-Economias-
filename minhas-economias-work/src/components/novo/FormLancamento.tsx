import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowUpCircle, ArrowDownCircle, Check, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useCadastros } from '../../hooks/useCadastros';
import { Transaction } from '../../types';
import { format } from 'date-fns';
import { gerarParcelas } from '../../lib/parcelas';
import { formatCurrency } from '../../lib/utils';

const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1);

type Props = {
  lancamento?: Transaction;
  onSave: () => Promise<void>;
  onCancel: () => void;
};

export default function FormLancamento({ lancamento, onSave, onCancel }: Props) {
  const { user } = useAuth();
  const { categorias, responsaveis, formasPagamento, loading: loadingCadastros } = useCadastros();
  
  const isEdit = !!lancamento;

  const [tipo, setTipo] = useState<'Entrada' | 'Saída'>(lancamento?.movimento ?? 'Saída');
  const [dataHora, setDataHora] = useState(lancamento ? format(lancamento.data_hora, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [valor, setValor] = useState(lancamento ? lancamento.valor.toString() : '');
  const [paymentMethodId, setPaymentMethodId] = useState(lancamento?.payment_method_id ?? '');
  const [categoryId, setCategoryId] = useState(lancamento?.category_id ?? '');
  const [responsavelId, setResponsavelId] = useState(lancamento?.responsavel_id ?? '');
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '');
  const [confirmado, setConfirmado] = useState(lancamento?.confirmado ?? false);
  const [parcelas, setParcelas] = useState(1);
  const [proximaFatura, setProximaFatura] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  // Forma selecionada
  const formaEscolhida = formasPagamento.find((f) => f.id === paymentMethodId);
  const isCartaoSelected = !isEdit && tipo === 'Saída' && formaEscolhida?.tipo === 'cartao';
  const isParcelado = isCartaoSelected && parcelas > 1;
  const numValor = parseFloat(valor.replace(',', '.')) || 0;

  // Seleção automática e lembrança de responsável em localStorage
  useEffect(() => {
    if (isEdit || !user?.id || responsaveis.length === 0) return;

    // Se já selecionado e válido, mantém
    if (responsavelId && responsaveis.some((r) => r.id === responsavelId)) return;

    // Se houver apenas um responsável, seleciona automaticamente
    if (responsaveis.length === 1) {
      setResponsavelId(responsaveis[0].id);
      return;
    }

    // Tenta carregar do localStorage
    try {
      const savedId = localStorage.getItem(`minhas_economias_ultimo_responsavel_${user.id}`);
      if (savedId && responsaveis.some((r) => r.id === savedId)) {
        setResponsavelId(savedId);
      }
    } catch {
      // Ignora erro de acesso ao localStorage
    }
  }, [user?.id, responsaveis, responsavelId, isEdit]);

  // Cálculo da prévia de parcelas
  let previewParcelas = '';
  if (isParcelado && numValor > 0) {
    try {
      const parc = gerarParcelas({
        valorTotal: numValor,
        parcelas,
        dataCompra: new Date(dataHora),
        proximaFatura,
      });
      const valorPrimeira = formatCurrency(parc[0].valor);
      const datasFormatadas = parc.map((p) => format(p.data, 'dd/MM'));
      const datasStr =
        parc.length <= 4
          ? datasFormatadas.join(', ')
          : `${datasFormatadas.slice(0, 3).join(', ')}, ...`;
      previewParcelas = `${parcelas}x de ${valorPrimeira} · ${datasStr}`;
    } catch {
      previewParcelas = '';
    }
  }

  const handleTipoChange = (novoTipo: 'Entrada' | 'Saída') => {
    setTipo(novoTipo);
    if (novoTipo === 'Entrada') {
      setParcelas(1);
      setProximaFatura(false);
    }
  };

  const handleFormaPagamentoChange = (novoId: string) => {
    setPaymentMethodId(novoId);
    const selecionada = formasPagamento.find((f) => f.id === novoId);
    if (selecionada?.tipo !== 'cartao') {
      setParcelas(1);
      setProximaFatura(false);
    }
  };

  const handleResponsavelChange = (novoId: string) => {
    setResponsavelId(novoId);
    if (!isEdit && user?.id && novoId) {
      try {
        localStorage.setItem(`minhas_economias_ultimo_responsavel_${user.id}`, novoId);
      } catch {
        // Ignora erro de localStorage
      }
    }
  };

  // Verifica cadastros ausentes
  const faltando: string[] = [];
  if (!loadingCadastros) {
    if (formasPagamento.length === 0) faltando.push('formas de pagamento');
    if (categorias.length === 0) faltando.push('categorias');
    if (responsaveis.length === 0) faltando.push('responsáveis');
  }
  const cadastrosIncompletos = !isEdit && faltando.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (loading) return;

    if (!user || !supabase) {
      setFeedback({ tipo: 'erro', mensagem: 'Faça login novamente para salvar o lançamento.' });
      return;
    }
    if (numValor <= 0) {
      setFeedback({ tipo: 'erro', mensagem: 'O valor deve ser maior que zero.' });
      return;
    }
    if (!paymentMethodId || !categoryId || !responsavelId) {
      setFeedback({ tipo: 'erro', mensagem: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    const n = isCartaoSelected ? parcelas : 1;
    const categoriaEscolhida = categorias.find((c) => c.id === categoryId);
    const responsavelEscolhido = responsaveis.find((r) => r.id === responsavelId);
    const formaEscolhida = formasPagamento.find((f) => f.id === paymentMethodId);

    setLoading(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('transactions').update({
          category_id: categoryId,
          responsavel_id: responsavelId,
          payment_method_id: paymentMethodId,
          banco: formaEscolhida?.nome ?? null,
          responsavel: responsavelEscolhido?.nome ?? null,
          data_hora: new Date(dataHora).toISOString(),
          movimento: tipo,
          descricao: descricao.trim() || null,
          valor: numValor,
          confirmado: confirmado,
        }).eq('id', lancamento.id);
        if (error) throw error;
        setFeedback({ tipo: 'sucesso', mensagem: 'Alterações salvas com sucesso!' });
      } else {
        const parcelasCalculadas = gerarParcelas({
          valorTotal: numValor,
          parcelas: n,
          dataCompra: new Date(dataHora),
          proximaFatura: isCartaoSelected ? proximaFatura : false,
        });

        const idCompra =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const rows = parcelasCalculadas.map((parcela, index) => ({
          id: n > 1 ? `${idCompra}-${index + 1}` : idCompra,
          user_id: user.id,
          category_id: categoryId,
          responsavel_id: responsavelId,
          payment_method_id: paymentMethodId,
          data_hora: parcela.data.toISOString(),
          movimento: tipo,
          banco: formaEscolhida?.nome ?? null,
          responsavel: responsavelEscolhido?.nome ?? null,
          descricao:
            n > 1
              ? descricao.trim()
                ? `${descricao.trim()} (${index + 1}/${n})`
                : `${categoriaEscolhida?.name ?? 'Lançamento'} (${index + 1}/${n})`
              : descricao.trim() || null,
          valor: Number(parcela.valor),
          confirmado: Boolean(confirmado),
        }));

        const { error } = await supabase.from('transactions').insert(rows);
        if (error) throw error;
        setFeedback({ tipo: 'sucesso', mensagem: 'Lançamento registrado com sucesso!' });
      }
      
      await onSave();
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err);
      setFeedback({
        tipo: 'erro',
        mensagem: err instanceof Error ? `Não foi possível salvar: ${err.message}` : 'Não foi possível salvar o lançamento.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-[var(--text-primary)]">
      {cadastrosIncompletos && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Cadastros necessários pendentes</span>
          </div>
          <p className="text-xs leading-relaxed">
            Falta cadastrar: <strong>{faltando.join(', ')}</strong>.
          </p>
          <Link to="/configuracoes" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-bold">
            Ir para Configurações
          </Link>
        </div>
      )}

      {feedback && (
        <div role="alert" className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${feedback.tipo === 'sucesso' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
          {feedback.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.mensagem}</span>
        </div>
      )}

      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Tipo de Movimentação</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => handleTipoChange('Entrada')} className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-sm font-medium ${tipo === 'Entrada' ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-bold' : 'bg-[var(--bg-input)] border-[var(--border)]'}`}>
            <ArrowUpCircle size={20} /> Entrada
          </button>
          <button type="button" onClick={() => handleTipoChange('Saída')} className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-sm font-medium ${tipo === 'Saída' ? 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)] font-bold' : 'bg-[var(--bg-input)] border-[var(--border)]'}`}>
            <ArrowDownCircle size={20} /> Saída
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Data e Hora</label>
          <input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm" required />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">{isParcelado ? 'Valor total' : 'Valor'}</label>
          <input type="number" step="0.01" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Forma de pagamento *</label>
          <select value={paymentMethodId} onChange={(e) => handleFormaPagamentoChange(e.target.value)} className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm" required>
            <option value="" disabled>Selecione</option>
            {formasPagamento.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Categoria *</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm" required>
            <option value="" disabled>Selecione</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {!isEdit && isCartaoSelected && (
        <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Parcelas</label>
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="w-full px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm">
              {OPCOES_PARCELAS.map((p) => <option key={p} value={p}>{p}x</option>)}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Responsável *</label>
        <select value={responsavelId} onChange={(e) => handleResponsavelChange(e.target.value)} className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] min-h-[44px] text-sm" required>
          <option value="" disabled>Selecione</option>
          {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Descrição</label>
        <textarea placeholder="Descreva..." value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[10px] text-sm h-24" />
      </div>

      <div onClick={() => setConfirmado(!confirmado)} className="flex items-center gap-3 p-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl cursor-pointer">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${confirmado ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'}`}>
          {confirmado && <Check size={12} strokeWidth={3} />}
        </div>
        <span className="text-sm font-medium">Confirmar transação</span>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 min-h-[48px] bg-[var(--bg-input)] rounded-xl font-bold">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 min-h-[48px] bg-[var(--primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : (isEdit ? 'Salvar alterações' : 'Salvar Registro')}
        </button>
      </div>
    </form>
  );
}
