import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AdviserProvider } from './context/AdviserContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdviserProvider>
      <App />
    </AdviserProvider>
  </StrictMode>,
)
