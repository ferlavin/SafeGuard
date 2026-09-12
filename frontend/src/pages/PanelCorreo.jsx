import { useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../lib/useSesion.js'
import { analizarCorreo } from '../lib/analisisCorreo.js'
import { compartirResultado, guardarAnalisis } from '../lib/enriquecer.js'
import Resultado from '../components/Resultado.jsx'
import './Panel.css'

function PanelCorreo() {
  const { sesion } = useSesion()
  const [crudo, setCrudo] = useState('')
  const [resultado, setResultado] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState(null)

  async function manejarEnvio(evento) {
    evento.preventDefault()
    const analisis = analizarCorreo(crudo)
    if (!analisis) {
      setError('Pegá el contenido del correo para poder revisarlo.')
      return
    }
    setError(null)
    setResultado(analisis)
    setAnalizando(true)
    const { error: fallo } = await guardarAnalisis(sesion, analisis, 'correo')
    setAnalizando(false)
    if (fallo) setError(`El análisis se hizo, pero no se pudo guardar: ${fallo.message}`)
  }

  return (
    <div className="panel">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">SafeLink</span>
        <h1>Revisar un correo</h1>
        <p className="panel-lead">
          En Gmail: tres puntitos → Mostrar original. Pegá todo, incluyendo los encabezados.
        </p>
      </header>

      <form className="panel-form" onSubmit={manejarEnvio}>
        <label className="panel-campo">
          <span>Correo original</span>
          <textarea
            value={crudo}
            onChange={(e) => setCrudo(e.target.value)}
            placeholder="From: ...&#10;Authentication-Results: ..."
          />
        </label>
        <button type="submit" className="panel-boton" disabled={analizando}>
          {analizando ? 'Guardando…' : 'Analizar correo'}
        </button>
      </form>

      {error && <p className="panel-error">{error}</p>}

      {resultado && (
        <Resultado
          nivel={resultado.nivel}
          subtitulo={resultado.asunto || resultado.dominio}
          motivos={resultado.motivos}
        >
          <div className="panel-acciones">
            <button type="button" className="panel-boton" onClick={() => compartirResultado(resultado)}>
              Mandale esto a tu mamá
            </button>
          </div>
        </Resultado>
      )}
    </div>
  )
}

export default PanelCorreo
