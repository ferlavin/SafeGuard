import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRIVADO =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|0\.|\[::1\]|metadata\.google)/i

const SUFIJOS_DOBLES = new Set([
  'com.ar',
  'gob.ar',
  'gov.ar',
  'org.ar',
  'net.ar',
  'edu.ar',
  'com.br',
  'com.mx',
  'co.uk',
  'com.co',
])

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function dominioRegistrable(host: string) {
  const limpio = host.replace(/^www\./, '').toLowerCase()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(limpio)) return limpio
  const partes = limpio.split('.')
  if (partes.length <= 2) return limpio
  const dos = partes.slice(-2).join('.')
  return SUFIJOS_DOBLES.has(dos) ? partes.slice(-3).join('.') : dos
}

function hostProhibido(host: string) {
  const h = host.replace(/\.+$/, '').toLowerCase()
  return PRIVADO.test(h) || h.endsWith('.local') || h.endsWith('.internal')
}

async function seguir(urlInicial: string) {
  const cadena: string[] = []
  let actual = urlInicial

  for (let i = 0; i < 5; i++) {
    const u = new URL(actual)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('Solo se pueden abrir direcciones http o https')
    }
    if (hostProhibido(u.hostname)) {
      throw new Error('Ese destino no se puede consultar')
    }

    cadena.push(actual)

    const ctrl = AbortSignal.timeout(5000)
    let res = await fetch(actual, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ctrl,
      headers: { 'User-Agent': 'SafeGuard/1.0' },
    })

    if (res.status === 405 || res.status === 501) {
      res = await fetch(actual, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'SafeGuard/1.0' },
      })
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      actual = new URL(loc, actual).href
      continue
    }

    break
  }

  return { destino: actual, cadena }
}

function fraseEdad(dias: number | null) {
  if (dias == null) return null
  if (dias < 1) return 'Este sitio se registró hoy.'
  if (dias === 1) return 'Este sitio se registró ayer.'
  if (dias < 7) return `Este sitio se registró hace ${dias} días.`
  if (dias < 30) return `Este dominio tiene menos de un mes (${dias} días).`
  const meses = Math.round(dias / 30)
  if (dias < 365) return `Este dominio se registró hace ${meses} mes${meses === 1 ? '' : 'es'}.`
  const anios = Math.round(dias / 365)
  if (anios === 1) return 'Este dominio tiene alrededor de un año: es un dato a favor.'
  return `Este dominio lleva ${anios} años registrado: es un dato a favor.`
}

function fraseCert(dias: number | null) {
  if (dias == null) return null
  if (dias < 2) return 'El certificado se emitió hace muy poco, casi no tuvo tiempo de ser un sitio real.'
  if (dias < 14) return `El certificado se emitió hace ${dias} días.`
  return null
}

async function edadDominio(dominio: string) {
  try {
    const res = await fetch(`https://rdap.org/domain/${dominio}`, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/rdap+json, application/json' },
    })
    if (!res.ok) return { edad_dias: null, registrado_en: null }
    const data = await res.json()
    const eventos = Array.isArray(data.events) ? data.events : []
    const alta = eventos.find((e: { eventAction?: string }) => e.eventAction === 'registration')
    if (!alta?.eventDate) return { edad_dias: null, registrado_en: null }
    const fecha = new Date(alta.eventDate)
    const dias = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86_400_000))
    return { edad_dias: dias, registrado_en: fecha.toISOString() }
  } catch {
    return { edad_dias: null, registrado_en: null }
  }
}

async function edadCertificado(dominio: string) {
  try {
    const res = await fetch(`https://crt.sh/?q=${encodeURIComponent(dominio)}&output=json`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return { cert_dias: null }
    const texto = await res.text()
    if (texto.length > 200_000) return { cert_dias: null }
    const filas = JSON.parse(texto) as { not_before?: string }[]
    if (!Array.isArray(filas) || filas.length === 0) return { cert_dias: null }
    const fechas = filas
      .map((f) => (f.not_before ? new Date(f.not_before.replace(' ', 'T') + 'Z') : null))
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    if (fechas.length === 0) return { cert_dias: null }
    const masNueva = fechas.reduce((a, b) => (a > b ? a : b))
    const dias = Math.max(0, Math.floor((Date.now() - masNueva.getTime()) / 86_400_000))
    return { cert_dias: dias }
  } catch {
    return { cert_dias: null }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return json({ error: 'Falta la dirección' }, 400)
    }

    const partida = url.includes('://') ? url : `https://${url}`
    const { destino, cadena } = await seguir(partida)
    const host = new URL(destino).hostname
    const dominio = dominioRegistrable(host)
    const acortado = cadena.length > 1 || destino !== partida

    const [rdap, cert] = await Promise.all([edadDominio(dominio), edadCertificado(dominio)])

    return json({
      destino,
      cadena,
      acortado,
      dominio,
      registrado_en: rdap.registrado_en,
      edad_dias: rdap.edad_dias,
      cert_dias: cert.cert_dias,
      frase_edad: fraseEdad(rdap.edad_dias),
      frase_certificado: fraseCert(cert.cert_dias),
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'No se pudo enriquecer' }, 400)
  }
})
