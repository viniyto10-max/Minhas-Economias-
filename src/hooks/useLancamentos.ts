import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthProvider';
import { Transaction, TipoFormaPagamento } from '../types';
import { isValid } from 'date-fns';

export function useLancamentos() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Zera dados ao trocar de usuário
  useEffect(() => {
    setLancamentos([]);
    setLoading(true);
    setErro(null);
    setLastUpdated(null);
  }, [user?.id]);

  const recarregar = useCallback(async () => {
    if (!user || !supabase) {
      setLancamentos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id,data_hora,movimento,banco,responsavel,descricao,valor,confirmado,category_id,responsavel_id,payment_method_id,categories(name),responsaveis(nome),payment_methods(nome,tipo,cor)'
        )
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (error) {
        // PostgrestError pode não ter status diretamente
        const err = error as any;
        if (err.code === 'PGRST301' || err.status === 401 || err.status === 403) {
          throw new Error('Sessão expirada. Entre novamente.');
        }
        throw new Error('Não foi possível carregar os lançamentos.');
      }

      const rows: Transaction[] = (data ?? [])
        .map((row: any) => {
          const bancoNome = row.payment_methods?.nome ?? row.banco ?? '';
          const responsavelNome = row.responsaveis?.nome ?? row.responsavel ?? '';
          let bancoTipo: TipoFormaPagamento | null = row.payment_methods?.tipo ?? null;
          if (!bancoTipo) {
            const textoBanco = (row.banco ?? '').toLowerCase();
            bancoTipo = textoBanco.includes('cart') ? 'cartao' : 'conta';
          }
          return {
            id: String(row.id),
            data_hora: new Date(row.data_hora),
            movimento: row.movimento,
            banco: bancoNome,
            categoria: row.categories?.name ?? '',
            responsavel: responsavelNome,
            descricao: row.descricao ?? '',
            valor: Number(row.valor),
            confirmado: Boolean(row.confirmado),
            category_id: row.category_id ?? null,
            responsavel_id: row.responsavel_id ?? null,
            payment_method_id: row.payment_method_id ?? null,
            banco_tipo: bancoTipo,
            banco_cor: row.payment_methods?.cor ?? null,
          };
        })
        .filter((row) => isValid(row.data_hora) && Number.isFinite(row.valor));

      setLancamentos(rows);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error('Erro ao carregar lançamentos:', e);
      setErro(e instanceof Error ? e.message : 'Erro ao carregar lançamentos.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const excluir = useCallback(async (id: string, tipo: 'unica' | 'futuras') => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir lançamento.');
  }, [user?.id]);

  const atualizar = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user || !supabase) return;
    const { error } = await supabase.from('transactions').update(updates).eq('id', id);
    if (error) throw new Error('Erro ao atualizar lançamento.');
  }, [user?.id]);

  return { lancamentos, loading, erro, recarregar, lastUpdated, excluir, atualizar };
}
