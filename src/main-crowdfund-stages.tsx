import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CrowdfundStages } from './pages/CrowdfundStages/CrowdfundStages'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrowdfundStages />
  </StrictMode>,
)
