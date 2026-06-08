import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Suppress deprecation warnings from external Three.js dependencies
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
    return;
  }
  originalWarn(...args);
};

import App from './App.tsx'
import { VikiDedicatedChat } from './components/viki/VikiDedicatedChat.tsx'
import { CortexReporterPanel } from './components/reporting/CortexReporterPanel.tsx'

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {mode === "viki-chat" ? (
      <VikiDedicatedChat />
    ) : mode === "reports" ? (
      <CortexReporterPanel />
    ) : (
      <App />
    )}
  </StrictMode>,
)
