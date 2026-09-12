import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import './Panel.css'

function cayó(ev) {
  return ev.hizo_clic || ev.ingreso_datos
}

function PanelTablero() {
  const [empleados, setEmpleados] = useState([])
  const [eventos, setEventos] = useState([])
  const [campanas, setCampanas] = useState([])
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    supabase.rpc('phishguard_activar_refuerzos').finally(async () => {
      const [{ data: emps, error: e1 }, { data: evs, error: e2 }, { data: cams }] =
        await Promise.all([
          supabase.from('empleados').select('id, nombre, email, departamento').eq('estado', 'activo'),
          supabase
            .from('eventos_simulacion')
            .select(
              'id, empleado_id, campana_id, hizo_clic, ingreso_datos, completo_capacitacion, vio_reconocimiento',
            ),
          supabase.from('campanas').select('id, es_refuerzo, nombre_campana'),
        ])

      if (!activo) return
      if (e1 || e2) setError((e1 ?? e2).message)
      setEmpleados(emps ?? [])
      setEventos(evs ?? [])
      setCampanas(cams ?? [])
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
        const cayo = propios.some(cayó)
        const capacitado = propios.some((e) => e.completo_capacitacion)
        const reconocio = propios.some((e) => e.vio_reconocimiento && !e.hizo_clic)
        const mejoro =
          iniciales.some(cayó) && refuerzos.length > 0 && refuerzos.every((e) => !cayó(e))
        return {
          ...emp,
          cayo,
          capacitado,
          reconocio,
          mejoro,
          participo: propios.length > 0,
        }
      })
      .sort(
        (a, b) =>
          (a.departamento || 'General').localeCompare(b.departamento || 'General') ||
          a.nombre.localeCompare(b.nombre),
      )
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

  if (cargando) return <p className="panel-estado">Armando el tablero…</p>

  return (
    <div className="panel panel-empresas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">PhishGuard</span>
        <h1>Vulnerabilidad del equipo</h1>
        <p className="panel-lead">
          No medimos el antivirus: medimos si la persona cayó, si se capacitó y si
          mejoró en el refuerzo.
        </p>
      </header>

      {error && <p className="panel-error">{error}</p>}

      <section className="panel-seccion">
        <h2>Por área</h2>
        {porArea.length === 0 ? (
          <p className="panel-vacio">Todavía no hay gente cargada.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tablero">
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
          <p className="panel-vacio">Cargá empleados y lanzá una campaña para ver la curva.</p>
        ) : (
          <ul className="empleados">
            {porPersona.map((p) => (
              <li className="empleado" key={p.id}>
                <div>
                  <p className="empleado-nombre">{p.nombre}</p>
                  <p className="empleado-meta">{p.departamento}</p>
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
