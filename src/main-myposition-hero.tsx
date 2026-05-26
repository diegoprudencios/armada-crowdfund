import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MyPositionHero } from './components/MyPosition/MyPositionHero'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MyPositionHero />
  </StrictMode>
)
