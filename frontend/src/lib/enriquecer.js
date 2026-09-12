import { supabase } from './supabase.js'

export async function enriquecer(url) {
  if (!url) return null

  try {
    const { data, error } = await supabase.functions.invoke('safelink-enriquecer', {
      body: { url },
    })

    if (error || data?.error) return null
    return data
  } catch {
    return null
  }
}

export async function consultarAmenaza(dominio) {
  if (!dominio) return { amenaza: null, fallo: null }

  const { data, error } = await supabase
    .from('amenazas')
    .select('nivel, motivo, veces_reportado')
    .eq('dominio', dominio)
    .maybeSingle()

  return { amenaza: data, fallo: error }
}

export async function guardarAnalisis(sesion, resultado, entrada) {
  return supabase.from('safelink_analisis').insert({
    usuario_id: sesion.user.id,
    url_analizada: resultado.url,
    dominio: resultado.dominioDestino ?? resultado.dominio,
    nivel_riesgo: resultado.nivel,
    explicacion: resultado.motivos.join(' '),
    puntuacion_riesgo: resultado.puntuacion,
    entrada,
  })
}

export async function reportarDominio(resultado, originType = 'web') {
  return supabase.rpc('safelink_reportar', {
    p_dominio: resultado.dominioDestino ?? resultado.dominio,
    p_motivo: resultado.motivos.join(' '),
    p_origin_type: originType,
  })
}

export function textoParaMama(resultado, enlace) {
  const color =
    resultado.nivel === 'rojo'
      ? 'ROJO: no lo abras'
      : resultado.nivel === 'amarillo'
        ? 'AMARILLO: revisalo antes'
        : 'VERDE: no vi señales fuertes'
  const motivo = resultado.motivos[0] ?? ''
  return [
    `Mamá, SafeLink revisó esto y salió ${color}.`,
    resultado.dominioDestino ?? resultado.dominio,
    motivo,
    enlace ? `El detalle está acá: ${enlace}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function compartirResultado(resultado) {
  const { data, error } = await supabase.rpc('safelink_compartir', {
    p_url: resultado.url,
    p_dominio: resultado.dominioDestino ?? resultado.dominio,
    p_nivel: resultado.nivel,
    p_explicacion: resultado.motivos.join(' '),
    p_puntuacion: resultado.puntuacion,
  })

  if (error || !data?.token) {
    return { error: error?.message ?? 'No se pudo crear el enlace' }
  }

  const url = `${window.location.origin}/c/${data.token}`
  const texto = textoParaMama(resultado, url)

  if (navigator.share) {
    try {
      await navigator.share({ title: 'SafeLink', text: texto, url })
      return { url, compartido: true }
    } catch (fallo) {
      if (fallo.name === 'AbortError') return { url, compartido: false }
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(texto)}`
  window.open(wa, '_blank', 'noopener,noreferrer')
  return { url, compartido: true }
}
