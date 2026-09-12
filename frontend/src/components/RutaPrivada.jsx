import { Navigate, Outlet } from 'react-router'
import { useSesion } from '../lib/useSesion.js'
import '../pages/Panel.css'

function RutaPrivada() {
  const { sesion, cargando } = useSesion()

  if (cargando) return <p className="panel-estado">Verificando tu sesión…</p>
  if (!sesion) return <Navigate to="/ingresar" replace />
  return <Outlet />
}

export default RutaPrivada
