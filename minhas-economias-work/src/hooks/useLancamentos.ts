import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction } from '../types';
import { isValid } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthProvider';

export function useLancamentos() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlightRef = useRef(false);

  const recarregar = useCallback(async (_isBackground = false) => {
    if (!user || !supabase) { setLancamentos([]); setLoading(false); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true; setLoading(true); setErro(null);
    try {
      const { data, error } = await supabase.from('transactions')
        .select('id,data_hora,movimento,banco,responsavel,descricao,valor,confirmado,category_id,categories(name)')
        .eq('user_id', user.id).order('data_hora', { ascending: false });
      if (error) throw error;
      const rows: Transaction[] = (data ?? []).map((row: any) => ({
        id: String(row.id), data_hora: new Date(row.data_hora), movimento: row.movimento,
        banco: row.banco ?? '', categoria: row.categories?.name ?? '', responsavel: row.responsavel ?? '',
        descricao: row.descricao ?? '', valor: Number(row.valor), confirmado: Boolean(row.confirmado),
      })).filter((row) => isValid(row.data_hora) && Number.isFinite(row.valor));
      setLancamentos(rows); setLastUpdated(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar seus lançamentos.');
    } finally { inFlightRef.current = false; setLoading(false); }
  }, [user?.id]);

  useEffect(() => { void recarregar(); }, [recarregar]);
  return { lancamentos, loading, erro, recarregar, lastUpdated };
}
