import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { LecturaProvider } from './components/LecturaAmplia.jsx'
import SesionProvider from './components/SesionProvider.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LecturaProvider>
        <SesionProvider>
          <App />
        </SesionProvider>
      </LecturaProvider>
    </BrowserRouter>
  </StrictMode>,
)
