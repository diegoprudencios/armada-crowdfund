import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InviteLanding } from './pages/InviteLanding'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InviteLanding />
  </StrictMode>,
)
