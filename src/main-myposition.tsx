import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MyPosition } from './components/MyPosition/MyPosition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MyPosition />
  </StrictMode>
)
