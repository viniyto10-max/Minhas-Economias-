import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Don't reload immediately, allow user to continue
      console.log('New content available, please refresh.');
    },
  });
}


createRoot(document.getElementById('root')!).render(<App />);
