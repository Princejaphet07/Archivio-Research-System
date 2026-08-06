import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AdviserProvider } from './context/AdviserContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AdviserProvider>
        <App />
      </AdviserProvider>
    </ErrorBoundary>
  </StrictMode>,
)
