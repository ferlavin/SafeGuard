import { createContext, useContext, useEffect, useState } from 'react'

const CLAVE = 'safeguard-lectura-amplia'
const LecturaContext = createContext(null)

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

export function LecturaProvider({ children }) {
  const [activa, setActiva] = useState(leerPreferencia)

  useEffect(() => {
    document.documentElement.classList.toggle('lectura-amplia', activa)
    try {
      localStorage.setItem(CLAVE, activa ? '1' : '0')
    } catch {
      /* el modo sigue valiendo en esta visita */
    }
  }, [activa])

  return (
    <LecturaContext.Provider value={{ activa, alternar: () => setActiva((valor) => !valor) }}>
      {children}
    </LecturaContext.Provider>
  )
}

export function useLectura() {
  const valor = useContext(LecturaContext)
  if (!valor) {
    throw new Error('useLectura tiene que usarse dentro de LecturaProvider')
  }
  return valor
}
