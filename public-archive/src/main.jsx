import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupPasswordCopyPrevention } from './utils/disablePasswordCopy.js'

// Initialize system-wide password copy prevention
setupPasswordCopyPrevention();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

