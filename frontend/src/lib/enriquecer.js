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
