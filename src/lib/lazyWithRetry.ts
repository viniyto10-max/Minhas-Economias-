export function lazyWithRetry<T>(
  componentImport: () => Promise<{ default: React.ComponentType<T> }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Lazy loading failed, retrying...', error);
      // Wait a moment then retry
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      try {
        return await componentImport();
      } catch (retryError) {
        console.error('Retry failed, reloading page', retryError);
        window.location.reload();
        throw retryError;
      }
    }
  });
}
import { lazy } from 'react';
