import { useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../lib/useSesion.js'
import { analizarPdf } from '../lib/analisisPdf.js'
import { guardarAnalisis } from '../lib/enriquecer.js'
import Resultado from '../components/Resultado.jsx'
import './Panel.css'

function PanelPdf() {
  const { sesion } = useSesion()
  const [resultado, setResultado] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState(null)

  async function manejarArchivo(evento) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    setError(null)
    setResultado(null)
    setAnalizando(true)

    try {
      const analisis = await analizarPdf(archivo)
      setResultado(analisis)
      const { error: fallo } = await guardarAnalisis(sesion, analisis, 'pdf')
      if (fallo) setError(`El análisis se hizo, pero no se pudo guardar: ${fallo.message}`)
    } catch (fallo) {
      setError(`No se pudo leer el PDF: ${fallo.message}`)
    } finally {
      setAnalizando(false)
    }
  }

  return (
    <div className="panel panel-personas">
      <header className="panel-header">
        <Link className="panel-volver" to="/panel">
          ← Volver al panel
        </Link>
        <span className="panel-tag">SafeLink</span>
        <h1>Revisar un PDF</h1>
        <p className="panel-lead">El archivo se lee en tu navegador. No se sube a ningún servidor.</p>
      </header>

      <label className="panel-campo">
        <span>Archivo</span>
        <input type="file" accept="application/pdf" onChange={manejarArchivo} />
      </label>

      {analizando && <p className="panel-estado">Leyendo el PDF…</p>}
      {error && <p className="panel-error">{error}</p>}

      {resultado && (
        <Resultado nivel={resultado.nivel} subtitulo={resultado.nombre} motivos={resultado.motivos} />
      )}
    </div>
  )
}

export default PanelPdf
