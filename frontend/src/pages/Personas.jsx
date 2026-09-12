import { Link } from 'react-router'
import './Modulo.css'

const semaforo = [
  {
    nivel: 'verde',
    titulo: 'Verde',
    texto: 'No aparecieron señales de riesgo. Podés continuar.',
  },
  {
    nivel: 'amarillo',
    titulo: 'Amarillo',
    texto:
      'Hay algo raro: por ejemplo, el dominio se creó hace pocos días. Revisá antes de seguir.',
  },
  {
    nivel: 'rojo',
    titulo: 'Rojo',
    texto:
      'Fuentes de reputación marcaron esta página como peligrosa. No la abras.',
  },
]

const donde = [
  {
    titulo: 'En la computadora',
    texto:
      'La extensión de Chrome revisa la pestaña activa y muestra un ícono de color en la barra. Avisa, no bloquea la navegación.',
  },
  {
    titulo: 'En el celular',
    texto:
      'La app usa la cámara para leer el código QR y analiza el enlace antes de abrirlo, así no se escanea a ciegas.',
  },
  {
    titulo: 'En el portapapeles',
    texto:
      'Si copiás un enlace peligroso en el celular, SafeLink te avisa antes de que lo abras.',
  },
  {
    titulo: 'Con cuenta, tu historial',
    texto:
      'Cada análisis queda guardado en "Mis enlaces" para consultarlo o reportarlo. Sin cuenta, el chequeo no se guarda.',
  },
]

function Personas() {
  return (
    <div className="modulo modulo-personas">
      <header className="modulo-header">
        <span className="modulo-tag">Personas</span>
        <h1>SafeLink</h1>
        <p className="modulo-lead">
          Un enlace de WhatsApp, un correo o un código QR no dicen a dónde
          llevan hasta que ya hiciste clic. SafeLink los revisa antes y te
          explica el riesgo en palabras simples.
        </p>
      </header>

      <section className="modulo-section">
        <h2>El semáforo</h2>
        <p className="modulo-texto">
          En vez de mostrarte el resultado de decenas de motores técnicos,
          SafeLink responde con un color y un motivo entendible.
        </p>
        <div className="semaforo">
          {semaforo.map((item) => (
            <article
              className={`semaforo-item semaforo-${item.nivel}`}
              key={item.nivel}
            >
              <span className="semaforo-punto" aria-hidden="true" />
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="modulo-section">
        <h2>Dónde te acompaña</h2>
        <div className="tarjetas">
          {donde.map((item) => (
            <article className="tarjeta" key={item.titulo}>
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="modulo-section">
        <h2>Cuánto cuesta</h2>
        <p className="modulo-texto">
          Nada. SafeLink es gratuito para siempre para el usuario final. La
          cuenta es opcional y solo sirve para guardar tu historial y reportar
          sitios sospechosos.
        </p>
      </section>

      <nav className="modulo-acciones">
        <Link className="boton-primario" to="/ingresar">
          Crear una cuenta
        </Link>
        <Link className="boton-secundario" to="/">
          Volver a las dos puertas
        </Link>
      </nav>
    </div>
  )
}

export default Personas
