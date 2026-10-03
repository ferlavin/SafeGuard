import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import MarcaNivel from '../components/MarcaNivel.jsx'
import QueHacer from '../components/QueHacer.jsx'
import ConsultaFaro from '../components/ConsultaFaro.jsx'
import '../components/MarcaNivel.css'
import '../components/QueHacer.css'
import '../components/ConsultaFaro.css'
import './Panel.css'

const CANALES = {
  web: 'Enlace',
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  pdf: 'PDF',
}

function fecha(valor) {
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PanelHistorial() {
  const [casos, setCasos] = useState([])
  const [abierto, setAbierto] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    supabase
      .from('safelink_analisis')
      .select('id, url_analizada, dominio, nivel_riesgo, explicacion, entrada, fecha_analisis')
      .order('fecha_analisis', { ascending: false })
      .limit(50)
      .then(({ data, error: fallo }) => {
        if (!activo) return
        if (fallo) setError(`No se pudo leer el historial: ${fallo.message}`)
        else setCasos(data ?? [])
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  return (
    <div className="panel panel-personas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">SafeLink</span>
        <h1>Historial</h1>
        <p className="panel-lead">
          Lo que ya revisaste: enlaces, WhatsApp, correos y PDF. Abrí un caso para ver el motivo
          otra vez.
        </p>
      </header>

      {error && <p className="panel-error">{error}</p>}
      {cargando && <p className="panel-estado">Cargando…</p>}

      {!cargando && casos.length === 0 && (
        <p className="panel-vacio">
          Todavía no hay revisiones. Cuando analices un enlace, un WhatsApp, un correo o un PDF,
          queda acá.
        </p>
      )}

      {casos.length > 0 && (
        <ul className="historial">
          {casos.map((item) => {
            const abiertoEste = abierto === item.id
            return (
              <li className="historial-item historial-caso" key={item.id}>
                <button
                  type="button"
                  className="historial-abrir"
                  aria-expanded={abiertoEste}
                  onClick={() => setAbierto(abiertoEste ? null : item.id)}
                >
                  <MarcaNivel nivel={item.nivel_riesgo} compacto />
                  <span>
                    <span className="historial-url">{item.url_analizada}</span>
                    <span className="historial-meta">
                      {CANALES[item.entrada] ?? item.entrada}
                      {item.dominio ? ` · ${item.dominio}` : ''} · {fecha(item.fecha_analisis)}
                    </span>
                  </span>
                </button>
                {abiertoEste && (
                  <div className="historial-detalle">
                    <p>{item.explicacion || 'Sin motivo guardado.'}</p>
                    {item.nivel_riesgo === 'rojo' && <QueHacer />}
                    <ConsultaFaro nivel={item.nivel_riesgo} motivos={item.explicacion} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default PanelHistorial
