import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { useSesion } from '../lib/useSesion.js'
import './Ingresar.css'

const mensajes = {
  'Invalid login credentials': 'El correo o la contraseña no coinciden.',
  'Email not confirmed':
    'Todavía no confirmaste el correo. Revisá tu casilla y hacé clic en el enlace.',
  'User already registered':
    'Ese correo ya tiene cuenta. Probá entrar en vez de crearla.',
  'Password should be at least 6 characters.':
    'La contraseña tiene que tener al menos 6 caracteres.',
}

function traducir(error) {
  return mensajes[error.message] ?? error.message
}

// Cuando falla el proveedor externo, Supabase vuelve con el motivo en la query
// o en el hash. Sin leerlo, el usuario solo ve el formulario otra vez.
function errorDeRedirect() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const descripcion =
    query.get('error_description') ?? hash.get('error_description')

  if (!descripcion) return null

  const codigo = query.get('error_code') ?? hash.get('error_code')
  return codigo ? `${descripcion} (${codigo})` : descripcion
}

function LogoGoogle() {
  return (
    <svg className="logo-google" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

function Ingresar() {
  const [modo, setModo] = useState('entrar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(errorDeRedirect)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { sesion, cargando } = useSesion()
  const navegar = useNavigate()

  const crearCuenta = modo === 'crear'

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    setEnviando(true)

    const credenciales = { email: correo, password: clave }
    const { data, error: fallo } = crearCuenta
      ? await supabase.auth.signUp(credenciales)
      : await supabase.auth.signInWithPassword(credenciales)

    setEnviando(false)

    if (fallo) {
      setError(traducir(fallo))
      return
    }

    if (data.session) {
      navegar('/panel')
      return
    }

    setAviso(
      `Te enviamos un correo a ${correo} para confirmar la cuenta. Abrilo y volvé a entrar.`,
    )
  }

  async function entrarConGoogle() {
    setError(null)
    setAviso(null)

    const { error: fallo } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/ingresar` },
    })

    if (fallo) setError(traducir(fallo))
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setError(null)
    setAviso(null)
  }

  if (cargando) {
    return (
      <div className="acceso">
        <p className="acceso-estado">Verificando tu sesión…</p>
      </div>
    )
  }

  if (sesion) return <Navigate to="/panel" replace />

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <h1>{crearCuenta ? 'Crear una cuenta' : 'Ingresar'}</h1>
        <p className="acceso-texto">
          {crearCuenta
            ? 'Con cuenta guardás tu historial en SafeLink y administrás las campañas de PhishGuard.'
            : 'Entrá con el correo con el que te registraste.'}
        </p>

        <button
          type="button"
          className="boton-google"
          onClick={entrarConGoogle}
        >
          <LogoGoogle />
          Continuar con Google
        </button>

        <div className="separador">
          <span>o con tu correo</span>
        </div>

        <div className="acceso-pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!crearCuenta}
            className={!crearCuenta ? 'activa' : undefined}
            onClick={() => cambiarModo('entrar')}
          >
            Ya tengo cuenta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={crearCuenta}
            className={crearCuenta ? 'activa' : undefined}
            onClick={() => cambiarModo('crear')}
          >
            Crear cuenta
          </button>
        </div>

        <form className="acceso-form" onSubmit={manejarEnvio}>
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@empresa.com"
          />

          <label htmlFor="clave">Contraseña</label>
          <input
            id="clave"
            type="password"
            autoComplete={crearCuenta ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Al menos 6 caracteres"
          />

          {error && (
            <p className="acceso-error" role="alert">
              {error}
            </p>
          )}
          {aviso && (
            <p className="acceso-aviso" role="status">
              {aviso}
            </p>
          )}

          <button type="submit" className="acceso-boton" disabled={enviando}>
            {enviando
              ? 'Un momento…'
              : crearCuenta
                ? 'Crear cuenta'
                : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Ingresar
