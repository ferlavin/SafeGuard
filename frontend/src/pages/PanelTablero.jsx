import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import './Panel.css'

function cayo(ev) {
  return ev.hizo_clic || ev.ingreso_datos
}

function PanelTablero() {
  const [organizacion, setOrganizacion] = useState(undefined)
  const [empleados, setEmpleados] = useState([])
  const [eventos, setEventos] = useState([])
  const [campanas, setCampanas] = useState([])
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function cargar() {
      supabase.rpc('phishguard_activar_refuerzos').then(
        () => {},
        () => {},
      )

      const { data, error: fallo } = await supabase.rpc('phishguard_tablero')
      if (!activo) return

      if (fallo) {
        setError(fallo.message)
        setOrganizacion(null)
        setCargando(false)
        return
      }

      setOrganizacion(data?.organizacion ?? null)
      setEmpleados(Array.isArray(data?.empleados) ? data.empleados : [])
      setEventos(Array.isArray(data?.eventos) ? data.eventos : [])
      setCampanas(Array.isArray(data?.campanas) ? data.campanas : [])
      setCargando(false)
    }

    cargar().catch((fallo) => {
      if (!activo) return
      setError(fallo.message ?? 'No se pudo armar el tablero.')
      setOrganizacion(null)
      setCargando(false)
    })

    return () => {
      activo = false
    }
  }, [])

  const porPersona = useMemo(() => {
    const refuerzoIds = new Set(campanas.filter((c) => c.es_refuerzo).map((c) => c.id))
    return empleados
      .map((emp) => {
        const propios = eventos.filter((e) => e.empleado_id === emp.id)
        const iniciales = propios.filter((e) => !refuerzoIds.has(e.campana_id))
        const refuerzos = propios.filter((e) => refuerzoIds.has(e.campana_id))
        const cayoAlguno = propios.some(cayo)
        const capacitado = propios.some((e) => e.completo_capacitacion)
        const reconocio = propios.some((e) => e.vio_reconocimiento && !e.hizo_clic)
        const mejoro =
          iniciales.some(cayo) && refuerzos.length > 0 && refuerzos.every((e) => !cayo(e))
        return {
          ...emp,
          cayo: cayoAlguno,
          capacitado,
          reconocio,
          mejoro,
          participo: propios.length > 0,
        }
      })
      .sort((a, b) => {
        const area = (a.departamento || 'General').localeCompare(b.departamento || 'General')
        if (area !== 0) return area
        return (a.nombre || '').localeCompare(b.nombre || '')
      })
  }, [empleados, eventos, campanas])

  const porArea = useMemo(() => {
    const grupos = {}
    for (const p of porPersona) {
      const key = p.departamento || 'General'
      if (!grupos[key]) {
        grupos[key] = { area: key, total: 0, cayo: 0, noCayo: 0, cap: 0, mejoro: 0 }
      }
      grupos[key].total += 1
      if (p.cayo) grupos[key].cayo += 1
      else if (p.participo) grupos[key].noCayo += 1
      if (p.capacitado) grupos[key].cap += 1
      if (p.mejoro) grupos[key].mejoro += 1
    }
    return Object.values(grupos)
  }, [porPersona])

  const resumen = useMemo(
    () => ({
      personas: porPersona.length,
      cayo: porPersona.filter((p) => p.cayo).length,
      noCayo: porPersona.filter((p) => !p.cayo && p.participo).length,
      cap: porPersona.filter((p) => p.capacitado).length,
    }),
    [porPersona],
  )

  if (cargando) return <p className="panel-estado">Armando el tablero…</p>

  if (!organizacion) {
    return (
      <div className="panel panel-empresas">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        {error && <p className="panel-error">{error}</p>}
        <p className="panel-vacio">
          Primero hay que <Link to="/panel/empresa">dar de alta la empresa</Link> y cargar
          empleados.
        </p>
      </div>
    )
  }

  return (
    <div className="panel panel-empresas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">PhishGuard</span>
        <h1>Vulnerabilidad del equipo</h1>
        <p className="panel-lead">
          {organizacion.nombre_empresa}. Medimos si la persona cayó, si se capacitó y si
          mejoró en el refuerzo.
        </p>
      </header>

      {error && <p className="panel-error">{error}</p>}

      <ul className="tablero-kpis">
        <li>
          <strong>{resumen.personas}</strong>
          <span>Personas</span>
        </li>
        <li>
          <strong>{resumen.cayo}</strong>
          <span>Cayeron</span>
        </li>
        <li>
          <strong>{resumen.noCayo}</strong>
          <span>No cayeron</span>
        </li>
        <li>
          <strong>{resumen.cap}</strong>
          <span>Capacitados</span>
        </li>
      </ul>

      <section className="panel-seccion">
        <h2>Por área</h2>
        {porArea.length === 0 ? (
          <p className="panel-vacio">
            Todavía no hay gente cargada. <Link to="/panel/empresa">Agregá empleados</Link>.
          </p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla-equipo">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Personas</th>
                  <th>Cayeron</th>
                  <th>No cayeron</th>
                  <th>Se capacitaron</th>
                  <th>Mejoraron</th>
                </tr>
              </thead>
              <tbody>
                {porArea.map((a) => (
                  <tr key={a.area}>
                    <td>{a.area}</td>
                    <td>{a.total}</td>
                    <td>{a.cayo}</td>
                    <td>{a.noCayo}</td>
                    <td>{a.cap}</td>
                    <td>{a.mejoro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-seccion">
        <h2>Por persona</h2>
        {porPersona.length === 0 ? (
          <p className="panel-vacio">
            Cargá empleados y <Link to="/panel/campanas">lanzá una campaña</Link> para ver la
            curva.
          </p>
        ) : (
          <ul className="empleados">
            {porPersona.map((p) => (
              <li className="empleado" key={p.id}>
                <div>
                  <p className="empleado-nombre">{p.nombre}</p>
                  <p className="empleado-meta">{p.departamento || 'General'}</p>
                </div>
                <p className="empleado-meta">
                  {p.cayo ? 'Cayó' : p.participo ? 'No cayó' : 'Sin campaña'}
                  {p.capacitado ? ' · capacitado' : ''}
                  {p.reconocio ? ' · reconoció el engaño' : ''}
                  {p.mejoro ? ' · mejoró' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default PanelTablero
