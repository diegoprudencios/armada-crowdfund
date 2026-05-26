import './styles/global.css'
import './styles/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MyPositionSplit } from './components/MyPosition/MyPositionSplit'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MyPositionSplit />
  </StrictMode>
)
