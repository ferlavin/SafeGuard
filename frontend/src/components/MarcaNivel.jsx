const NIVELES = {
  verde: { palabra: 'Seguro', detalle: 'Sin señales fuertes' },
  amarillo: { palabra: 'Dudoso', detalle: 'Revisá antes de seguir' },
  rojo: { palabra: 'Peligroso', detalle: 'No lo abras' },
}

function Icono({ nivel }) {
  if (nivel === 'rojo') {
    return (
      <svg className="marca-icono" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.1 2.2h7.8l5.9 5.9v7.8l-5.9 5.9H8.1l-5.9-5.9V8.1l5.9-5.9z"
        />
        <path
          d="M9 9l6 6M15 9l-6 6"
          fill="none"
          stroke="#0b1220"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (nivel === 'amarillo') {
    return (
      <svg className="marca-icono" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2.6 22.2 20.8H1.8L12 2.6z" />
        <path
          d="M12 9v5"
          fill="none"
          stroke="#0b1220"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.2" r="1.1" fill="#0b1220" />
      </svg>
    )
  }

  return (
    <svg className="marca-icono" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path
        d="M7.8 12.2 10.6 15l5.6-6"
        fill="none"
        stroke="#0b1220"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MarcaNivel({ nivel = 'verde', detalle = false, compacto = false }) {
  const clave = NIVELES[nivel] ? nivel : 'verde'
  const info = NIVELES[clave]

  return (
    <span className={`marca-nivel marca-${clave}${compacto ? ' marca-compacta' : ''}`}>
      <Icono nivel={clave} />
      <span className="marca-palabra">{info.palabra}</span>
      {detalle && <span className="marca-detalle">{info.detalle}</span>}
    </span>
  )
}

export default MarcaNivel
