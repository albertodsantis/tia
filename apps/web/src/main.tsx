import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import App from './App.tsx';
import './index.css';
import { initializeStatusBar } from './lib/statusBar';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works normally
    });
  });
}

initializeStatusBar();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
