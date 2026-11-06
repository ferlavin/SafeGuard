import { Link } from 'react-router'
import Marco from '../components/Marco.jsx'
import { useSesion } from '../lib/useSesion.js'
import './Modulo.css'

const semaforo = [
  {
    nivel: 'verde',
    titulo: '✓ Verde',
    texto: 'No aparecieron señales de riesgo. Podés continuar.',
  },
  {
    nivel: 'amarillo',
    titulo: '! Amarillo',
    texto:
      'Hay algo raro: por ejemplo, el dominio se creó hace pocos días. Revisá antes de seguir.',
  },
  {
    nivel: 'rojo',
    titulo: '✕ Rojo',
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
      'Cada análisis queda guardado en Mis enlaces para consultarlo o reportarlo. Sin cuenta, el chequeo no se guarda.',
  },
]

function Personas() {
  const { sesion } = useSesion()

  return (
    <Marco interior>
      <div className="container sl">
        <div className="sl-grilla">
          <aside className="sl-lado">
            <p>Para personas</p>
            <h1>SafeLink</h1>
            <p>
              Revisa el enlace o el QR antes del clic y responde con un color,
              no con un informe técnico.
            </p>
            <button type="button" disabled>
              Instalar la extensión
              <span>Próximamente</span>
            </button>
            {sesion ? (
              <Link className="sl-secundario" to="/panel/enlaces">
                Mis enlaces
              </Link>
            ) : (
              <Link className="sl-secundario" to="/ingresar">
                Crear una cuenta
              </Link>
            )}
            <figure className="sl-foto">
              <img
                src="/img/personas-celular.webp"
                alt="Joven caminando por la calle mientras mira el celular"
                loading="lazy"
                width="640"
                height="800"
              />
              <figcaption>
                <span aria-hidden="true">✓</span> Verde · podés continuar
              </figcaption>
            </figure>
          </aside>

          <div className="sl-cuerpo">
            <section>
              <h2>Un color, un motivo</h2>
              <div className="sl-bandas">
                {semaforo.map((item) => (
                  <article className={`sl-banda sl-${item.nivel}`} key={item.nivel}>
                    <h3>{item.titulo}</h3>
                    <p>{item.texto}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>Dónde aparece</h2>
              <dl className="sl-lugares">
                {donde.map((item) => (
                  <div key={item.titulo}>
                    <dt>{item.titulo}</dt>
                    <dd>
                      {item.texto}
                      {item.titulo === 'Con cuenta, tu historial' && (
                        <>
                          {' '}
                          <Link to="/privacidad">Qué se guarda está en Privacidad.</Link>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <p className="sl-gratis">
              La cuenta es opcional y solo guarda el historial y los reportes.
            </p>
          </div>
        </div>
      </div>
    </Marco>
  )
}

export default Personas
