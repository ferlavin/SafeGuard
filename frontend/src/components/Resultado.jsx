const titulos = {
  verde: 'Verde: sin señales fuertes',
  amarillo: 'Amarillo: revisá antes de seguir',
  rojo: 'Rojo: no lo abras',
}

function Resultado({ nivel, subtitulo, motivos, children }) {
  return (
    <article className={`resultado nivel-${nivel}`}>
      <p className="resultado-semaforo">
        <span className="resultado-punto" aria-hidden="true" />
        {titulos[nivel]}
      </p>
      {subtitulo && <p className="resultado-sub">{subtitulo}</p>}
      <ul className="resultado-motivos">
        {(motivos ?? []).map((motivo) => (
          <li key={motivo}>{motivo}</li>
        ))}
      </ul>
      {children}
    </article>
  )
}

export default Resultado
