import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider } from './lib/store.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)