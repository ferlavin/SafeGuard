import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { useSesion } from '../lib/useSesion.js'
import './Panel.css'

const PLANES = ['Inicial', 'PyME', 'Corporativo', 'Educativo']

async function cargar() {
  const { data: orgs, error: falloOrg } = await supabase
    .from('organizaciones')
    .select('id, nombre_empresa, plan_id, estado_suscripcion')
    .limit(1)

  if (falloOrg) {
    return { organizacion: null, empleados: [], error: falloOrg.message }
  }

  const org = orgs?.[0] ?? null
  if (!org) return { organizacion: null, empleados: [], error: null }

  const { data: personas, error: falloEmp } = await supabase
    .from('empleados')
    .select('id, nombre, email, departamento, estado')
    .order('creado_en', { ascending: false })

  return {
    organizacion: org,
    empleados: personas ?? [],
    error: falloEmp ? falloEmp.message : null,
  }
}

function PanelEmpresa() {
  const { sesion } = useSesion()
  const [organizacion, setOrganizacion] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [plan, setPlan] = useState('Inicial')
  const [creando, setCreando] = useState(false)

  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [area, setArea] = useState('')

  useEffect(() => {
    let activo = true
    cargar().then((estado) => {
      if (!activo) return
      setOrganizacion(estado.organizacion)
      setEmpleados(estado.empleados)
      if (estado.error) setError(estado.error)
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [])

  async function crearEmpresa(evento) {
    evento.preventDefault()
    setError(null)
    setCreando(true)

    const { error: fallo } = await supabase.rpc('provision_it_admin', {
      p_nombre:
        sesion.user.user_metadata?.full_name ??
        sesion.user.user_metadata?.name ??
        sesion.user.email,
      p_empresa: nombreEmpresa.trim(),
      p_plan: plan,
    })

    setCreando(false)
    if (fallo) {
      setError(`No se pudo crear la empresa: ${fallo.message}`)
      return
    }

    const estado = await cargar()
    setOrganizacion(estado.organizacion)
    setEmpleados(estado.empleados)
    if (estado.error) setError(estado.error)
  }

  async function agregarEmpleado(evento) {
    evento.preventDefault()
    setError(null)

    const { data, error: fallo } = await supabase
      .from('empleados')
      .insert({
        organizacion_id: organizacion.id,
        nombre: nombre.trim(),
        email: correo.trim().toLowerCase(),
        departamento: area.trim() || 'General',
      })
      .select('id, nombre, email, departamento, estado')
      .single()

    if (fallo) {
      setError(
        fallo.code === '23505'
          ? 'Ese correo ya está cargado en tu empresa.'
          : `No se pudo agregar: ${fallo.message}`,
      )
      return
    }

    setEmpleados((previo) => [data, ...previo])
    setNombre('')
    setCorreo('')
    setArea('')
  }

  async function quitarEmpleado(id) {
    setError(null)
    const { error: fallo } = await supabase.from('empleados').delete().eq('id', id)
    if (fallo) setError(`No se pudo quitar: ${fallo.message}`)
    else setEmpleados((previo) => previo.filter((e) => e.id !== id))
  }

  if (cargando) return <p className="panel-estado">Cargando tu empresa…</p>

  return (
    <div className="panel panel-empresas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">PhishGuard</span>
        <h1>{organizacion ? organizacion.nombre_empresa : 'Dar de alta tu empresa'}</h1>
        <p className="panel-lead">
          {organizacion
            ? `Plan ${organizacion.plan_id}. Acá cargás a la gente que va a recibir las simulaciones.`
            : 'Con el nombre alcanza. Después armás las campañas por WhatsApp, SMS o mail.'}
        </p>
      </header>

      {error && <p className="panel-error">{error}</p>}

      {!organizacion ? (
        <form className="panel-form" onSubmit={crearEmpresa}>
          <label className="panel-campo">
            <span>Nombre de la empresa</span>
            <input
              type="text"
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              required
            />
          </label>
          <label className="panel-campo">
            <span>Plan</span>
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLANES.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="panel-boton" disabled={creando}>
            {creando ? 'Creando…' : 'Crear empresa'}
          </button>
        </form>
      ) : (
        <>
          <section className="panel-seccion">
            <h2>Agregar empleado</h2>
            <form className="panel-form panel-form-fila" onSubmit={agregarEmpleado}>
              <label className="panel-campo">
                <span>Nombre</span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </label>
              <label className="panel-campo">
                <span>Correo</span>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </label>
              <label className="panel-campo">
                <span>Área</span>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="General"
                />
              </label>
              <button type="submit" className="panel-boton">
                Agregar
              </button>
            </form>
          </section>

          <section className="panel-seccion">
            <h2>Empleados ({empleados.length})</h2>
            {empleados.length === 0 ? (
              <p className="panel-vacio">
                Todavía no cargaste a nadie. Sin empleados no hay campaña.
              </p>
            ) : (
              <ul className="empleados">
                {empleados.map((empleado) => (
                  <li className="empleado" key={empleado.id}>
                    <div>
                      <p className="empleado-nombre">{empleado.nombre}</p>
                      <p className="empleado-meta">
                        {empleado.email} · {empleado.departamento}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="empleado-quitar"
                      onClick={() => quitarEmpleado(empleado.id)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default PanelEmpresa
