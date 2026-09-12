import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../lib/supabase.js'
import './Simulacion.css'

function Reconocimiento() {
  const { token } = useParams()
  const [ficha, setFicha] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    supabase.rpc('phishguard_ver_simulacion', { p_token: token }).then(async ({ data, error: fallo }) => {
      if (!activo) return
      if (fallo || !data) {
        setError('Ese enlace no existe o ya no está activo.')
        return
      }

      if (data.hizo_clic) {
        setFicha(data)
        return
      }

      const { data: actualizado } = await supabase.rpc('phishguard_registrar', {
        p_token: token,
        p_evento: 'reconocimiento',
      })
      setFicha(actualizado ?? data)
    })

    return () => {
      activo = false
    }
  }, [token])

  if (error) {
    return (
      <main className="sim-pagina sim-leccion">
        <p className="sim-error">{error}</p>
      </main>
    )
  }

  if (!ficha) {
    return (
      <main className="sim-pagina">
        <p>Cargando…</p>
      </main>
    )
  }

  const leccion = ficha.leccion ?? {}

  if (ficha.hizo_clic) {
    return (
      <main className="sim-pagina sim-leccion">
        <p className="sim-marca">SafeGuard · PhishGuard</p>
        <h1>Esta parte ya la viste</h1>
        <p>
          Tocaste el enlace de la simulación, así que la lección te la mostramos
          en ese momento. Gracias por completar el entrenamiento.
        </p>
        <Link to="/">Ir a SafeGuard</Link>
      </main>
    )
  }

  return (
    <main className="sim-pagina sim-leccion">
      <p className="sim-marca">SafeGuard · PhishGuard</p>
      <h1>Lo hiciste bien, {ficha.nombre}</h1>
      <p>
        No tocaste el enlace. Eso es exactamente lo que había que hacer. Acá va
        por qué era una trampa, para que el entrenamiento no se sienta un examen
        en el que solo se aprende si se falla.
      </p>
      <h2>{leccion.titulo || 'Por qué era riesgoso'}</h2>
      <p>{leccion.cuerpo || 'El mensaje apuraba y pedía un clic. Un pedido real no llega así.'}</p>
    </main>
  )
}

export default Reconocimiento
