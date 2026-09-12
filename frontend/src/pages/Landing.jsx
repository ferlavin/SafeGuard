import { Link } from 'react-router'
import './Landing.css'

function Landing() {
  return (
    <>
      <section className="hero">
        <h1>Protegé el clic. Enseñá en el momento.</h1>
        <p className="hero-text">
          Elegí cómo querés usar SafeGuard. No es un antivirus: acompaña a la
          persona justo cuando está por cometer el error.
        </p>
      </section>

      <section className="doors" aria-label="Elegí tu puerta de entrada">
        <Link className="door door-empresas" to="/empresas">
          <span className="door-tag">Empresas</span>
          <h2 className="door-title">PhishGuard</h2>
          <p className="door-text">
            Simulá estafas reales de la región, enseñá sin culpa y mostrá
            resultados medibles a gerencia.
          </p>
          <p className="door-meta">
            PyMEs e instituciones educativas · Suscripción mensual
          </p>
          <span className="door-cta">Entrar a Empresas</span>
        </Link>

        <Link className="door door-personas" to="/personas">
          <span className="door-tag">Personas</span>
          <h2 className="door-title">SafeLink</h2>
          <p className="door-text">
            Pegá un enlace o escaneá un código QR. Semáforo verde, amarillo o
            rojo con una explicación simple.
          </p>
          <p className="door-meta">
            Gratis para siempre · Cuenta opcional para el historial
          </p>
          <span className="door-cta">Analizar un enlace</span>
        </Link>
      </section>
    </>
  )
}

export default Landing
