import { useEffect, useRef, useState } from 'react'
import { consultarFaro } from '../lib/faro.js'
import './ConsultaFaro.css'

const SUGERENCIAS = [
  '¿Por qué dio este resultado?',
  '¿Puedo abrirlo?',
  '¿Y si ya hice clic?',
  '¿A quién le aviso?',
]

const SALUDO = 'Hola. Soy Faro. Preguntame lo que necesites sobre este resultado.'

function RobotFaro({ pensando = false }) {
  return (
    <svg
      className={pensando ? 'faro-robot faro-robot-piensa' : 'faro-robot'}
      viewBox="0 0 64 76"
      aria-hidden="true"
    >
      <ellipse cx="32" cy="72" rx="14" ry="2.5" fill="rgb(0 0 0 / 35%)" />
      <rect x="22" y="42" width="20" height="18" rx="7" fill="#d5dde6" />
      <rect x="27" y="47" width="10" height="7" rx="2" fill="#1a2433" />
      <circle cx="32" cy="26" r="16" fill="#e4ebf2" />
      <circle cx="13" cy="26" r="3.2" fill="#9aa6b5" />
      <circle cx="51" cy="26" r="3.2" fill="#9aa6b5" />
      <rect x="18" y="22" width="28" height="11" rx="5" fill="#102018" />
      <rect className="faro-visor" x="20" y="24" width="24" height="7" rx="3.5" fill="#3dff9a" />
      <path d="M44 48h12l-1 12-5 4-5-4z" fill="#2a9a96" />
      <path d="M47.5 54.5l2.2 2.2 4.2-4.4" fill="none" stroke="#eef2f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ConsultaFaro({ nivel, motivos }) {
  const [abierta, setAbierta] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [pensando, setPensando] = useState(false)
  const campo = useRef(null)
  const firma = `${nivel}|${Array.isArray(motivos) ? motivos.join('\n') : motivos ?? ''}`

  useEffect(() => {
    setMensajes([])
    setPregunta('')
    setPensando(false)
    setAbierta(false)
  }, [firma])

  useEffect(() => {
    if (abierta) campo.current?.focus()
  }, [abierta])

  function abrir() {
    setAbierta(true)
    setMensajes((prev) => (prev.length ? prev : [{ rol: 'faro', texto: SALUDO }]))
  }

  async function consultar(texto) {
    const limpio = texto.trim()
    if (!limpio || pensando) return
    setPregunta('')
    setAbierta(true)
    setPensando(true)
    const previos = mensajes
    setMensajes((prev) => [...prev, { rol: 'vos', texto: limpio }])
    const respuesta = await consultarFaro({
      nivel,
      motivos,
      pregunta: limpio,
      historial: previos,
    })
    setMensajes((prev) => [...prev, { rol: 'faro', texto: respuesta }])
    setPensando(false)
  }

  return (
    <section className="faro" aria-label="Consulta con Faro">
      {abierta ? (
        <>
          <div className="faro-cabeza">
            <h3>Faro</h3>
            <p>No vuelve a leer el mensaje ni cambia el semáforo.</p>
          </div>
          <div className="faro-sugerencias">
            {SUGERENCIAS.map((sugerencia) => (
              <button type="button" key={sugerencia} disabled={pensando} onClick={() => consultar(sugerencia)}>
                {sugerencia}
              </button>
            ))}
          </div>
          <div className="faro-cuerpo">
            <RobotFaro pensando={pensando} />
            <div className="faro-dialogo">
          {mensajes.length > 0 && (
            <ol className="faro-chat" aria-live="polite">
              {mensajes.map((mensaje, indice) => (
                <li key={`${mensaje.rol}-${indice}`} className={mensaje.rol === 'faro' ? 'faro-msg-faro' : 'faro-msg-vos'}>
                  <span>{mensaje.rol === 'faro' ? 'Faro' : 'Vos'}</span>
                  <p>{mensaje.texto}</p>
                </li>
              ))}
            </ol>
          )}
          {pensando && <p className="faro-espera">Faro está pensando…</p>}
          <form
            className="faro-form"
            onSubmit={(evento) => {
              evento.preventDefault()
              consultar(pregunta)
            }}
          >
            <label className="faro-campo">
              <span className="faro-etiqueta">Pregunta para Faro</span>
              <input
                ref={campo}
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
                placeholder="Escribí cualquier duda sobre este caso"
                disabled={pensando}
              />
            </label>
            <button type="submit" className="panel-boton" disabled={pensando}>
              Enviar
            </button>
          </form>
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="faro-abrir" aria-expanded="false" onClick={abrir}>
          <RobotFaro />
          ¿Preguntale a Faro?
        </button>
      )}
    </section>
  )
}

export default ConsultaFaro
