import { useCallback, useEffect, useRef, useState } from 'react'
import './Carrusel.css'

const INTERVALO = 6500

function Carrusel({ items, etiqueta }) {
  const pistaRef = useRef(null)
  const [actual, setActual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [visible, setVisible] = useState(false)

  const irA = useCallback(
    (indice) => {
      const pista = pistaRef.current
      if (!pista) return
      const total = items.length
      const destino = ((indice % total) + total) % total
      const slide = pista.children[destino]
      if (slide) pista.scrollTo({ left: slide.offsetLeft - pista.offsetLeft, behavior: 'smooth' })
    },
    [items.length],
  )

  useEffect(() => {
    const pista = pistaRef.current
    if (!pista) return undefined
    const observer = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting && entrada.intersectionRatio > 0.6) {
            setActual(Number(entrada.target.dataset.indice))
          }
        })
      },
      { root: pista, threshold: [0.6] },
    )
    Array.from(pista.children).forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [items])

  useEffect(() => {
    const pista = pistaRef.current
    if (!pista) return undefined
    const observer = new IntersectionObserver(([entrada]) => setVisible(entrada.isIntersecting), {
      threshold: 0.35,
    })
    observer.observe(pista)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (pausado || !visible || reducido) return undefined
    const id = window.setTimeout(() => irA(actual + 1), INTERVALO)
    return () => window.clearTimeout(id)
  }, [actual, pausado, visible, irA])

  function alTeclado(evento) {
    if (evento.key === 'ArrowRight') {
      evento.preventDefault()
      irA(actual + 1)
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault()
      irA(actual - 1)
    }
  }

  return (
    <div
      className="carrusel"
      role="region"
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onKeyDown={alTeclado}
    >
      <div className="carrusel-pista" ref={pistaRef} tabIndex={0}>
        {items.map((item, i) => (
          <article
            className={`carrusel-slide nivel-${item.nivel}`}
            key={item.titulo}
            data-indice={i}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${items.length}: ${item.titulo}`}
          >
            <figure className="carrusel-foto">
              <img src={item.foto} alt={item.alt} loading="lazy" width="960" height="720" />
              <span className="carrusel-canal">{item.canal}</span>
            </figure>
            <div className="carrusel-texto">
              <div className="carrusel-mensaje">
                <small>{item.remitente}</small>
                <p>{item.mensaje}</p>
                <span className="carrusel-url">{item.url}</span>
              </div>
              <div className="carrusel-veredicto">
                <span className="carrusel-semaforo" aria-hidden="true">
                  {item.nivel === 'verde' ? '✓' : item.nivel === 'amarillo' ? '!' : '✕'}
                </span>
                <div>
                  <strong>{item.titulo}</strong>
                  <p>{item.explicacion}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="carrusel-controles">
        <button type="button" className="carrusel-flecha" aria-label="Anterior" onClick={() => irA(actual - 1)}>
          ←
        </button>
        <div className="carrusel-puntos">
          {items.map((item, i) => (
            <button
              type="button"
              key={item.titulo}
              aria-label={`Ir a ${i + 1}: ${item.titulo}`}
              aria-current={i === actual ? 'true' : undefined}
              className={i === actual && !pausado && visible ? 'corriendo' : undefined}
              style={{ '--duracion': `${INTERVALO}ms` }}
              onClick={() => irA(i)}
            />
          ))}
        </div>
        <button type="button" className="carrusel-flecha" aria-label="Siguiente" onClick={() => irA(actual + 1)}>
          →
        </button>
      </div>
    </div>
  )
}

export default Carrusel
