import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ContextoSesion } from '../lib/useSesion.js'

function SesionProvider({ children }) {
  const [estado, setEstado] = useState({ sesion: null, cargando: true })

  useEffect(() => {
    let activo = true

    supabase.auth.getSession().then(({ data }) => {
      if (activo) setEstado({ sesion: data.session, cargando: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setEstado({ sesion, cargando: false })
    })

    return () => {
      activo = false
      subscription.unsubscribe()
    }
  }, [])

  return <ContextoSesion.Provider value={estado}>{children}</ContextoSesion.Provider>
}

export default SesionProvider
