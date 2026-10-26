const validateWebhookUrl = (value: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('Informe uma URL válida para o webhook.');
  }

  if (parsed.protocol !== 'https:' && !(import.meta.env.DEV && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('Por segurança, o webhook deve usar HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Não inclua usuário ou senha diretamente na URL do webhook.');
  }
  return parsed;
};

export const validarUrlWebhook = (value: string): boolean => {
  try {
    validateWebhookUrl(value);
    return true;
  } catch {
    return false;
  }
};

export const enviarParaWebhook = async (url: string, payload: unknown) => {
  const target = validateWebhookUrl(url);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(target.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`Falha no envio do webhook (HTTP ${response.status}).`);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('O webhook demorou mais de 15 segundos para responder. Confirme o destino antes de tentar novamente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
