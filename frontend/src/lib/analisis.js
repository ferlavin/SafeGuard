const TLD_BARATOS = new Set([
  'xyz',
  'top',
  'click',
  'link',
  'gq',
  'tk',
  'ml',
  'cf',
  'ga',
  'work',
  'zip',
  'mov',
  'country',
  'support',
])

export const ACORTADORES = new Set([
  'bit.ly',
  'bitly.com',
  'cutt.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'rb.gy',
  'rebrand.ly',
  'shorturl.at',
  's.id',
  'tiny.cc',
  'lnkd.in',
  'wa.me',
  'vm.tiktok.com',
])

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
  'com.uy',
  'com.cl',
  'com.pe',
])

const MARCAS = [
  'mercadolibre',
  'mercadopago',
  'banco',
  'santander',
  'galicia',
  'macro',
  'bbva',
  'nacion',
  'afip',
  'anses',
  'correoargentino',
  'whatsapp',
  'instagram',
  'facebook',
  'google',
  'microsoft',
  'apple',
  'netflix',
  'paypal',
  'uala',
  'brubank',
  'modo',
]

const PALABRAS_GANCHO = [
  'premio',
  'ganaste',
  'urgente',
  'verificar',
  'actualizar',
  'suspendid',
  'bloque',
  'regalo',
  'gratis',
  'sorteo',
  'factura',
  'paquete',
  'impuesto',
]

const ES_IP = /^\d{1,3}(\.\d{1,3}){3}$/

export function nivelDesde(puntos) {
  if (puntos >= 55) return 'rojo'
  if (puntos >= 20) return 'amarillo'
  return 'verde'
}

export function dominioBase(host) {
  if (ES_IP.test(host)) return host
  const partes = host.split('.')
  if (partes.length <= 2) return host
  const dosNiveles = partes.slice(-2).join('.')
  return SUFIJOS_DOBLES.has(dosNiveles) ? partes.slice(-3).join('.') : dosNiveles
}

export function esAcortador(host) {
  return ACORTADORES.has(dominioBase(host.replace(/^www\./, '')))
}

function distancia(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function analizar(entrada) {
  const crudo = (entrada ?? '').trim()
  if (!crudo) return null

  let url
  try {
    url = new URL(crudo.includes('://') ? crudo : `https://${crudo}`)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  const base = dominioBase(host.replace(/^www\./, ''))
  const tld = base.split('.').pop()
  const motivos = []
  let puntos = 0

  if (url.protocol === 'http:') {
    puntos += 20
    motivos.push('La dirección no usa candado (http).')
  }

  if (ES_IP.test(host)) {
    puntos += 35
    motivos.push('Lleva a una dirección IP, no a un nombre de sitio.')
  }

  if (host.includes('xn--')) {
    puntos += 30
    motivos.push('Usa caracteres disfrazados (punycode) para parecer otra marca.')
  }

  if (url.username || url.password || host.includes('@') || crudo.includes('@')) {
    puntos += 40
    motivos.push('Esconde el destino real detrás de una arroba.')
  }

  if (TLD_BARATOS.has(tld)) {
    puntos += 20
    motivos.push(`El final .${tld} se usa mucho en sitios truchos.`)
  }

  if (esAcortador(host)) {
    puntos += 20
    motivos.push('Es un acortador: no se ve a dónde lleva hasta abrirlo.')
  }

  const subdominios = host.split('.').length - base.split('.').length
  if (subdominios > 3) {
    puntos += 10
    motivos.push('Tiene demasiados subdominios, un truco típico para parecer oficial.')
  }

  const texto = `${host}${url.pathname}${url.search}`.toLowerCase()
  if (PALABRAS_GANCHO.some((p) => texto.includes(p))) {
    puntos += 10
    motivos.push('El enlace usa palabras de urgencia o premio.')
  }

  for (const marca of MARCAS) {
    if (host.includes(marca) && !base.startsWith(marca)) {
      puntos += 60
      motivos.push(`Mete el nombre de ${marca} en un dominio que no es el oficial.`)
      break
    }
    if (marca.length >= 6 && Math.abs(base.split('.')[0].length - marca.length) <= 2) {
      const d = distancia(base.split('.')[0], marca)
      if (d > 0 && d <= 2) {
        puntos += 55
        motivos.push(`El dominio se parece a ${marca}: típico de una imitación.`)
        break
      }
    }
  }

  if (motivos.length === 0) {
    motivos.push('No aparecen señales fuertes en la dirección.')
  }

  return {
    url: url.href,
    host,
    dominio: base,
    puntuacion: Math.min(100, puntos),
    nivel: nivelDesde(puntos),
    motivos,
  }
}

export function combinarConAmenaza(local, amenaza) {
  if (!amenaza) return local

  const piso = amenaza.nivel === 'rojo' ? 90 : amenaza.nivel === 'amarillo' ? 45 : 0
  const puntuacion = Math.max(local.puntuacion, piso)
  const motivos = [...local.motivos]

  if (amenaza.nivel === 'rojo') {
    motivos.unshift(
      amenaza.motivo
        ? `Ya está en la base regional: ${amenaza.motivo}`
        : `Ya está marcado en rojo (${amenaza.veces_reportado} reporte${amenaza.veces_reportado === 1 ? '' : 's'}).`,
    )
  } else if (amenaza.nivel === 'amarillo') {
    motivos.unshift('Este dominio ya fue señalado en la base regional.')
  }

  return { ...local, puntuacion, nivel: nivelDesde(puntuacion), motivos }
}

export function combinarConEnriquecimiento(local, extra) {
  if (!extra) return local

  let actual = { ...local, motivos: [...local.motivos] }
  let puntos = actual.puntuacion

  if (extra.destino && extra.acortado) {
    const destino = analizar(extra.destino)
    if (destino) {
      puntos = Math.max(puntos, destino.puntuacion)
      actual = {
        ...actual,
        destino: destino.url,
        dominioDestino: destino.dominio,
        motivos: [
          ...actual.motivos.filter((m) => !m.includes('acortador')),
          `El acortador lleva a ${destino.dominio}.`,
          ...destino.motivos.filter((m) => !m.startsWith('No aparecen')),
        ],
      }
    } else {
      actual.motivos.push(`El acortador termina en ${extra.destino}.`)
    }
  }

  if (typeof extra.edad_dias === 'number') {
    const dias = extra.edad_dias
    if (dias < 7) puntos += 45
    else if (dias < 30) puntos += 25
    else if (dias < 90) puntos += 15
  }

  if (extra.frase_edad) actual.motivos.push(extra.frase_edad)
  if (extra.frase_certificado) {
    actual.motivos.push(extra.frase_certificado)
    if (extra.cert_dias != null && extra.cert_dias < 14) puntos += 15
  }

  puntos = Math.min(100, puntos)
  return { ...actual, puntuacion: puntos, nivel: nivelDesde(puntos) }
}
