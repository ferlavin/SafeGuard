import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../lib/supabase.js'
import Resultado from '../components/Resultado.jsx'
import './Panel.css'

function Compartido() {
  const { token } = useParams()
  const [ficha, setFicha] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    supabase.rpc('safelink_ver_compartido', { p_token: token }).then(({ data, error: fallo }) => {
      if (!activo) return
      if (fallo || !data) setError('Ese resultado ya no está o el enlace está incompleto.')
      else setFicha(data)
    })

    return () => {
      activo = false
    }
  }, [token])

  if (error) {
    return (
      <div className="compartido panel-personas">
        <p className="panel-error">{error}</p>
        <Link to="/">Ir a SafeGuard</Link>
      </div>
    )
  }

  if (!ficha) return <p className="panel-estado">Abriendo el resultado…</p>

  return (
    <div className="compartido panel-personas">
      <header className="panel-header">
        <span className="panel-tag">SafeLink</span>
        <h1>Te mandaron este resultado</h1>
        <p className="panel-lead">
          Alguien de confianza pidió que SafeLink revisara un enlace antes de
          abrirlo. El color y el motivo salen de ese análisis, no de un chat.
        </p>
      </header>

      <Resultado
        nivel={ficha.nivel_riesgo}
        subtitulo={ficha.dominio}
        motivos={ficha.explicacion ? ficha.explicacion.split(/(?<=\.)\s+/).filter(Boolean) : []}
      />

      <p>
        <Link to="/ingresar">Quiero revisar otro enlace</Link>
      </p>
    </div>
  )
}

export default Compartido
