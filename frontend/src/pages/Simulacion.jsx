import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase.js'
import './Simulacion.css'

function cuerpoConLink(texto, token) {
  const link = `${window.location.origin}/simulacion/${token}`
  return (texto ?? '').replaceAll('{link}', link)
}

function Simulacion() {
  const { token } = useParams()
  const [ficha, setFicha] = useState(null)
  const [paso, setPaso] = useState('cebo')
  const [error, setError] = useState(null)
  const [clave, setClave] = useState('')

  useEffect(() => {
    let activo = true
    supabase.rpc('phishguard_ver_simulacion', { p_token: token }).then(({ data, error: fallo }) => {
      if (!activo) return
      if (fallo || !data) {
        setError('Ese enlace no existe o ya no está activo.')
        return
      }
      setFicha(data)
      if (data.capacitado) setPaso('leccion')
      else if (data.hizo_clic) setPaso('datos')
    })
    return () => {
      activo = false
    }
  }, [token])

  async function registrar(evento, siguiente) {
    const { data, error: fallo } = await supabase.rpc('phishguard_registrar', {
      p_token: token,
      p_evento: evento,
    })
    if (fallo) {
      setError(fallo.message)
      return
    }
    if (data) setFicha(data)
    setPaso(siguiente)
  }

  if (error) {
    return (
      <main className="sim-pagina">
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

  if (paso === 'leccion') {
    return (
      <main className="sim-pagina sim-leccion">
        <p className="sim-marca">SafeGuard · PhishGuard</p>
        <h1>{leccion.titulo || 'Esto era una simulación'}</h1>
        <p>{leccion.cuerpo || 'El mensaje apuraba y pedía un clic. Eso es el engaño.'}</p>
        {ficha.refuerzo && (
          <p className="sim-nota">Esta era una segunda ronda, un poco más difícil a propósito.</p>
        )}
        {!ficha.capacitado && (
          <button type="button" className="sim-boton" onClick={() => registrar('capacitacion', 'leccion')}>
            Entendido
          </button>
        )}
      </main>
    )
  }

  if (ficha.canal === 'whatsapp') {
    return (
      <main className="sim-pagina sim-wa">
        <header className="wa-barra">
          <span className="wa-avatar" aria-hidden="true" />
          <div>
            <p className="wa-nombre">{ficha.remitente || 'Director'}</p>
            <p className="wa-estado">en línea</p>
          </div>
        </header>
        <div className="wa-chat">
          <p className="wa-burbuja">
            {(ficha.cuerpo ?? '').replaceAll('{link}', '').trim()}
            {paso === 'cebo' && (
              <button type="button" className="wa-link" onClick={() => registrar('clic', 'datos')}>
                Abrir enlace
              </button>
            )}
          </p>
        </div>
        {paso === 'datos' && (
          <form
            className="wa-form"
            onSubmit={(e) => {
              e.preventDefault()
              registrar('datos', 'leccion')
            }}
          >
            <p>Para confirmar, escribí tu clave de acceso. No se guarda ni se envía.</p>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="sim-boton">
              Confirmar
            </button>
          </form>
        )}
      </main>
    )
  }

  if (ficha.canal === 'sms') {
    return (
      <main className="sim-pagina sim-sms">
        <header className="sms-barra">{ficha.remitente || 'Mensaje'}</header>
        <p className="sms-burbuja">
          {cuerpoConLink(ficha.cuerpo, token)}
        </p>
        {paso === 'cebo' && (
          <button type="button" className="sms-link" onClick={() => registrar('clic', 'datos')}>
            Abrir aviso
          </button>
        )}
        {paso === 'datos' && (
          <form
            className="sms-form"
            onSubmit={(e) => {
              e.preventDefault()
              registrar('datos', 'leccion')
            }}
          >
            <p>Ingresá el código de seguimiento. No se guarda.</p>
            <input
              type="text"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="sim-boton">
              Enviar
            </button>
          </form>
        )}
      </main>
    )
  }

  return (
    <main className="sim-pagina sim-mail">
      <p className="mail-de">De: {ficha.remitente}</p>
      <h1>{ficha.asunto}</h1>
      <p>{cuerpoConLink(ficha.cuerpo, token)}</p>
      {paso === 'cebo' && (
        <button type="button" className="sim-boton" onClick={() => registrar('clic', 'datos')}>
          Acceder
        </button>
      )}
      {paso === 'datos' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            registrar('datos', 'leccion')
          }}
        >
          <p>Acceso corporativo. Lo que escribas no se guarda.</p>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Contraseña"
            autoComplete="off"
          />
          <button type="submit" className="sim-boton">
            Ingresar
          </button>
        </form>
      )}
    </main>
  )
}

export default Simulacion
