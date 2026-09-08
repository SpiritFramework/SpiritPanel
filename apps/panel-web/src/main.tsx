import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initInstallPrompt, registerServiceWorker } from './lib/pwa';
import { PANEL_VERSION } from './lib/product-meta';
import './index.css';

// Must run before render: `beforeinstallprompt` can fire during startup.
initInstallPrompt();
registerServiceWorker(PANEL_VERSION);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
