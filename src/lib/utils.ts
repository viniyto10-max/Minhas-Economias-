import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date) => {
  return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
};

/**
 * Converts Brazilian currency strings (e.g. "R$ 1.234,56") and plain decimal
 * strings (e.g. "1234.56") to a number. Invalid/ambiguous values return NaN
 * so callers can reject them instead of silently recording R$ 0,00.
 */
export const parseBRL = (input: string | number): number => {
  if (typeof input === 'number') return Number.isFinite(input) ? input : Number.NaN;
  if (typeof input !== 'string') return Number.NaN;

  let value = input.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!value) return Number.NaN;
  value = value.replace(/[R$]/gi, '');

  // Brazilian format: 1.234,56 or 1234,56
  if (value.includes(',')) {
    if (!/^[-+]?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/.test(value) &&
        !/^[-+]?\d+(?:,\d{1,2})?$/.test(value)) return Number.NaN;
    value = value.replace(/\./g, '').replace(',', '.');
  } else {
    // Dot-decimal format: 1234.56. Do not strip decimal points.
    if (!/^[-+]?\d+(?:\.\d{1,2})?$/.test(value)) return Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};
