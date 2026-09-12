import { Link } from 'react-router'
import './Modulo.css'

const pasos = [
  {
    titulo: 'Armás la campaña',
    texto:
      'Elegís destinatarios, fecha de envío y nivel de dificultad, sobre plantillas basadas en estafas reales de la región.',
  },
  {
    titulo: 'Llegan los correos',
    texto:
      'El sistema envía la simulación en el horario programado, imitando engaños que de verdad circulan por acá.',
  },
  {
    titulo: 'Se registra qué pasó',
    texto:
      'Queda guardado si el empleado abrió el correo, hizo clic en el enlace o llegó a ingresar sus datos.',
  },
  {
    titulo: 'Se explica en el momento',
    texto:
      'Si alguien cae, recibe una explicación de 1 a 2 minutos de por qué era riesgoso. Sin exponerlo ni sancionarlo.',
  },
]

const incluye = [
  'Dashboard con los riesgos detectados y la evolución de la seguridad en el tiempo.',
  'Reporte mensual en PDF con gráficos simples, listo para gerencia o directorio.',
  'Alta y baja de usuarios cubiertos, y cambio de plan cuando la organización crece.',
  'Plantillas en español, pensadas para la región y no traducidas de otro país.',
  '100% en la nube: sin instalar software en cada equipo.',
  'Soporte en español por WhatsApp Business y correo.',
]

function Empresas() {
  return (
    <div className="modulo modulo-empresas">
      <header className="modulo-header">
        <span className="modulo-tag">Empresas</span>
        <h1>PhishGuard</h1>
        <p className="modulo-lead">
          Simulación de phishing y concientización para PyMEs e instituciones
          educativas. El ataque apunta a la persona, no al sistema: PhishGuard
          entrena ese criterio y te deja evidencia medible para mostrar.
        </p>
      </header>

      <section className="modulo-section">
        <h2>Cómo funciona</h2>
        <ol className="pasos">
          {pasos.map((paso, i) => (
            <li className="paso" key={paso.titulo}>
              <span className="paso-num">{i + 1}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="modulo-section">
        <h2>Qué incluye</h2>
        <ul className="lista">
          {incluye.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="modulo-section">
        <h2>Cuánto cuesta</h2>
        <p className="modulo-texto">
          Precio por asiento, facturación mensual cancelable. Sin contrato anual
          ni mínimo de usuarios. Cargo mínimo de USD 25 por mes.
        </p>
        <table className="precios">
          <thead>
            <tr>
              <th>Usuarios cubiertos</th>
              <th>Precio por usuario / mes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1 a 100</td>
              <td>USD 1,00</td>
            </tr>
            <tr>
              <td>101 a 300</td>
              <td>USD 0,85</td>
            </tr>
            <tr>
              <td>301 a 600</td>
              <td>USD 0,70</td>
            </tr>
            <tr>
              <td>Más de 600</td>
              <td>USD 0,55</td>
            </tr>
          </tbody>
        </table>
        <p className="modulo-nota">Pago anual: 15% de descuento.</p>
      </section>

      <nav className="modulo-acciones">
        <Link className="boton-primario" to="/ingresar">
          Ingresar a PhishGuard
        </Link>
        <Link className="boton-secundario" to="/">
          Volver a las dos puertas
        </Link>
      </nav>
    </div>
  )
}

export default Empresas
