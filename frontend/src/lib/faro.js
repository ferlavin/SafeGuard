import { supabase } from './supabase.js'

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

function caso(nivel, motivos) {
  const clave = PALABRA[nivel] ? nivel : 'amarillo'
  return {
    clave,
    palabra: PALABRA[clave],
    lista: motivosDe(motivos),
    detalle: motivosDe(motivos).length ? ` ${motivosDe(motivos).join(' ')}` : '',
  }
}

function cierre(clave) {
  if (clave === 'rojo') return PASOS
  if (clave === 'amarillo') {
    return 'No cargues datos ni sigas ese mensaje. Entrá por la página o la app oficial, o preguntá por otro canal.'
  }
  return 'Si igual te piden una clave, un código o un pago, no lo hagas desde ese mensaje.'
}

const TEMAS = [
  {
    id: 'ya',
    test: /ya (hice clic|entre|abri|respondi|puse|ingrese|pague|di|mande)|lo abri|puse la clave|puse mi|me hackearon|ya lo vi/,
    armar(c) {
      if (c.clave === 'rojo') {
        return 'Si ya entraste, respondiste o pusiste datos, no sigas. No pongas nada más. Cambiá la clave desde la página o la app oficial, no desde este mensaje, y avisá a tu empresa por otro canal.'
      }
      if (c.clave === 'amarillo') {
        return 'Si ya entraste, no cargues claves ni códigos. Seguí por el sitio oficial y, si te pidieron datos, avisá a tu empresa.'
      }
      return 'No aparecieron señales fuertes. Si igual cargaste una clave porque el mensaje te apuraba, cambiala desde el sitio oficial.'
    },
  },
  {
    id: 'explicar',
    test: /como (le |se |les )?(explico|digo|cuento|aviso)/,
    armar(c) {
      const motivo = c.lista.length ? ` El motivo es: ${c.lista.join(' ')}` : ''
      if (c.clave === 'rojo') {
        return `Decilo así, sin pasar el enlace: «Quedó en Peligroso.${motivo} Por eso no lo abrí». Si hace falta, mostrale esta pantalla.`
      }
      return `Decilo así: «Quedó en ${c.palabra}.${motivo}». No hace falta reenviar el mensaje.`
    },
  },
  {
    id: 'avisar',
    test: /avis|empresa|jefe|banco|afip|policia|denunci|a quien|mama|papa|familia|companero|amigo/,
    armar(c, q) {
      const quien = /banco/.test(q)
        ? 'al banco'
        : /afip/.test(q)
          ? 'a AFIP'
          : /mama|papa|familia|amigo/.test(q)
            ? 'a esa persona'
            : 'a tu empresa, o a quien te escribió'
      if (c.clave === 'rojo') {
        return `Avisá ${quien}, por teléfono, en persona o por un canal que ya uses. No uses el enlace de este mensaje ni respondas por ahí.`
      }
      return `El resultado es ${c.palabra}. Si querés confirmarlo, hablá ${quien} por un canal que ya uses, no por el mensaje que estás revisando.`
    },
  },
  {
    id: 'datos',
    test: /clave|contrasena|codigo|tarjeta|dato|dni|cuil|selfie|token|whatsapp/,
    armar(c) {
      if (c.clave === 'verde') {
        return 'Aunque esté en Seguro, una clave, un código o un dato no se cargan desde un enlace que te llegó. Entrá vos al sitio o a la app oficial.'
      }
      return `No pongas claves, códigos ni datos de la tarjeta. Este caso está en ${c.palabra}.`
    },
  },
  {
    id: 'abrir',
    test: /puedo (entrar|abrir|hacer clic|descargar|confiar|pagar)|es seguro|esta bien|lo abro|hago clic|lo descargo|confio/,
    armar(c) {
      if (c.clave === 'rojo') return 'No. Este resultado es Peligroso. No abras el enlace, no descargues el archivo y no pagues desde ahí.'
      if (c.clave === 'amarillo') {
        return 'Todavía no. Está en Dudoso. Leé el motivo y seguí por el sitio oficial, no por este mensaje.'
      }
      return 'Este resultado es Seguro: no aparecieron señales fuertes. Si el mensaje te pide una clave, un código o un pago, no lo hagas igual.'
    },
  },
  {
    id: 'porque',
    test: /por que|motivo|explica|que paso|que significa|no entiendo|semaforo|se equivoc/,
    armar(c) {
      if (!c.lista.length) {
        return `Quedó en ${c.palabra}. No hay un motivo extra guardado. ${cierre(c.clave)}`
      }
      return `Quedó en ${c.palabra} por esto:${c.detalle} Eso no cambia el semáforo: ${cierre(c.clave)}`
    },
  },
  {
    id: 'hacer',
    test: /que hago|que hacer|y ahora|pasos|como sigo/,
    armar(c) {
      if (c.clave === 'rojo') return `Hacé esto: ${PASOS}`
      if (c.clave === 'amarillo') return `Revisá el motivo antes de seguir. ${cierre(c.clave)}`
      return `Podés seguir con cuidado. ${cierre(c.clave)}`
    },
  },
  {
    id: 'borrar',
    test: /borr|elimin/,
    armar(c) {
      if (c.clave === 'rojo') return `Sí, borralo después de avisar. Borrarlo no deshace un clic ni una clave que ya hayas puesto. ${PASOS}`
      return `Podés borrarlo si no lo necesitás. El resultado es ${c.palabra}. ${cierre(c.clave)}`
    },
  },
  {
    id: 'responder',
    test: /respon|contestar|le escribo|le digo/,
    armar(c) {
      if (c.clave === 'rojo') return 'No respondas ese mensaje. Si tenés que avisar, hacelo por teléfono o en persona.'
      if (c.clave === 'amarillo') return 'No respondas por ese mismo mensaje. Preguntá por otro canal o entrá por la app oficial.'
      return 'No hace falta responder si el mensaje te apura o te pide datos. Si conocés a la persona, confirmalo por otro lado.'
    },
  },
  {
    id: 'reenviar',
    test: /reenv|reenvi|mandar(selo|lo)|compart/,
    armar(c) {
      if (c.clave === 'rojo') return 'No lo reenvíes. Quien lo reciba puede abrirlo. Contale el aviso por otro canal, sin el enlace.'
      return `El resultado es ${c.palabra}. Si lo compartís, no mandes el enlace: contá el resultado.`
    },
  },
  {
    id: 'llamar',
    test: /llam|numero|telefono/,
    armar(c) {
      if (c.clave === 'rojo') return 'No llames al número que figura en ese mensaje. Buscá el teléfono en la página oficial o en un lugar que ya uses.'
      return `El resultado es ${c.palabra}. Si vas a llamar, usá un número que ya conozcas, no el que vino en el mensaje.`
    },
  },
  {
    id: 'conocido',
    test: /banco|afip|mercado pago|mercadopago|whatsapp|conocido|mi jefe|parece real|es real|oficial/,
    armar(c) {
      return `Que el nombre parezca conocido no cambia el resultado: está en ${c.palabra}.${c.detalle} ${cierre(c.clave)}`
    },
  },
]

export function responderFaro({ nivel, motivos, pregunta }) {
  const c = caso(nivel, motivos)
  const q = texto(pregunta)
  if (!q.trim()) return 'Escribí la duda sobre este resultado.'

  const orden = ['ya', 'explicar', 'abrir', 'datos', 'llamar', 'responder', 'reenviar', 'borrar', 'avisar', 'hacer', 'porque', 'conocido']
  const coinciden = TEMAS.filter((tema) => tema.test.test(q))
  coinciden.sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))
  if (coinciden.length) {
    const respuesta = coinciden[0].armar(c, q)
    if (c.detalle && !respuesta.includes(c.lista[0])) return `${respuesta}${c.detalle}`
    return respuesta
  }

  const tema = String(pregunta).trim().replace(/\s+/g, ' ').slice(0, 180)
  return `Sobre «${tema}»: este caso está en ${c.palabra}.${c.detalle} ${cierre(c.clave)}`
}

export async function consultarFaro({ nivel, motivos, pregunta, historial }) {
  const limpio = String(pregunta ?? '').trim()
  if (!limpio) return responderFaro({ nivel, motivos, pregunta: limpio })

  try {
    const { data, error } = await supabase.functions.invoke('faro-consultar', {
      body: {
        nivel,
        motivos,
        pregunta: limpio.slice(0, 500),
        historial: (historial ?? []).slice(-6).map((turno) => ({
          rol: turno.rol === 'faro' ? 'faro' : 'vos',
          texto: String(turno.texto ?? '').slice(0, 500),
        })),
      },
    })
    if (!error && data?.ok && typeof data.respuesta === 'string' && data.respuesta.trim()) {
      return data.respuesta.trim()
    }
  } catch {
    // Si el modelo no está disponible, Faro responde con el caso guardado.
  }

  return responderFaro({ nivel, motivos, pregunta: limpio })
}
