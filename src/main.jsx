import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './student/components/ErrorBoundary.jsx'
import { setupPasswordCopyPrevention } from './utils/disablePasswordCopy.js'

// Auto-recover from stale Vite chunks on new production deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Reloading page for newest deployment...', event);
  window.location.reload();
});

// Initialize system-wide password copy prevention
setupPasswordCopyPrevention();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

