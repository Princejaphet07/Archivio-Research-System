import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AdviserProvider } from './context/AdviserContext.jsx'
import { DarkModeProvider } from './context/DarkModeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <DarkModeProvider>
        <AdviserProvider>
          <App />
        </AdviserProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
