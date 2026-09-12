import { Link } from 'react-router'
import { useSesion } from '../lib/useSesion.js'
import './Panel.css'

const safelink = [
  {
    to: '/panel/enlaces',
    titulo: 'Revisar un enlace',
    texto: 'Pegá la dirección. Si es un acortador, te decimos a dónde lleva.',
  },
  {
    to: '/panel/whatsapp',
    titulo: 'Pegar un WhatsApp',
    texto: 'No hace falta cazar el link: analizamos el texto, la urgencia y el número.',
  },
  {
    to: '/panel/pdf',
    titulo: 'Revisar un PDF',
    texto: 'Busca formularios, scripts y enlaces escondidos en el archivo.',
  },
  {
    to: '/panel/correo',
    titulo: 'Revisar un correo',
    texto: 'Pegá los encabezados. Miramos SPF, DKIM y si el remitente miente.',
  },
]

function Panel() {
  const { sesion } = useSesion()
  const nombre =
    sesion.user.user_metadata?.full_name ??
    sesion.user.user_metadata?.name ??
    sesion.user.email

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Hola, {nombre}</h1>
        <p className="panel-lead">
          SafeLink revisa lo que te llega antes de que le des clic. El resultado
          se puede mandar a alguien de confianza.
        </p>
      </header>

      <section className="panel-modulos">
        <div>
          <span className="panel-tag">SafeLink</span>
          <div className="panel-grid">
            {safelink.map((item) => (
              <Link className="panel-card" to={item.to} key={item.to}>
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Panel
