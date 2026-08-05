import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Brand } from './pages/Brand'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Brand />
  </StrictMode>,
)
