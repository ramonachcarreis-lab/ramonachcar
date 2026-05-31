import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (ev) => {
    console.error('[Estofado Pro] Promise rejeitada:', ev.reason);
  });
  // Em dev, SW antigo (public/sw.js) cacheava HTML/JS e deixava a tela branca.
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    void (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    })();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
