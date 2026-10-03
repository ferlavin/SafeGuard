import MarcaNivel from './MarcaNivel.jsx'
import QueHacer from './QueHacer.jsx'
import ConsultaFaro from './ConsultaFaro.jsx'
import './MarcaNivel.css'
import './QueHacer.css'
import './ConsultaFaro.css'

function Resultado({ nivel, subtitulo, motivos, children }) {
  return (
    <article className={`resultado nivel-${nivel}`}>
      <p className="resultado-semaforo">
        <MarcaNivel nivel={nivel} detalle />
      </p>
      {subtitulo && <p className="resultado-sub">{subtitulo}</p>}
      <ul className="resultado-motivos">
        {(motivos ?? []).map((motivo) => (
          <li key={motivo}>{motivo}</li>
        ))}
      </ul>
      {nivel === 'rojo' && <QueHacer />}
      <ConsultaFaro nivel={nivel} motivos={motivos} />
      {children}
    </article>
  )
}

export default Resultado
