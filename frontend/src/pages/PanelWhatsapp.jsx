import { useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../lib/useSesion.js'
import { analizarWhatsapp, cerrarWhatsapp } from '../lib/analisisWhatsapp.js'
import { consultarAmenaza, enriquecer, guardarAnalisis, reportarDominio } from '../lib/enriquecer.js'
import Resultado from '../components/Resultado.jsx'
import './Panel.css'

function PanelWhatsapp() {
  const { sesion } = useSesion()
  const [texto, setTexto] = useState('')
  const [resultado, setResultado] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [cierre, setCierre] = useState(null)
  const [error, setError] = useState(null)

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError(null)
    setCierre(null)

    const local = analizarWhatsapp(texto)
    if (!local) {
      setError('Pegá el mensaje completo, como te llegó.')
      return
    }

    setAnalizando(true)

    const peor = local.enlaces[0]
    const [{ amenaza }, extra] = await Promise.all([
      consultarAmenaza(local.dominio !== 'whatsapp' ? local.dominio : null),
      peor ? enriquecer(peor.url) : Promise.resolve(null),
    ])

    const final = cerrarWhatsapp(local, amenaza, extra)
    setResultado(final)

    const { error: fallo } = await guardarAnalisis(sesion, final, 'whatsapp')
    setAnalizando(false)
    if (fallo) {
      setError(`El análisis se hizo, pero no se pudo guardar: ${fallo.message}`)
    }
  }

  async function reportar() {
    if (!resultado || resultado.dominio === 'whatsapp') return
    const { data, error: fallo } = await reportarDominio(resultado, 'whatsapp')
    if (fallo) setError(fallo.message)
    else setCierre(data.cierre)
  }

  return (
    <div className="panel panel-personas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">SafeLink</span>
        <h1>Pegar un WhatsApp</h1>
        <p className="panel-lead">
          Copiá el mensaje entero. Mucha gente no distingue el enlace: nosotros
          sacamos el texto, el número y los links juntos.
        </p>
      </header>

      <form className="panel-form" onSubmit={manejarEnvio}>
        <label className="panel-campo">
          <span>Mensaje</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Hola, soy del banco. Tu cuenta se bloquea hoy. Entrá acá: bit.ly/xxxx'}
          />
        </label>
        <button type="submit" className="panel-boton" disabled={analizando}>
          {analizando ? 'Analizando…' : 'Analizar mensaje'}
        </button>
      </form>

      {error && <p className="panel-error">{error}</p>}

      {resultado && (
        <Resultado
          nivel={resultado.nivel}
          subtitulo={
            resultado.dominio === 'whatsapp'
              ? 'Mensaje sin enlace claro'
              : (resultado.dominioDestino ?? resultado.dominio)
          }
          motivos={resultado.motivos}
        >
          {resultado.nivel !== 'verde' && resultado.dominio !== 'whatsapp' && (
            <div className="panel-acciones">
              {cierre ? (
                <p className="resultado-aviso">{cierre}</p>
              ) : (
                <button type="button" className="panel-boton panel-boton-borde" onClick={reportar}>
                  Reportar este sitio
                </button>
              )}
            </div>
          )}
        </Resultado>
      )}
    </div>
  )
}

export default PanelWhatsapp
