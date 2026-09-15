import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { copiarTexto } from '../lib/copiar.js'
import { supabase } from '../lib/supabase.js'
import { useSesion } from '../lib/useSesion.js'
import './Panel.css'

const CANALES = [
  { id: 'whatsapp', etiqueta: 'WhatsApp' },
  { id: 'sms', etiqueta: 'SMS' },
  { id: 'email', etiqueta: 'Mail' },
]

function fecha(valor) {
  if (!valor) return ''
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function enlace(token, tipo) {
  const base = window.location.origin
  return tipo === 'bien' ? `${base}/bien/${token}` : `${base}/simulacion/${token}`
}

function plantillaDe(campana) {
  const p = campana.plantillas_phishing
  return Array.isArray(p) ? p[0] : p
}

function textoSimulacion(campana, token) {
  const plantilla = plantillaDe(campana)
  const link = enlace(token, 'sim')
  const cuerpo = (plantilla?.cuerpo_html ?? 'Entrá acá: {link}').replaceAll('{link}', link)
  if (campana.canal === 'email') {
    const de = plantilla?.remitente_falso ? `De: ${plantilla.remitente_falso}\n` : ''
    const asunto = plantilla?.asunto_mail ? `Asunto: ${plantilla.asunto_mail}\n\n` : ''
    return `${de}${asunto}${cuerpo}`
  }
  return cuerpo
}

function textoBien(ev) {
  const nombre = (ev.empleados?.nombre ?? '').split(' ')[0]
  const saludo = nombre ? `${nombre}, ` : ''
  return `${saludo}esto era una simulación de PhishGuard. No tenías que tocar el enlace. La explicación está acá: ${enlace(ev.token_unico, 'bien')}`
}

function metricas(eventos) {
  const total = eventos.length
  const clic = eventos.filter((e) => e.hizo_clic).length
  const datos = eventos.filter((e) => e.ingreso_datos).length
  const cap = eventos.filter((e) => e.completo_capacitacion).length
  const bien = eventos.filter((e) => e.vio_reconocimiento && !e.hizo_clic).length
  return { total, clic, datos, cap, bien }
}

async function inspirarDesdeSafeLink() {
  const { data: amenazas } = await supabase
    .from('amenazas')
    .select('dominio, motivo')
    .eq('nivel', 'rojo')

  if (!amenazas?.length) return 0

  const ya = new Set(
    (await supabase.from('plantillas_phishing').select('amenaza_dominio')).data
      ?.map((p) => p.amenaza_dominio)
      .filter(Boolean) ?? [],
  )

  const nuevas = amenazas.filter((a) => !ya.has(a.dominio))
  if (nuevas.length === 0) return 0

  const { error: fallo } = await supabase.from('plantillas_phishing').insert(
    nuevas.map((a) => ({
      titulo: `Estafa real: ${a.dominio}`,
      asunto_mail: `Reclamo pendiente — ${a.dominio}`,
      remitente_falso: `Soporte ${a.dominio}`,
      cuerpo_html: `Hola, te escribe ${a.dominio}. Tenés un reclamo pendiente. Entrá ahora o se vence el plazo: {link}`,
      nivel_dificultad: 'alto',
      categoria: 'AMENAZA_REAL',
      canal: 'whatsapp',
      amenaza_dominio: a.dominio,
      metadata: {
        lesson: {
          titulo: `Esta estafa ya circuló: ${a.dominio}`,
          cuerpo: `SafeLink marcó ${a.dominio} en rojo${a.motivo ? ` (${a.motivo})` : ''}. El mensaje apura y usa un nombre que parece conocido. Nadie de un sitio serio te pide por WhatsApp que entres a un link así.`,
        },
      },
    })),
  )

  return fallo ? 0 : nuevas.length
}

async function cargar() {
  const vacio = { organizacion: null, plantillas: [], empleados: [], campanas: [], error: null }

  const { data: orgs, error: falloOrg } = await supabase
    .from('organizaciones')
    .select('id, nombre_empresa')
    .limit(1)

  if (falloOrg) return { ...vacio, error: falloOrg.message }

  const org = orgs?.[0] ?? null
  if (!org) return vacio

  const [{ data: tpls }, { data: emps }, { data: camps, error: falloCamps }] = await Promise.all([
    supabase
      .from('plantillas_phishing')
      .select('id, titulo, categoria, nivel_dificultad, canal, asunto_mail, amenaza_dominio')
      .order('nivel_dificultad'),
    supabase
      .from('empleados')
      .select('id, nombre, email, departamento')
      .eq('estado', 'activo')
      .order('nombre'),
    supabase
      .from('campanas')
      .select(
        'id, nombre_campana, estado, canal, es_refuerzo, fecha_inicio, creado_en, plantilla_id, extra, plantillas_phishing(titulo, asunto_mail, remitente_falso, cuerpo_html), eventos_simulacion(id, token_unico, hizo_clic, ingreso_datos, completo_capacitacion, vio_reconocimiento, empleados(nombre, email, departamento))',
      )
      .order('creado_en', { ascending: false }),
  ])

  return {
    organizacion: org,
    plantillas: tpls ?? [],
    empleados: emps ?? [],
    campanas: camps ?? [],
    error: falloCamps ? falloCamps.message : null,
  }
}

function PanelCampanas() {
  const { sesion } = useSesion()
  const [organizacion, setOrganizacion] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [campanas, setCampanas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const [canal, setCanal] = useState('whatsapp')
  const [plantillaId, setPlantillaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [elegidos, setElegidos] = useState([])
  const [creando, setCreando] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const [copiado, setCopiado] = useState(null)

  const visibles = useMemo(
    () => plantillas.filter((p) => p.canal === canal || p.canal === 'todos'),
    [plantillas, canal],
  )

  useEffect(() => {
    let activo = true

    async function preparar() {
      await supabase.rpc('phishguard_activar_refuerzos')
      const n = await inspirarDesdeSafeLink()
      const estado = await cargar()
      if (n > 0) {
        estado.aviso = `SafeLink aportó ${n} plantilla${n === 1 ? '' : 's'} nueva${n === 1 ? '' : 's'} a partir de amenazas reales.`
      }
      return estado
    }

    preparar().then((estado) => {
      if (!activo) return
      setOrganizacion(estado.organizacion)
      setPlantillas(estado.plantillas)
      setEmpleados(estado.empleados)
      setCampanas(estado.campanas)
      if (estado.error) setError(estado.error)
      if (estado.aviso) setAviso(estado.aviso)
      setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [])

  function alternar(id) {
    setElegidos((previo) =>
      previo.includes(id) ? previo.filter((x) => x !== id) : [...previo, id],
    )
  }

  async function crearCampana(evento) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    if (elegidos.length === 0) {
      setError('Elegí al menos un empleado.')
      return
    }

    setCreando(true)
    const id = crypto.randomUUID()
    const { error: falloCampana } = await supabase.from('campanas').insert({
      id,
      organizacion_id: organizacion.id,
      plantilla_id: plantillaId || null,
      nombre_campana: nombre.trim(),
      estado: 'en_proceso',
      canal,
      fecha_inicio: new Date().toISOString(),
    })

    if (falloCampana) {
      setCreando(false)
      setError(`No se pudo crear la campaña: ${falloCampana.message}`)
      return
    }

    const { error: falloEventos } = await supabase.from('eventos_simulacion').insert(
      elegidos.map((empleadoId) => ({
        campana_id: id,
        empleado_id: empleadoId,
        token_unico: crypto.randomUUID().replaceAll('-', ''),
      })),
    )

    const estado = await cargar()
    setCreando(false)
    setCampanas(estado.campanas)
    setNombre('')
    setElegidos([])
    setAbierta(id)
    if (falloEventos) {
      setError(`La campaña quedó creada pero no se generaron los enlaces: ${falloEventos.message}`)
      return
    }

    const { data: mail, error: falloMail } = await supabase.functions.invoke(
      'phishguard-avisar-campana',
      {
        body: { campana_id: id, origen: window.location.origin },
      },
    )
    const detalle =
      mail?.error ??
      (typeof mail === 'string' ? mail : null) ??
      falloMail?.context?.error ??
      falloMail?.message
    if (mail?.ok === true) {
      setAviso(
        mail.aviso ??
          `Te enviamos un correo a ${mail.destino ?? sesion?.user?.email} con los enlaces de la campaña.`,
      )
    } else {
      setError(
        `La campaña se creó, pero el correo no salió${
          sesion?.user?.email ? ` a ${sesion.user.email}` : ''
        }: ${detalle || 'Resend no aceptó el envío'}. Revisá spam y que el secreto se llame RESEND_API_KEY. Mientras tanto, copiá los enlaces de abajo.`,
      )
    }
  }

  async function copiarYMarcar(clave, texto) {
    const ok = await copiarTexto(texto)
    if (!ok) {
      setError('No se pudo copiar. Seleccioná el texto y copialo a mano.')
      return
    }
    setCopiado(clave)
    window.setTimeout(() => {
      setCopiado((actual) => (actual === clave ? null : actual))
    }, 2000)
  }

  async function lanzarRefuerzo(id) {
    setError(null)
    const { error: fallo } = await supabase.rpc('phishguard_lanzar_refuerzo', {
      p_campana_id: id,
    })
    if (fallo) {
      setError(fallo.message)
      return
    }
    const estado = await cargar()
    setCampanas(estado.campanas)
    setAbierta(id)
  }

  if (cargando) return <p className="panel-estado">Cargando tus campañas…</p>

  if (!organizacion) {
    return (
      <div className="panel">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
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
        <h1>Campañas</h1>
        <p className="panel-lead">
          El CEO fraudulento y el paquete retenido se simulan por WhatsApp o SMS.
          Quien cae recibe un refuerzo más difícil a las 3 semanas.
        </p>
      </header>

      {error && <p className="panel-error">{error}</p>}
      {aviso && <p className="panel-aviso">{aviso}</p>}

      {empleados.length === 0 ? (
        <p className="panel-vacio">
          No hay empleados activos. <Link to="/panel/empresa">Cargalos acá</Link>.
        </p>
      ) : (
        <form className="panel-form" onSubmit={crearCampana}>
          <label className="panel-campo">
            <span>Nombre de la campaña</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>

          <label className="panel-campo">
            <span>Canal</span>
            <select
              value={canal}
              onChange={(e) => {
                setCanal(e.target.value)
                setPlantillaId('')
              }}
            >
              {CANALES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="panel-campo">
            <span>Plantilla</span>
            <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} required>
              <option value="">Elegí una</option>
              {visibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.amenaza_dominio ? 'SafeLink · ' : ''}
                  {p.titulo} ({p.nivel_dificultad})
                </option>
              ))}
            </select>
          </label>

          <fieldset className="panel-campo">
            <legend>Destinatarios</legend>
            {empleados.map((empleado) => (
              <label className="check-empleado" key={empleado.id}>
                <input
                  type="checkbox"
                  checked={elegidos.includes(empleado.id)}
                  onChange={() => alternar(empleado.id)}
                />
                {empleado.nombre} · {empleado.departamento}
              </label>
            ))}
          </fieldset>

          <button type="submit" className="panel-boton" disabled={creando}>
            {creando ? 'Creando…' : 'Crear campaña'}
          </button>
        </form>
      )}

      <section className="panel-seccion">
        <h2>Listado</h2>
        {campanas.length === 0 ? (
          <p className="panel-vacio">Todavía no hay campañas.</p>
        ) : (
          <ul className="campanas">
            {campanas.map((campana) => {
              const evs = campana.eventos_simulacion ?? []
              const m = metricas(evs)
              const abiertaEsta = abierta === campana.id
              return (
                <li className="campana" key={campana.id}>
                  <button
                    type="button"
                    className="campana-cabecera"
                    onClick={() => setAbierta(abiertaEsta ? null : campana.id)}
                  >
                    <div>
                      <p className="campana-nombre">
                        {campana.nombre_campana}
                        {campana.es_refuerzo ? ' · refuerzo' : ''}
                      </p>
                      <p className="campana-meta">
                        {campana.canal} · {campana.estado}
                        {campana.es_refuerzo && campana.estado === 'programada'
                          ? ` · se lanza el ${fecha(campana.fecha_inicio)}`
                          : ''}
                        {m.total
                          ? ` · ${m.clic} clic · ${m.datos} datos · ${m.cap} capacitados · ${m.bien} lo hicieron bien`
                          : ''}
                      </p>
                    </div>
                  </button>

                  {abiertaEsta && (
                    <div className="campana-cuerpo">
                      {campana.es_refuerzo && campana.estado === 'programada' && (
                        <button
                          type="button"
                          className="panel-boton panel-boton-borde"
                          onClick={() => lanzarRefuerzo(campana.id)}
                        >
                          Lanzar refuerzo ahora
                        </button>
                      )}

                      {evs.length === 0 ? (
                        <p className="panel-vacio">
                          {campana.estado === 'programada'
                            ? 'Todavía no se envió. Cuando se lance, aparecen los enlaces.'
                            : 'Sin destinatarios.'}
                        </p>
                      ) : (
                        <ul className="enlaces-sim">
                          {evs.map((ev) => (
                            <li key={ev.id}>
                              <p>
                                {ev.empleados?.nombre ?? 'Empleado'}
                                {ev.hizo_clic ? ' · cayó' : ''}
                                {ev.completo_capacitacion ? ' · capacitado' : ''}
                                {ev.vio_reconocimiento && !ev.hizo_clic
                                  ? ' · reconoció'
                                  : ''}
                              </p>
                              <p className="historial-meta">{enlace(ev.token_unico, 'sim')}</p>
                              <div className="panel-acciones">
                                <button
                                  type="button"
                                  className="panel-boton panel-boton-borde"
                                  onClick={() =>
                                    copiarYMarcar(`${ev.id}-sim`, textoSimulacion(campana, ev.token_unico))
                                  }
                                >
                                  {copiado === `${ev.id}-sim` ? 'Copiado' : 'Copiar simulación'}
                                </button>
                                {!ev.hizo_clic && (
                                  <button
                                    type="button"
                                    className="panel-boton panel-boton-borde"
                                    onClick={() => copiarYMarcar(`${ev.id}-bien`, textoBien(ev))}
                                  >
                                    {copiado === `${ev.id}-bien`
                                      ? 'Copiado'
                                      : 'Copiar “lo hiciste bien”'}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default PanelCampanas
