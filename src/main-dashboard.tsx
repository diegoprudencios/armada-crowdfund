import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HeroDashboard } from './pages/HeroDashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeroDashboard />
  </StrictMode>
)
