import { createContext, useContext } from 'react'

export const ContextoSesion = createContext({ sesion: null, cargando: true })

export function useSesion() {
  return useContext(ContextoSesion)
}
