import { Link, Outlet } from 'react-router'
import { supabase } from '../lib/supabase.js'
import { useSesion } from '../lib/useSesion.js'
import './Layout.css'

function ShieldMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5 4.5 5.6v6.1c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.6L12 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12.2 2.4 2.4 4.4-4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Layout() {
  const { sesion } = useSesion()

  return (
    <div className="page">
      <header className="header">
        <div className="shell header-inner">
          <Link className="brand" to="/">
            <ShieldMark />
            SafeGuard
          </Link>

          {sesion ? (
            <div className="sesion">
              <Link className="login-link" to="/panel">
                Mi panel
              </Link>
              <span className="sesion-correo">{sesion.user.email}</span>
              <button
                type="button"
                className="login-link"
                onClick={() => supabase.auth.signOut()}
              >
                Salir
              </button>
            </div>
          ) : (
            <Link className="login-link" to="/ingresar">
              Ingresar
            </Link>
          )}
        </div>
      </header>

      <main className="shell main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="shell">
          <p>
            SafeGuard no reemplaza al antivirus ni al firewall: protege el
            eslabón humano.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
