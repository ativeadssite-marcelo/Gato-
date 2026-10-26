import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initDevToolsSecurityShield } from './utils/securityPrivacy.ts';
import './index.css';

// Ativa a blindagem contra vazamento de senhas e dados no DevTools
initDevToolsSecurityShield();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
