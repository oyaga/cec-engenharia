import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("%c CEC Portal v2.2.3 - 21/07/2026 ", "background: #0f172a; color: #10b981; font-weight: bold; padding: 4px; border-radius: 4px;");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
