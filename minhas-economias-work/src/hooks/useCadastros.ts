import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthProvider';
import { Category, Responsavel, PaymentMethod, TipoFormaPagamento } from '../types';

export function useCadastros() {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const recarregar = useCallback(async () => {
    if (!user || !supabase) {
      setCategorias([]);
      setResponsaveis([]);
      setFormasPagamento([]);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErro(null);

    try {
      const [resCat, resResp, resPag] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
        supabase
          .from('responsaveis')
          .select('id, nome, foto_url')
          .eq('user_id', user.id)
          .order('nome', { ascending: true }),
        supabase
          .from('payment_methods')
          .select('id, nome, tipo, cor')
          .eq('user_id', user.id)
          .order('nome', { ascending: true }),
      ]);

      if (resCat.error) throw resCat.error;
      if (resResp.error) throw resResp.error;
      if (resPag.error) throw resPag.error;

      setCategorias(resCat.data ?? []);
      setResponsaveis(resResp.data ?? []);
      setFormasPagamento(resPag.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os cadastros.');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Funções CRUD - Categorias
  const criarCategoria = async (name: string): Promise<Category> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: name.trim() })
      .select('id, name')
      .single();
    if (error) throw error;
    await recarregar();
    return data;
  };

  const atualizarCategoria = async (id: string, name: string): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  const excluirCategoria = async (id: string): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  // Funções CRUD - Responsáveis
  const criarResponsavel = async (dados: { nome: string; foto_url?: string | null }): Promise<Responsavel> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase
      .from('responsaveis')
      .insert({
        user_id: user.id,
        nome: dados.nome.trim(),
        foto_url: dados.foto_url?.trim() || null,
      })
      .select('id, nome, foto_url')
      .single();
    if (error) throw error;
    await recarregar();
    return data;
  };

  const atualizarResponsavel = async (
    id: string,
    dados: { nome?: string; foto_url?: string | null }
  ): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const payload: { nome?: string; foto_url?: string | null } = {};
    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.foto_url !== undefined) payload.foto_url = dados.foto_url?.trim() || null;

    const { error } = await supabase
      .from('responsaveis')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  const excluirResponsavel = async (id: string): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { error } = await supabase
      .from('responsaveis')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  // Funções CRUD - Formas de Pagamento
  const criarFormaPagamento = async (dados: {
    nome: string;
    tipo: TipoFormaPagamento;
    cor: string;
  }): Promise<PaymentMethod> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        nome: dados.nome.trim(),
        tipo: dados.tipo,
        cor: dados.cor.trim(),
      })
      .select('id, nome, tipo, cor')
      .single();
    if (error) throw error;
    await recarregar();
    return data;
  };

  const atualizarFormaPagamento = async (
    id: string,
    dados: { nome?: string; tipo?: TipoFormaPagamento; cor?: string }
  ): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const payload: { nome?: string; tipo?: TipoFormaPagamento; cor?: string } = {};
    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.tipo !== undefined) payload.tipo = dados.tipo;
    if (dados.cor !== undefined) payload.cor = dados.cor.trim();

    const { error } = await supabase
      .from('payment_methods')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  const excluirFormaPagamento = async (id: string): Promise<void> => {
    if (!user || !supabase) throw new Error('Usuário não autenticado.');
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await recarregar();
  };

  return {
    categorias,
    responsaveis,
    formasPagamento,
    loading,
    erro,
    recarregar,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
    criarResponsavel,
    atualizarResponsavel,
    excluirResponsavel,
    criarFormaPagamento,
    atualizarFormaPagamento,
    excluirFormaPagamento,
  };
}
