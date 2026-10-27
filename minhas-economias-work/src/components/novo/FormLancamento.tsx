import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowUpCircle, ArrowDownCircle, Check, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useCadastros } from '../../hooks/useCadastros';
import { format } from 'date-fns';
import { gerarParcelas } from '../../lib/parcelas';
import { formatCurrency } from '../../lib/utils';

const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function FormLancamento() {
  const { user } = useAuth();
  const { categorias, responsaveis, formasPagamento, loading: loadingCadastros } = useCadastros();

  const [tipo, setTipo] = useState<'Entrada' | 'Saída'>('Saída');
  const [dataHora, setDataHora] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [valor, setValor] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [proximaFatura, setProximaFatura] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  // Forma selecionada
  const formaEscolhida = formasPagamento.find((f) => f.id === paymentMethodId);
  const isCartaoSelected = tipo === 'Saída' && formaEscolhida?.tipo === 'cartao';
  const isParcelado = isCartaoSelected && parcelas > 1;
  const numValor = parseFloat(valor.replace(',', '.')) || 0;

  // Seleção automática e lembrança de responsável em localStorage
  useEffect(() => {
    if (!user?.id || responsaveis.length === 0) return;

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
  }, [user?.id, responsaveis, responsavelId]);

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

  let previewDataUnica = '';
  if (isCartaoSelected && !isParcelado && proximaFatura && numValor > 0) {
    try {
      const [p] = gerarParcelas({
        valorTotal: numValor,
        parcelas: 1,
        dataCompra: new Date(dataHora),
        proximaFatura,
      });
      previewDataUnica = `Será lançado em ${format(p.data, 'dd/MM/yyyy')} (próxima fatura)`;
    } catch {
      previewDataUnica = '';
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
    if (user?.id && novoId) {
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
  const cadastrosIncompletos = faltando.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Bloqueio de duplo clique
    if (loading) return;

    if (!user || !supabase) {
      setFeedback({ tipo: 'erro', mensagem: 'Faça login novamente para salvar o lançamento.' });
      return;
    }
    if (numValor <= 0) {
      setFeedback({ tipo: 'erro', mensagem: 'O valor deve ser maior que zero.' });
      return;
    }
    if (!paymentMethodId) {
      setFeedback({ tipo: 'erro', mensagem: 'Selecione uma forma de pagamento.' });
      return;
    }
    if (!categoryId) {
      setFeedback({ tipo: 'erro', mensagem: 'Selecione uma categoria.' });
      return;
    }
    if (!responsavelId) {
      setFeedback({ tipo: 'erro', mensagem: 'Selecione um responsável.' });
      return;
    }

    const n = isCartaoSelected ? parcelas : 1;
    if (n < 1 || n > 24) {
      setFeedback({ tipo: 'erro', mensagem: 'O número de parcelas deve ser entre 1 e 24.' });
      return;
    }

    const parcelasCalculadas = gerarParcelas({
      valorTotal: numValor,
      parcelas: n,
      dataCompra: new Date(dataHora),
      proximaFatura: isCartaoSelected ? proximaFatura : false,
    });

    if (parcelasCalculadas.some((p) => p.valor < 0.01)) {
      setFeedback({ tipo: 'erro', mensagem: 'Nenhuma parcela pode ter valor menor que R$ 0,01.' });
      return;
    }

    const categoriaEscolhida = categorias.find((c) => c.id === categoryId);
    const responsavelEscolhido = responsaveis.find((r) => r.id === responsavelId);

    setLoading(true);
    try {
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

      // Salva responsável no localStorage para as próximas operações
      if (user?.id && responsavelId) {
        try {
          localStorage.setItem(`minhas_economias_ultimo_responsavel_${user.id}`, responsavelId);
        } catch {
          // Ignora
        }
      }

      setFeedback({
        tipo: 'sucesso',
        mensagem:
          n > 1
            ? `${n} parcelas registradas com sucesso!`
            : 'Lançamento registrado com sucesso!',
      });

      // Limpa somente valor e descrição, mantendo os demais campos configurados
      setValor('');
      setDescricao('');
      setParcelas(1);
      setProximaFatura(false);
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err);
      setFeedback({
        tipo: 'erro',
        mensagem:
          err instanceof Error
            ? `Não foi possível salvar: ${err.message}`
            : 'Não foi possível salvar o lançamento.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-[var(--text-primary)]">
      {/* Aviso de cadastros ausentes */}
      {cadastrosIncompletos && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Cadastros necessários pendentes</span>
          </div>
          <p className="text-xs leading-relaxed">
            Para registrar novos lançamentos, é necessário ter pelo menos um item cadastrado em cada
            uma das seções. Falta cadastrar: <strong>{faltando.join(', ')}</strong>.
          </p>
          <Link
            to="/configuracoes"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            Ir para Configurações
          </Link>
        </div>
      )}

      {/* Mensagem de Feedback Inline (Sucesso ou Erro) */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{feedback.mensagem}</span>
        </div>
      )}

      {/* Tipo de Movimentação */}
      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
          Tipo de Movimentação
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTipoChange('Entrada')}
            className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              tipo === 'Entrada'
                ? 'bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-bold'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            <ArrowUpCircle size={20} /> Entrada
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('Saída')}
            className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              tipo === 'Saída'
                ? 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)] font-bold'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'
            }`}
          >
            <ArrowDownCircle size={20} /> Saída
          </button>
        </div>
      </div>

      {/* Data/Hora e Valor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
            Data e Hora
          </label>
          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)]"
            required
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
            {isParcelado ? 'Valor total' : 'Valor'}
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)]"
            required
          />
          {isParcelado && previewParcelas && (
            <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-tight">
              {previewParcelas}
            </div>
          )}
          {previewDataUnica && (
            <div className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-tight">
              {previewDataUnica}
            </div>
          )}
        </div>
      </div>

      {/* Forma de Pagamento e Categoria */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
            Forma de pagamento *
          </label>
          <select
            value={paymentMethodId}
            onChange={(e) => handleFormaPagamentoChange(e.target.value)}
            disabled={loadingCadastros || formasPagamento.length === 0}
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer disabled:opacity-60"
            required
          >
            <option value="" disabled>
              {loadingCadastros
                ? 'Carregando...'
                : formasPagamento.length === 0
                ? 'Nenhuma forma cadastrada'
                : 'Selecione a forma'}
            </option>
            {formasPagamento.map((b) => (
              <option key={b.id} value={b.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {b.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
            Categoria *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={loadingCadastros || categorias.length === 0}
            className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer disabled:opacity-60"
            required
          >
            <option value="" disabled>
              {loadingCadastros
                ? 'Carregando...'
                : categorias.length === 0
                ? 'Nenhuma categoria'
                : 'Selecione a categoria'}
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campo Parcelas (exibido somente quando Saída e Forma de pagamento é Cartão) */}
      {isCartaoSelected && (
        <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
              Parcelas
            </label>
            <select
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className="w-full px-3 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer"
            >
              {OPCOES_PARCELAS.map((p) => (
                <option key={p} value={p} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  {p}x
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Primeira parcela na próxima fatura
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={proximaFatura}
              onClick={() => setProximaFatura(!proximaFatura)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                proximaFatura ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  proximaFatura ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Responsável */}
      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
          Responsável *
        </label>
        <select
          value={responsavelId}
          onChange={(e) => handleResponsavelChange(e.target.value)}
          disabled={loadingCadastros || responsaveis.length === 0}
          className="w-full px-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] appearance-none cursor-pointer disabled:opacity-60"
          required
        >
          <option value="" disabled>
            {loadingCadastros
              ? 'Carregando...'
              : responsaveis.length === 0
              ? 'Nenhum responsável'
              : 'Selecione o responsável'}
          </option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
              {r.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
          Descrição
        </label>
        <textarea
          placeholder="Descreva a transação..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] rounded-[10px] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary-soft)] resize-none h-24"
        />
      </div>

      {/* Confirmar transação */}
      <div
        onClick={() => setConfirmado(!confirmado)}
        className="flex items-center gap-3 p-3.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl cursor-pointer select-none min-h-[44px]"
      >
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            confirmado
              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
              : 'border-[var(--border)]'
          }`}
        >
          {confirmado && <Check size={12} strokeWidth={3} />}
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)]">Confirmar transação</span>
      </div>

      {/* Botão Salvar */}
      <button
        type="submit"
        disabled={loading || cadastrosIncompletos}
        className="w-full min-h-[48px] bg-[var(--primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,.3)] hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Salvando registro...</span>
          </>
        ) : (
          <>
            <Send size={18} />
            <span>Salvar Registro</span>
          </>
        )}
      </button>
    </form>
  );
}
