import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@weaver/electron-ui/theme.css'
import '@weaver/electron-ui/loading.css'
import '@weaver/electron-ui/titlebar.css'
import './app.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Missing #root element')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
