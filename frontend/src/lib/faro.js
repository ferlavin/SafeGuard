const PALABRA = {
  verde: 'Seguro',
  amarillo: 'Dudoso',
  rojo: 'Peligroso',
}

const PASOS =
  'No abras el enlace, el archivo ni respondas el mensaje. No pongas claves, códigos ni datos de la tarjeta. Avisá a tu empresa, o a quien te lo mandó, por otro canal.'

function texto(valor) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function motivosDe(motivos) {
  if (Array.isArray(motivos)) return motivos.map((item) => item.trim()).filter(Boolean)
  if (typeof motivos === 'string' && motivos.trim()) return [motivos.trim()]
  return []
}

export function responderFaro({ nivel, motivos, pregunta }) {
  const clave = PALABRA[nivel] ? nivel : 'amarillo'
  const palabra = PALABRA[clave]
  const lista = motivosDe(motivos)
  const detalle = lista.length ? ` ${lista.join(' ')}` : ''
  const q = texto(pregunta)

  if (!q.trim()) return 'Escribí la duda sobre este resultado.'

  if (/ya (hice clic|entre|abri|respondi|puse|ingrese)|lo abri|puse la clave|puse mi/.test(q)) {
    if (clave === 'rojo') {
      return 'Si ya entraste o respondiste, no sigas. No pongas más datos. Cambiá la clave desde la página oficial, no desde este mensaje, y avisá a tu empresa por otro canal.'
    }
    if (clave === 'amarillo') {
      return 'Este caso está en Dudoso. Si ya entraste, no cargues claves ni códigos. Seguí por el sitio oficial y, si te pidieron datos, avisá a tu empresa.'
    }
    return 'Este caso está en Seguro: no aparecieron señales fuertes. Si igual cargaste una clave porque el mensaje te apuraba, cambiala desde el sitio oficial.'
  }

  if (/avis|empresa|jefe|banco|a quien/.test(q)) {
    if (clave === 'rojo') {
      return 'Avisá a tu empresa, o a la persona que te escribió, por teléfono o en persona. No uses el mismo enlace ni respondas ese mensaje.'
    }
    return `El resultado es ${palabra}. Si querés confirmarlo, hablá con tu empresa por un canal que ya uses, no por el mensaje que estás revisando.`
  }

  if (/clave|contrasena|codigo|tarjeta|dato|dni|cuil/.test(q)) {
    if (clave === 'verde') {
      return 'Aunque esté en Seguro, una clave no se pide por un enlace que te llegó. Entrá vos al sitio oficial.'
    }
    return clave === 'rojo'
      ? 'No pongas claves, códigos ni datos de la tarjeta. Este caso es Peligroso.'
      : 'No pongas claves, códigos ni datos de la tarjeta. Este caso está en Dudoso: revisá antes de seguir.'
  }

  if (/puedo (entrar|abrir|hacer clic|confiar)|es seguro|esta bien|lo abro/.test(q)) {
    if (clave === 'rojo') return 'No. Este resultado es Peligroso. No abras el enlace ni el archivo.'
    if (clave === 'amarillo') {
      return 'Todavía no. Está en Dudoso. Leé el motivo y recién después decidí, por el sitio oficial.'
    }
    return 'Este resultado es Seguro: no aparecieron señales fuertes. Si el mensaje te pide una clave o un código, no lo hagas igual.'
  }

  if (/por que|motivo|explica|que paso|que significa/.test(q)) {
    if (!lista.length) return `Quedó en ${palabra}. No hay un motivo extra guardado en este caso.`
    return `Quedó en ${palabra} por esto:${detalle}`
  }

  if (/que hago|que hacer|y ahora|pasos/.test(q)) {
    if (clave === 'rojo') return `Hacé esto: ${PASOS}`
    if (clave === 'amarillo') {
      return 'Revisá el motivo antes de seguir. No pongas datos hasta estar en el sitio oficial.'
    }
    return 'Podés seguir. Si algo te apura o te pide una clave, frená y volvé a consultar.'
  }

  if (clave === 'rojo') return `Este caso es Peligroso.${detalle} ${PASOS}`
  if (clave === 'amarillo') return `Este caso está en Dudoso. Revisá antes de seguir.${detalle}`
  return `Este caso está en Seguro. No aparecieron señales fuertes.${detalle}`
}
