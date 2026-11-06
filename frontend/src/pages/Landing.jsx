import { Link } from 'react-router'
import Carrusel from '../components/Carrusel.jsx'
import Marco from '../components/Marco.jsx'
import { useSesion } from '../lib/useSesion.js'

const escenarios = [
  {
    canal: 'WhatsApp',
    foto: '/img/escenario-whatsapp.webp',
    alt: 'Mujer leyendo un mensaje en el celular',
    remitente: '+54 9 11 ••••-4821',
    mensaje: 'Tu paquete no pudo entregarse. Confirmá la dirección y pagá $1.250 de reenvío hoy.',
    url: 'entregas-paquete-ar.top/pago',
    nivel: 'rojo',
    titulo: 'Rojo: no lo abras',
    explicacion: 'Dominio creado hace 3 días y marcado por fuentes de reputación. El apuro es parte del engaño.',
  },
  {
    canal: 'Correo',
    foto: '/img/escenario-banco.webp',
    alt: 'Persona revisando el correo en la computadora con el celular en la mano',
    remitente: 'Seguridad Homebanking',
    mensaje: 'Detectamos un acceso inusual. Tu cuenta será suspendida en 24 horas si no verificás tus datos.',
    url: 'homebanking-verificacion.com',
    nivel: 'rojo',
    titulo: 'Rojo: imita a tu banco',
    explicacion: 'El nombre se parece al de un banco real, pero el dominio no le pertenece y pide la clave.',
  },
  {
    canal: 'Código QR',
    foto: '/img/escenario-qr.webp',
    alt: 'Celular escaneando un código QR en un local',
    remitente: 'Cartel en la mesa',
    mensaje: 'Escaneá para ver el menú y pagar sin esperar.',
    url: 'menu-pago.app/l/8f3k',
    nivel: 'amarillo',
    titulo: 'Amarillo: revisá antes',
    explicacion: 'El acortador oculta el destino final. SafeLink lo sigue y te muestra a dónde lleva.',
  },
  {
    canal: 'SMS',
    foto: '/img/escenario-premio.webp',
    alt: 'Mujer mayor con una tarjeta de crédito y el celular',
    remitente: 'PROMO',
    mensaje: '¡Felicitaciones! Ganaste un vale de $50.000. Cargá tu tarjeta para recibirlo.',
    url: 'premios-clientes.click',
    nivel: 'rojo',
    titulo: 'Rojo: nadie regala así',
    explicacion: 'Pide la tarjeta para entregar un premio que nunca existió. Clásico de la región.',
  },
  {
    canal: 'Correo interno',
    foto: '/img/escenario-jefe.webp',
    alt: 'Hombre trabajando en su escritorio frente a la computadora',
    remitente: 'Gerencia (desde Gmail)',
    mensaje: 'Necesito que hagas una transferencia urgente a este proveedor. No me llames, estoy en reunión.',
    url: 'gerencia.empresa@gmail.com',
    nivel: 'amarillo',
    titulo: 'Amarillo: confirmá por otro canal',
    explicacion: 'Urgencia, secreto y un correo personal: las tres señales que PhishGuard entrena a ver.',
  },
  {
    canal: 'WhatsApp',
    foto: '/img/escenario-turno.webp',
    alt: 'Mujer sonriendo mientras usa el celular en un café',
    remitente: 'Centro médico',
    mensaje: 'Te recordamos tu turno del jueves a las 10:30. Podés ver los detalles acá.',
    url: 'turnos.centromedico.com.ar',
    nivel: 'verde',
    titulo: 'Verde: podés seguir',
    explicacion: 'Dominio con años de antigüedad, certificado válido y sin reportes. Así se ve uno sano.',
  },
]

const canales = ['Enlaces', 'WhatsApp', 'Códigos QR', 'Correos', 'PDF', 'SMS', 'Redes sociales']

const publicos = [
  {
    foto: '/img/publico-pymes.webp',
    alt: 'Dos personas revisando juntas una computadora en la oficina',
    titulo: 'PyMEs',
    texto: 'Equipos chicos sin área de seguridad que igual reciben ataques todos los días.',
  },
  {
    foto: '/img/publico-escuelas.webp',
    alt: 'Docente dando clase frente a estudiantes',
    titulo: 'Instituciones educativas',
    texto: 'Docentes, administración y estudiantes aprenden a frenar antes del clic.',
  },
  {
    foto: '/img/publico-personas.webp',
    alt: 'Pareja de adultos mayores mirando juntos un celular',
    titulo: 'Personas y familias',
    texto: 'SafeLink gratis para revisar ese enlace raro que llegó al grupo de la familia.',
  },
]

function Landing() {
  const { sesion } = useSesion()

  return (
    <Marco>
      <main id="inicio">
        <section className="hero section-pad">
          <div className="hero-grid container">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="pulse-dot" /> Ciberseguridad centrada en las personas
              </div>
              <h1>
                El ataque no rompe tus sistemas: <em>engaña a tu gente.</em>
              </h1>
              <p className="hero-lead">
                SafeGuard une la protección en el momento del clic con el
                entrenamiento por simulación. PhishGuard enseña al equipo sin
                castigos. SafeLink revisa el enlace o el QR antes de abrirlo.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" to="/empresas">
                  Probar PhishGuard <span>↗</span>
                </Link>
                <Link className="button button-ghost" to="/personas">
                  Conocer SafeLink <span>→</span>
                </Link>
              </div>
              <div className="trust-row">
                <span className="shield-check">✓</span>
                <span>Sin castigos. Sin instalar software en cada equipo. Más criterio digital.</span>
              </div>
            </div>

            <div className="hero-visual" aria-label="Ilustración de la protección de SafeGuard">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="security-card main-card">
                <div className="card-top">
                  <span className="status-live">
                    <i /> Protección activa
                  </span>
                  <span className="more">•••</span>
                </div>
                <div className="risk-score">
                  <div>
                    <small>SafeLink</small>
                    <strong>
                      3<span> colores</span>
                    </strong>
                    <b>✓ Verde, ! amarillo o ✕ rojo</b>
                  </div>
                  <div className="score-ring">
                    <span>OK</span>
                    <small>antes</small>
                  </div>
                </div>
                <div className="chart" aria-hidden="true">
                  <span style={{ height: '36%' }} />
                  <span style={{ height: '49%' }} />
                  <span style={{ height: '42%' }} />
                  <span style={{ height: '63%' }} />
                  <span style={{ height: '57%' }} />
                  <span style={{ height: '76%' }} />
                  <span style={{ height: '88%' }} />
                  <span style={{ height: '96%' }} />
                </div>
                <div className="chart-labels">
                  <span>ENE</span>
                  <span>FEB</span>
                  <span>MAR</span>
                  <span>ABR</span>
                  <span>MAY</span>
                  <span>JUN</span>
                  <span>JUL</span>
                  <span>AGO</span>
                </div>
              </div>
              <div className="security-card alert-card">
                <span className="alert-icon">!</span>
                <div>
                  <strong>Enlace sospechoso, antes del clic</strong>
                  <small>WhatsApp, correo o código QR</small>
                </div>
                <span className="arrow">↗</span>
              </div>
              <div className="security-card mini-card">
                <div className="mini-icon">⌁</div>
                <div>
                  <small>Si alguien cae en la simulación</small>
                  <strong>Explicación de 1 a 2 minutos</strong>
                </div>
                <span className="check">✓</span>
              </div>
              <span className="visual-label label-one">01 / detectar</span>
              <span className="visual-label label-two">02 / aprender</span>
            </div>
          </div>
          <a className="scroll-cue" href="#solucion">
            <span /> Descubrí cómo funciona
          </a>
        </section>

        <div className="canales" aria-label="Qué revisa SafeGuard">
          <div className="canales-pista">
            {[0, 1].map((copia) => (
              <ul key={copia} aria-hidden={copia === 1 ? 'true' : undefined}>
                {canales.map((canal) => (
                  <li key={canal}>{canal}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        <section className="intro section-pad" id="solucion">
          <div className="container intro-heading">
            <div className="eyebrow">La solución</div>
            <h2>La seguridad no termina en el firewall.</h2>
            <p>
              El equipo es la primera línea. SafeGuard acompaña la decisión
              justo cuando alguien está por cometer el error.
            </p>
          </div>
          <div className="value-grid container">
            <article className="value-card">
              <div className="number">01</div>
              <div className="line-icon browser-icon">
                <span />
              </div>
              <h3>En la PC y en el celular</h3>
              <p>
                La extensión de Chrome avisa en la pestaña activa. En el
                celular, la cámara lee el QR y el portapapeles se revisa antes
                de abrir el enlace.
              </p>
              <Link to="/personas">
                Ver SafeLink <span>→</span>
              </Link>
            </article>
            <article className="value-card value-card-featured">
              <div className="number">02</div>
              <div className="line-icon radar-icon">
                <span />
              </div>
              <h3>Simulacros regionales</h3>
              <p>
                Si alguien hace clic, recibe la explicación en el momento, sin
                exponerlo ni sancionarlo.
              </p>
              <a href="#proceso">
                Conocer las simulaciones <span>→</span>
              </a>
            </article>
            <article className="value-card">
              <div className="number">03</div>
              <div className="line-icon report-icon">
                <span />
              </div>
              <h3>Reportes para gerencia</h3>
              <p>
                El tablero muestra cómo evoluciona el riesgo del equipo.
              </p>
              <Link to="/empresas">
                Ver PhishGuard <span>→</span>
              </Link>
            </article>
          </div>
        </section>

        <section className="escenarios section-pad" id="escenarios">
          <div className="container section-heading">
            <div>
              <div className="eyebrow">Engaños que circulan</div>
              <h2>
                Así se ve un ataque. <em>Así responde SafeGuard.</em>
              </h2>
            </div>
            <p>Ejemplos ilustrativos basados en estafas comunes de la región.</p>
          </div>
          <div className="container">
            <Carrusel items={escenarios} etiqueta="Ejemplos de engaños y cómo los clasifica SafeLink" />
          </div>
        </section>

        <section className="products section-pad" id="productos">
          <div className="container section-heading">
            <div>
              <div className="eyebrow">Dos formas de empezar</div>
              <h2>Productos.</h2>
            </div>
            <p>PhishGuard se paga por persona. SafeLink es gratis.</p>
          </div>
          <div className="product-list container">
            <article className="product-row product-dark">
              <div className="product-number">01</div>
              <div className="product-info">
                <div className="product-tag">Para empresas</div>
                <h3>
                  Phish<span>Guard</span>
                </h3>
                <p>
                  Simulación de phishing para PyMEs e instituciones educativas.
                  El ataque apunta a la persona: PhishGuard entrena ese criterio
                  y deja evidencia medible.
                </p>
                <ul>
                  <li>Registro de clic y datos ingresados</li>
                  <li>Tablero del equipo</li>
                </ul>
                <Link className="text-link light-link" to="/empresas">
                  Probar PhishGuard <span>↗</span>
                </Link>
              </div>
              <div className="product-art dark-art">
                <div className="art-window">
                  <div className="window-top">
                    <i />
                    <i />
                    <i />
                    <span>phishguard / simulación</span>
                  </div>
                  <div className="window-body">
                    <div className="fake-mail">
                      <small>CORREO DE PRUEBA</small>
                      <strong>Actualización urgente de cuenta</strong>
                      <span>Verificar acceso →</span>
                    </div>
                    <div className="blocked-pill">✓ Simulación segura</div>
                  </div>
                </div>
              </div>
            </article>

            <article className="product-row product-light">
              <div className="product-number">02</div>
              <div className="product-info">
                <div className="product-tag">Para personas</div>
                <h3>
                  Safe<span>Link</span>
                </h3>
                <p>
                  Un enlace de WhatsApp, un correo o un código QR no dicen a
                  dónde llevan hasta que ya hiciste clic. SafeLink los revisa
                  antes y explica el riesgo en palabras simples.
                </p>
                <ul>
                  <li>Semáforo ✓ verde, ! amarillo o ✕ rojo</li>
                  <li>Extensión, cámara para QR y aviso en el portapapeles</li>
                  <li>La cuenta guarda el historial</li>
                </ul>
                <Link className="text-link" to="/personas">
                  Probar SafeLink <span>↗</span>
                </Link>
              </div>
              <div className="product-art light-art">
                <div className="phone">
                  <div className="phone-notch" />
                  <div className="phone-content">
                    <div className="safe-badge">✓</div>
                    <small>ENLACE ANALIZADO</small>
                    <strong>Este enlace parece seguro</strong>
                    <div className="url-line">✓ Verde · podés continuar</div>
                    <div className="scan-line" />
                  </div>
                </div>
                <div className="qr" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="publicos section-pad" id="para-quien">
          <div className="container intro-heading">
            <div className="eyebrow">Para quién es</div>
            <h2>Hecho para la gente, no para expertos.</h2>
          </div>
          <div className="container publicos-grid">
            {publicos.map((publico) => (
              <figure className="publico-card" key={publico.titulo}>
                <img src={publico.foto} alt={publico.alt} loading="lazy" width="720" height="900" />
                <figcaption>
                  <strong>{publico.titulo}</strong>
                  <span>{publico.texto}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="process section-pad" id="proceso">
          <div className="container">
            <div className="process-copy">
              <div className="eyebrow">Cómo funciona PhishGuard</div>
              <h2>
                De la campaña al reporte, en <em>cuatro pasos</em>.
              </h2>
              <p>
                Armás la campaña, llegan los correos, se registra qué pasó y se
                explica en el momento.
              </p>
              <Link className="button button-primary" to="/empresas#pasos">
                Ver los cuatro pasos <span>↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="results section-pad" id="resultados">
          <div className="container results-box">
            <div className="eyebrow">En números</div>
            <h2>
              Menos incertidumbre.
              <br />
              <em>Más criterio.</em>
            </h2>
            <p>
              SafeLink responde con un color. PhishGuard deja registro de lo que
              pasó y una explicación corta, sin sanciones.
            </p>
            <div className="metrics">
              <div>
                <strong>Sin costo</strong>
                <span>SafeLink</span>
              </div>
              <div>
                <strong>1–2 min</strong>
                <span>de explicación si alguien cae</span>
              </div>
              <div>
                <strong>USD 1</strong>
                <span>por usuario al mes, desde</span>
              </div>
            </div>
          </div>
        </section>

        <section className="contact section-pad" id="contacto">
          <div className="container contact-box">
            <div>
              <div className="eyebrow">Tu próxima decisión segura</div>
              <h2>
                Elegí por dónde
                <br />
                <em>empezar.</em>
              </h2>
              <p>
                PhishGuard es para PyMEs e instituciones, con suscripción
                mensual. La cuenta de SafeLink solo guarda el historial.
              </p>
            </div>
            <div className="contact-actions">
              <Link className="button button-primary" to="/empresas">
                Ver PhishGuard para empresas <span>↗</span>
              </Link>
              <Link className="button button-ghost" to="/personas">
                Ver SafeLink para personas <span>→</span>
              </Link>
              {sesion ? (
                <Link className="contact-login" to="/panel">
                  Ir al panel
                </Link>
              ) : (
                <Link className="contact-login" to="/ingresar">
                  Ya tengo cuenta. Ingresar
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    </Marco>
  )
}

export default Landing
