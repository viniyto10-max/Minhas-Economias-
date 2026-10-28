import { lazy } from 'react';

export function lazyWithRetry<T>(
  componentImport: () => Promise<{ default: React.ComponentType<T> }>,
  retries = 2
) {
  return lazy(async () => {
    let error;
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (e) {
        error = e;
        console.error(`Lazy loading failed (attempt ${i + 1}), retrying...`, e);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    console.error('Lazy loading failed after retries', error);
    throw new Error('Falha ao carregar componente. Verifique sua conexão.');
  });
}
