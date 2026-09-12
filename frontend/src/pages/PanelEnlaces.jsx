import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { useSesion } from '../lib/useSesion.js'
import { analizar, combinarConAmenaza, combinarConEnriquecimiento } from '../lib/analisis.js'
import {
  compartirResultado,
  consultarAmenaza,
  enriquecer,
  guardarAnalisis,
  reportarDominio,
} from '../lib/enriquecer.js'
import Resultado from '../components/Resultado.jsx'
import './Panel.css'

const COLUMNAS = 'id, url_analizada, dominio, nivel_riesgo, explicacion, fecha_analisis'

function fecha(valor) {
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PanelEnlaces() {
  const { sesion } = useSesion()
  const [entrada, setEntrada] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [reportes, setReportes] = useState([])
  const [analizando, setAnalizando] = useState(false)
  const [cierre, setCierre] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    Promise.all([
      supabase
        .from('safelink_analisis')
        .select(COLUMNAS)
        .order('fecha_analisis', { ascending: false })
        .limit(20),
      supabase
        .from('safelink_reportes')
        .select('id, dominio, cierre, estado, fecha_reporte')
        .order('fecha_reporte', { ascending: false })
        .limit(10),
    ]).then(([hist, reps]) => {
      if (!activo) return
      if (hist.error) setError(`No se pudo leer el historial: ${hist.error.message}`)
      else setHistorial(hist.data ?? [])
      if (!reps.error) setReportes(reps.data ?? [])
    })

    return () => {
      activo = false
    }
  }, [])

  async function manejarAnalisis(evento) {
    evento.preventDefault()
    setError(null)
    setCierre(null)

    const local = analizar(entrada)
    if (!local) {
      setError('Eso no parece un enlace. Probá con algo como ejemplo.com/promo')
      return
    }

    setAnalizando(true)

    const [{ amenaza, fallo }, extra] = await Promise.all([
      consultarAmenaza(local.dominio),
      enriquecer(local.url),
    ])

    let final = combinarConAmenaza(local, fallo ? null : amenaza)
    final = combinarConEnriquecimiento(final, extra)

    if (fallo) {
      final = {
        ...final,
        motivos: [
          ...final.motivos,
          'No se pudo consultar la base de amenazas, así que este resultado sale de la dirección y de lo que se pudo abrir.',
        ],
      }
    }

    setResultado(final)

    const { error: falloGuardado } = await guardarAnalisis(sesion, final, 'web')
    setAnalizando(false)

    if (falloGuardado) {
      setError(`El análisis se hizo, pero no se pudo guardar: ${falloGuardado.message}`)
      return
    }

    setHistorial((previo) =>
      [
        {
          id: crypto.randomUUID(),
          url_analizada: final.url,
          dominio: final.dominioDestino ?? final.dominio,
          nivel_riesgo: final.nivel,
          explicacion: final.motivos.join(' '),
          fecha_analisis: new Date().toISOString(),
        },
        ...previo,
      ].slice(0, 20),
    )
  }

  async function reportar() {
    if (!resultado) return
    setError(null)

    const { data, error: fallo } = await reportarDominio(resultado, 'web')
    if (fallo) {
      setError(`No se pudo enviar el reporte: ${fallo.message}`)
      return
    }

    setCierre(data.cierre)
    setReportes((previo) => [
      {
        id: crypto.randomUUID(),
        dominio: resultado.dominioDestino ?? resultado.dominio,
        cierre: data.cierre,
        estado: 'revisado',
        fecha_reporte: new Date().toISOString(),
      },
      ...previo,
    ])
  }

  async function compartir() {
    if (!resultado) return
    setError(null)
    const r = await compartirResultado(resultado)
    if (r.error) setError(r.error)
  }

  return (
    <div className="panel panel-personas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">SafeLink</span>
        <h1>Revisar un enlace</h1>
        <p className="panel-lead">
          Pegá la dirección antes de abrirla. Si es un bit.ly o un cutt.ly,
          abrimos el destino por vos y te decimos a dónde lleva.
        </p>
      </header>

      <form className="panel-form panel-form-fila" onSubmit={manejarAnalisis}>
        <label className="panel-campo">
          <span>Dirección</span>
          <input
            type="text"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="bit.ly/algo o ejemplo.com/promo"
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <button type="submit" className="panel-boton" disabled={analizando}>
          {analizando ? 'Analizando…' : 'Analizar'}
        </button>
      </form>

      {error && <p className="panel-error">{error}</p>}

      {resultado && (
        <Resultado
          nivel={resultado.nivel}
          subtitulo={resultado.dominioDestino ?? resultado.dominio}
          motivos={resultado.motivos}
        >
          <div className="panel-acciones">
            {resultado.nivel !== 'verde' &&
              (cierre ? (
                <p className="resultado-aviso">{cierre}</p>
              ) : (
                <button type="button" className="panel-boton panel-boton-borde" onClick={reportar}>
                  Reportar este sitio
                </button>
              ))}
            <button type="button" className="panel-boton" onClick={compartir}>
              Mandale esto a tu mamá
            </button>
          </div>
        </Resultado>
      )}

      <section className="panel-seccion">
        <h2>Mis enlaces</h2>
        {historial.length === 0 ? (
          <p className="panel-vacio">Todavía no analizaste ninguno.</p>
        ) : (
          <ul className="historial">
            {historial.map((item) => (
              <li className={`historial-item nivel-${item.nivel_riesgo}`} key={item.id}>
                <span className="historial-punto" aria-hidden="true" />
                <div>
                  <p className="historial-url">{item.url_analizada}</p>
                  <p className="historial-meta">
                    {item.dominio} · {fecha(item.fecha_analisis)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-seccion">
        <h2>Tus reportes</h2>
        {reportes.length === 0 ? (
          <p className="panel-vacio">Cuando denuncies un sitio, el cierre aparece acá.</p>
        ) : (
          <ul className="reportes">
            {reportes.map((item) => (
              <li className="reporte-item" key={item.id}>
                <div>
                  <p className="reporte-dominio">{item.dominio}</p>
                  <p className="reporte-meta">
                    {item.cierre} · {fecha(item.fecha_reporte)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default PanelEnlaces
