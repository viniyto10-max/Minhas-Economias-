import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Transaction } from '../types';
import { parseBRL } from '../lib/utils';
import { parse, parseISO, isValid } from 'date-fns';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrJlqr_-rkEfKEGWI6IdX-sBbOc9ZE12Bn7NcWXcc13rKBmaBugAxFMqchuU17McomYpvZAkD3-ry/pub?gid=1786232658&single=true&output=csv';

const normalizeText = (value: unknown) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
  const rowKeys = Object.keys(row ?? {});
  for (const key of keys) {
    const found = rowKeys.find((rowKey) => normalizeText(rowKey) === normalizeText(key));
    if (found && row[found] !== undefined && row[found] !== null) return row[found];
  }
  return '';
};

const parseTransactionDate = (rawValue: unknown): Date | null => {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return null;

  const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy H:mm:ss', 'dd/MM/yyyy HH:mm', 'dd/MM/yyyy'];
  for (const formatString of formats) {
    const candidate = parse(raw, formatString, new Date());
    if (isValid(candidate)) return candidate;
  }

  // Accept ISO timestamps from integrations, but never replace invalid dates with "now".
  const iso = parseISO(raw);
  return isValid(iso) ? iso : null;
};

const normalizeTransaction = (row: Record<string, unknown>, index: number): Transaction | null => {
  const rawData = getRowValue(row, ['Carimbo data/hora', 'Data', 'Data e Hora', 'data_hora']);
  const data = parseTransactionDate(rawData);
  const rawValor = getRowValue(row, ['Valor', 'value']);
  const valor = parseBRL(String(rawValor ?? ''));

  const rawMovimento = normalizeText(getRowValue(row, ['Movimento', 'Tipo', 'movimento']));
  let movimento: Transaction['movimento'] | null = null;
  if (['entrada', 'receita', 'income', 'credito', 'crédito'].includes(rawMovimento)) movimento = 'Entrada';
  if (['saida', 'despesa', 'expense', 'debito', 'débito'].includes(rawMovimento)) movimento = 'Saída';

  // Reject malformed rows rather than inventing dates, amounts, or movement types.
  if (!data || !Number.isFinite(valor) || valor < 0 || !movimento) return null;

  const rawConfirmado = getRowValue(row, ['Confirmado', 'confirmed']);
  const confirmedText = normalizeText(rawConfirmado);
  const confirmado = typeof rawConfirmado === 'boolean'
    ? rawConfirmado
    : ['true', 'sim', 'yes', '1', 'confirmado'].includes(confirmedText);

  const idCompra = String(getRowValue(row, ['id_compra', 'ID Compra', 'id'])).trim();
  const parcelaAtual = String(getRowValue(row, ['parcela_atual', 'Parcela atual', 'parcela'])).trim();

  return {
    id: idCompra ? `${idCompra}-${parcelaAtual || 1}` : `row-${index}`,
    data_hora: data,
    movimento,
    banco: String(getRowValue(row, ['Banco', 'Forma de pagamento'])).trim(),
    categoria: String(getRowValue(row, ['Categoria'])).trim(),
    responsavel: String(getRowValue(row, ['Responsável', 'Responsavel'])).trim(),
    descricao: String(getRowValue(row, ['Descrição', 'Descricao'])).trim(),
    valor,
    confirmado,
  };
};

const readCache = (): Transaction[] => {
  try {
    if (typeof window === 'undefined') return [];
    const cached = window.localStorage.getItem('lancamentos_cache');
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) =>
      t && typeof t.id === 'string' &&
      (t.movimento === 'Entrada' || t.movimento === 'Saída') &&
      Number.isFinite(Number(t.valor)) &&
      t.data_hora && isValid(new Date(t.data_hora))
    ).map((t) => ({ ...t, valor: Number(t.valor), data_hora: new Date(t.data_hora) }));
  } catch {
    return [];
  }
};

export function useLancamentos() {
  // Never seed a financial dashboard with fictitious transactions.
  const [lancamentos, setLancamentos] = useState<Transaction[]>(readCache);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const initializedRef = useRef(false);
  const inFlightRef = useRef(false);

  const recarregar = useCallback(async (isBackground = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!isBackground) setLoading(true);
    setErro(null);

    try {
      const bust = `_=${Date.now()}`;
      let csvText = '';

      try {
        const proxyRes = await fetch(`/api/sheet-csv?${bust}`, { cache: 'no-store' });
        if (proxyRes.ok) csvText = await proxyRes.text();
      } catch {
        // The direct published-sheet fallback is retained for existing deployments.
      }

      if (!csvText) {
        try {
          const directRes = await fetch(`${SHEET_CSV_URL}&${bust}`, { cache: 'no-store' });
          if (directRes.ok) csvText = await directRes.text();
        } catch {
          // Handled below.
        }
      }

      if (!csvText.trim()) throw new Error('Não foi possível carregar a planilha. Os dados exibidos podem estar desatualizados.');

      const result = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
      });

      if (result.errors.length) {
        console.warn(`Planilha CSV: ${result.errors.length} aviso(s) de leitura.`);
      }

      const validRows: Transaction[] = [];
      let invalidRows = 0;
      (result.data as Record<string, unknown>[]).forEach((row, index) => {
        if (!getRowValue(row, ['Carimbo data/hora', 'Data', 'Data e Hora', 'data_hora'])) return;
        const normalized = normalizeTransaction(row, index);
        if (normalized) validRows.push(normalized);
        else invalidRows++;
      });

      // Keep the latest occurrence for each stable transaction id.
      const uniqueRows = Array.from(new Map(validRows.map((transaction) => [transaction.id, transaction])).values());
      setLancamentos(uniqueRows);
      try {
        window.localStorage.setItem('lancamentos_cache', JSON.stringify(uniqueRows));
      } catch {
        // Storage may be unavailable or full; the in-memory data remains usable.
      }
      setLastUpdated(new Date());
      setErro(invalidRows > 0
        ? `${invalidRows} linha(s) inválida(s) foram ignoradas para evitar alterar seus cálculos. Revise datas, valores e tipos na planilha.`
        : null);
      initializedRef.current = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados financeiros.';
      setErro(message);
      // Existing cache remains visible, but never replace it with fictitious sample data.
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { lancamentos, loading, erro, recarregar, lastUpdated };
}
