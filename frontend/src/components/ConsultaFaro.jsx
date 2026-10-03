import { useEffect, useState } from 'react'
import { responderFaro } from '../lib/faro.js'
import './ConsultaFaro.css'

const SUGERENCIAS = [
  '¿Por qué dio este resultado?',
  '¿Puedo abrirlo?',
  '¿Y si ya hice clic?',
  '¿A quién le aviso?',
]

function ConsultaFaro({ nivel, motivos }) {
  const [abierta, setAbierta] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState([])
  const firma = `${nivel}|${Array.isArray(motivos) ? motivos.join('\n') : motivos ?? ''}`

  useEffect(() => {
    setMensajes([])
    setPregunta('')
  }, [firma])

  function consultar(texto) {
    const limpio = texto.trim()
    if (!limpio) return
    const respuesta = responderFaro({ nivel, motivos, pregunta: limpio })
    setMensajes((prev) => [
      ...prev,
      { rol: 'vos', texto: limpio },
      { rol: 'faro', texto: respuesta },
    ])
    setPregunta('')
    setAbierta(true)
  }

  return (
    <section className="faro" aria-label="Consulta con Faro">
      <div className="faro-cabeza">
        <h3>Faro</h3>
        <p>Consulta sobre este resultado. Faro no vuelve a leer el mensaje.</p>
      </div>
      {abierta ? (
        <>
          <div className="faro-sugerencias">
            {SUGERENCIAS.map((sugerencia) => (
              <button type="button" key={sugerencia} onClick={() => consultar(sugerencia)}>
                {sugerencia}
              </button>
            ))}
          </div>
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
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
                placeholder="Escribí tu duda"
              />
            </label>
            <button type="submit" className="panel-boton">
              Enviar
            </button>
          </form>
        </>
      ) : (
        <button type="button" className="panel-boton panel-boton-borde" onClick={() => setAbierta(true)}>
          Preguntale a Faro
        </button>
      )}
    </section>
  )
}

export default ConsultaFaro
