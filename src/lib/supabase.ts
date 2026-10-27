import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

// Sanitiza a URL: remove /rest/v1 ou barras no final caso o usuário tenha copiado a URL da API REST
const sanitizeSupabaseUrl = (url?: string) => {
  if (!url) return undefined;
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
const supabaseKey = rawKey;

// Verifica se o usuário colou por engano o link da Vercel na URL do Supabase
export const isInvalidSupabaseUrl = Boolean(
  supabaseUrl && (supabaseUrl.includes('vercel.app') || supabaseUrl.includes('localhost:3000'))
);

export const supabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !isInvalidSupabaseUrl &&
  !supabaseUrl.includes('YOUR_PROJECT_REF') &&
  !supabaseKey.includes('YOUR_SUPABASE')
);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

if (!supabaseConfigured && import.meta.env.DEV) {
  if (isInvalidSupabaseUrl) {
    console.warn('VITE_SUPABASE_URL não pode ser o link da Vercel. Utilize a Project URL do Supabase (ex: https://xxx.supabase.co).');
  } else {
    console.info('Aviso: Supabase aguardando configuração das variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
}
