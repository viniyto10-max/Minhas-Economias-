import { TipoFormaPagamento } from '../types';

export function isCartaoTipo(tipo?: TipoFormaPagamento | string | null): boolean {
  if (!tipo) return false;
  return tipo === 'cartao' || tipo.toLowerCase().includes('cart');
}

export function gradienteDaCor(hex?: string | null): { from: string; to: string } {
  const fallback = { from: '#0F172A', to: '#1E293B' };
  if (!hex || typeof hex !== 'string') return fallback;

  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return fallback;

  const num = parseInt(clean, 16);
  if (isNaN(num)) return fallback;

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  // Tom mais escuro para o início do gradiente (-25% luminosidade)
  const rDark = clamp(r * 0.75);
  const gDark = clamp(g * 0.75);
  const bDark = clamp(b * 0.75);

  // Tom mais claro para o final do gradiente (+25% luminosidade)
  const rLight = clamp(r + (255 - r) * 0.25);
  const gLight = clamp(g + (255 - g) * 0.25);
  const bLight = clamp(b + (255 - b) * 0.25);

  return {
    from: `#${toHex(rDark)}${toHex(gDark)}${toHex(bDark)}`,
    to: `#${toHex(rLight)}${toHex(gLight)}${toHex(bLight)}`,
  };
}
