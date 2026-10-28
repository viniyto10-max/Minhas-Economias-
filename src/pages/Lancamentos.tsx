import { useState, useMemo } from 'react';
import { useLancamentos } from '../hooks/useLancamentos';
import { useCadastros } from '../hooks/useCadastros';
import { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  Search, X, Filter, Calendar, ArrowUpCircle, ArrowDownCircle, 
  ShoppingBag, Wifi, Coffee, Heart, BookOpen, Shirt, Tv, Zap, Droplet, Fuel, DollarSign, Briefcase, Trash2, Edit2, CheckCircle, Clock, ReceiptText 
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FormLancamento from '../components/novo/FormLancamento';

const getCategoryInfo = (categoria: string) => {
  const map: Record<string, { icon: any, color: string }> = {
    'Alimentação': { icon: Coffee, color: 'text-orange-500' },
    'Mercado Livre': { icon: ShoppingBag, color: 'text-yellow-500' },
    'Internet': { icon: Wifi, color: 'text-blue-500' },
    'Energia': { icon: Zap, color: 'text-yellow-400' },
    'Saúde': { icon: Heart, color: 'text-red-500' },
    'Estudos': { icon: BookOpen, color: 'text-purple-500' },
    'Vestuário': { icon: Shirt, color: 'text-pink-500' },
    'Assinaturas digitais': { icon: Tv, color: 'text-indigo-500' },
    'Combustivel': { icon: Fuel, color: 'text-gray-500' },
    'Àgua': { icon: Droplet, color: 'text-blue-400' },
    'Salário': { icon: DollarSign, color: 'text-green-600' },
  };
  return map[categoria] || { icon: Briefcase, color: 'text-[var(--text-secondary)]' };
};

export default function Lancamentos() {
  const { lancamentos, loading, erro, recarregar, lastUpdated, excluir, atualizar } = useLancamentos();
  const { categorias, responsaveis, formasPagamento } = useCadastros();

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Entrada' | 'Saída'>('Todos');
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Confirmados' | 'Pendentes'>('Todos');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<string[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<'recentes' | 'antigos' | 'maior_valor' | 'menor_valor'>('recentes');

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const filteredLancamentos = useMemo(() => {
    let result = [...lancamentos];

    if (busca.trim()) {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = normalize(busca);
      result = result.filter(t => 
        normalize(t.descricao || '').includes(q) ||
        normalize(t.categoria || '').includes(q) ||
        normalize(t.banco || '').includes(q) ||
        normalize(t.responsavel || '').includes(q)
      );
    }

    if (tipoFiltro !== 'Todos') {
      result = result.filter(t => t.movimento === tipoFiltro);
    }

    if (statusFiltro === 'Confirmados') {
      result = result.filter(t => t.confirmado === true);
    } else if (statusFiltro === 'Pendentes') {
      result = result.filter(t => t.confirmado === false);
    }

    if (selectedPagamento.length > 0) {
      result = result.filter(t => t.payment_method_id && selectedPagamento.includes(t.payment_method_id));
    }
    if (selectedCategorias.length > 0) {
      result = result.filter(t => t.category_id && selectedCategorias.includes(t.category_id));
    }
    if (selectedResponsaveis.length > 0) {
      result = result.filter(t => t.responsavel_id && selectedResponsaveis.includes(t.responsavel_id));
    }

    result.sort((a, b) => {
      const timeA = new Date(a.data_hora).getTime();
      const timeB = new Date(b.data_hora).getTime();
      if (ordem === 'recentes') return timeB - timeA;
      if (ordem === 'antigos') return timeA - timeB;
      if (ordem === 'maior_valor') return b.valor - a.valor;
      if (ordem === 'menor_valor') return a.valor - b.valor;
      return 0;
    });

    return result;
  }, [lancamentos, busca, tipoFiltro, statusFiltro, selectedPagamento, selectedCategorias, selectedResponsaveis, ordem]);

  const resumo = useMemo(() => {
    const totalEntradas = filteredLancamentos.filter(t => t.movimento === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
    const totalSaidas = filteredLancamentos.filter(t => t.movimento === 'Saída').reduce((acc, t) => acc + t.valor, 0);
    return {
      count: filteredLancamentos.length,
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas
    };
  }, [filteredLancamentos]);

  const groupedByDay = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredLancamentos.slice(0, visibleCount).forEach(t => {
      const d = new Date(t.data_hora);
      const key = isValid(d) ? format(d, 'yyyy-MM-dd') : 'Outros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredLancamentos, visibleCount]);

  const formatDayHeader = (dateStr: string) => {
    if (dateStr === 'Outros') return 'Outros';
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "EEE, d 'de' MMM", { locale: ptBR });
  };

  const handleToggleConfirmado = async (t: Transaction) => {
    try {
      await atualizar(t.id, { ...t, confirmado: !t.confirmado });
      recarregar();
    } catch (e) { console.error(e); }
  };

  const handleExcluir = async (t: Transaction, tipoExclusao: 'unica' | 'futuras') => {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await excluir(t.id, tipoExclusao);
      recarregar();
      setSelectedTransaction(null);
    } catch (e) { console.error(e); }
  };

  const isParcelado = (desc: string) => /\(\d\/\d\)$/.test(desc);

  const activeFiltersCount = selectedPagamento.length + selectedCategorias.length + selectedResponsaveis.length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      
      <div className="sticky top-0 z-30 bg-[var(--bg-app)] border-b border-[var(--border)] px-4 py-2.5 space-y-2.5">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-0.5 flex-1">
            {(['Todos', 'Entrada', 'Saída'] as const).map(tipo => (
              <button key={tipo} onClick={() => setTipoFiltro(tipo)} className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-lg ${tipoFiltro === tipo ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>{tipo}</button>
            ))}
          </div>
          <button onClick={() => setIsFilterOpen(true)} className={`px-3 py-1.5 text-[11px] font-medium rounded-xl border ${activeFiltersCount > 0 ? 'bg-[var(--primary-soft)] border-[var(--primary)]' : 'bg-[var(--bg-input)] border-[var(--border)]'}`}>
            <Filter size={13} /> {activeFiltersCount > 0 && `· ${activeFiltersCount}`}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {loading ? <div className="space-y-3 animate-pulse">{[1,2,3].map(n => <div key={n} className="h-16 bg-[var(--bg-card)] rounded-xl" />)}</div> : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([dateStr, items]) => (
              <div key={dateStr} className="space-y-2">
                <div className="text-xs font-medium text-[var(--text-secondary)] px-1">{formatDayHeader(dateStr)}</div>
                {items.map(t => {
                  const { icon: Icon, color } = getCategoryInfo(t.categoria);
                  return (
                    <div key={t.id} className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-[var(--shadow)]">
                      <div className="cursor-pointer" onClick={() => handleToggleConfirmado(t)}>
                        {t.confirmado ? <CheckCircle size={20} className="text-[var(--primary)]" /> : <Clock size={20} className="text-[var(--text-secondary)]" />}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTransaction(t)}>
                        <div className="text-sm font-medium truncate">{t.descricao || t.categoria}</div>
                        <div className="text-xs text-[var(--text-secondary)] truncate">{t.banco} · {t.categoria}</div>
                      </div>
                      <div className="text-sm font-bold" onClick={() => setSelectedTransaction(t)}>{t.movimento === 'Saída' ? '-' : '+'}{formatCurrency(t.valor)}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="text-center text-[11px] text-[var(--text-secondary)] pt-4">
          {lastUpdated ? `Atualizado há ${Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 60000))} minutos` : 'Aguardando sincronização'}
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg-card)] w-full sm:max-w-[440px] rounded-t-[20px] p-6 max-h-[85dvh] overflow-y-auto space-y-4">
            <h3 className="font-bold">Filtros</h3>
            <div>
              <label className="text-xs">Formas de Pagamento</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {formasPagamento.map(fp => (
                  <button key={fp.id} onClick={() => setSelectedPagamento(p => p.includes(fp.id) ? p.filter(id => id !== fp.id) : [...p, fp.id])} className={`px-3 py-1 text-xs rounded-xl border ${selectedPagamento.includes(fp.id) ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-input)]'}`}>{fp.nome}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setIsFilterOpen(false)} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold">Aplicar</button>
          </div>
        </div>
      )}

      {selectedTransaction && !isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-[var(--bg-card)] w-full sm:max-w-[440px] rounded-t-[20px] p-6 space-y-4">
            <h3 className="font-bold">Detalhes</h3>
            <p className="text-sm">{selectedTransaction.descricao}</p>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-[var(--bg-input)] rounded-xl font-bold flex items-center justify-center gap-2"><Edit2 size={16}/> Editar</button>
              <button onClick={() => handleExcluir(selectedTransaction, 'unica')} className="flex-1 py-3 bg-red-500/10 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2"><Trash2 size={16}/> Excluir</button>
            </div>
            {isParcelado(selectedTransaction.descricao) && (
              <button onClick={() => handleExcluir(selectedTransaction, 'futuras')} className="w-full py-3 bg-red-500/20 text-red-600 rounded-xl font-bold">Excluir esta e futuras</button>
            )}
            <button onClick={() => setSelectedTransaction(null)} className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold">Fechar</button>
          </div>
        </div>
      )}

      {isEditing && selectedTransaction && (
        <div className="fixed inset-0 bg-[var(--bg-app)] z-50 p-6 overflow-y-auto">
          <h3 className="font-bold mb-4">Editar Lançamento</h3>
          <FormLancamento 
            lancamento={selectedTransaction} 
            onSave={async () => { await recarregar(); setIsEditing(false); setSelectedTransaction(null); }} 
            onCancel={() => setIsEditing(false)} 
          />
        </div>
      )}
    </div>
  );
}
