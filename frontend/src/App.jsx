import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import RutaPrivada from './components/RutaPrivada.jsx'
import Landing from './pages/Landing.jsx'
import Empresas from './pages/Empresas.jsx'
import Personas from './pages/Personas.jsx'
import Ingresar from './pages/Ingresar.jsx'
import Panel from './pages/Panel.jsx'
import PanelEnlaces from './pages/PanelEnlaces.jsx'
import PanelWhatsapp from './pages/PanelWhatsapp.jsx'
import PanelPdf from './pages/PanelPdf.jsx'
import PanelCorreo from './pages/PanelCorreo.jsx'
import Compartido from './pages/Compartido.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="personas" element={<Personas />} />
        <Route path="ingresar" element={<Ingresar />} />
        <Route path="c/:token" element={<Compartido />} />

        <Route path="panel" element={<RutaPrivada />}>
          <Route index element={<Panel />} />
          <Route path="enlaces" element={<PanelEnlaces />} />
          <Route path="whatsapp" element={<PanelWhatsapp />} />
          <Route path="pdf" element={<PanelPdf />} />
          <Route path="correo" element={<PanelCorreo />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
