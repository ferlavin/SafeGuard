import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PALABRA: Record<string, string> = {
  verde: 'Seguro',
  amarillo: 'Dudoso',
  rojo: 'Peligroso',
}

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function recortar(valor: unknown, max: number) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function motivosDe(valor: unknown) {
  if (Array.isArray(valor)) {
    return valor.map((item) => recortar(item, 240)).filter(Boolean).slice(0, 8)
  }
  const texto = recortar(valor, 800)
  return texto ? [texto] : []
}

function sistema(nivel: string, motivos: string[]) {
  const palabra = PALABRA[nivel]
  const lista = motivos.length ? motivos.map((item) => `- ${item}`).join('\n') : '- No hay un motivo extra guardado.'
  return `Sos Faro, un robot chico que acompaña en SafeLink. Hablás en español rioplatense, de vos, cercano y concreto, como quien está al lado. Máximo 5 oraciones. No uses emojis.

El semáforo ya decidió este caso. No lo cambies ni lo contradigas.
Nivel: ${palabra}.
Motivos de este caso:
${lista}

Respondé la pregunta que hizo la persona, aunque sea rara o no esté entre las sugerencias: qué hacer, a quién avisar, si borrar, responder, reenviar, llamar, cambiar una clave, hablar con el banco, con la familia o con la empresa, qué significa el resultado, o una duda general de engaños. Atá la respuesta a este caso.

Si es Peligroso, no le digas que abra, descargue, responda, pague ni cargue datos.
Si es Dudoso, no le digas que siga el mensaje: que use la página o la app oficial, o que pregunte por otro canal.
Si es Seguro, podés decir que no hubo señales fuertes. Igual, una clave, un código o un pago no se hacen desde un enlace que llegó en un mensaje.

No inventes señales que no estén en los motivos. No pidas el mensaje, el enlace ni el archivo. Si la pregunta no tiene que ver con este caso ni con engaños, respondé en una oración y volvé a este resultado. No menciones que usás un modelo.`
}

function textoModelo(data: { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }) {
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parts
    .filter((parte) => parte.text && !parte.thought)
    .map((parte) => parte.text)
    .join('')
    .trim()
}

function contradice(nivel: string, respuesta: string) {
  if (nivel !== 'rojo') return false
  const q = respuesta
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return /puedes abrirlo|podes abrirlo|si,? abrilo|si,? entrá|si,? entra|es seguro abrirlo|seguí el enlace|segui el enlace|responde el mensaje/.test(q)
}

async function generar(clave: string, cuerpo: unknown) {
  const preferido = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash'
  const modelos = [...new Set([preferido, 'gemini-3.5-flash', 'gemini-2.5-flash'])]
  let ultimo = 0
  for (const modelo of modelos) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': clave,
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(20000),
      },
    )
    if (res.status === 404) {
      ultimo = 404
      continue
    }
    return res
  }
  return new Response('', { status: ultimo || 404 })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405)

  const clave = ['GEMINI_API_KEY', 'Gemini API Key', 'GEMINI_KEY', 'GOOGLE_API_KEY']
    .map((nombre) => Deno.env.get(nombre)?.trim() ?? '')
    .find(Boolean) ?? ''
  if (!clave) return json({ ok: false, error: 'Falta GEMINI_API_KEY.' })

  let cuerpo: {
    nivel?: unknown
    motivos?: unknown
    pregunta?: unknown
    historial?: unknown
  }
  try {
    cuerpo = await req.json()
  } catch {
    return json({ ok: false, error: 'No se pudo leer la consulta.' }, 400)
  }

  const nivel = PALABRA[String(cuerpo.nivel)] ? String(cuerpo.nivel) : 'amarillo'
  const motivos = motivosDe(cuerpo.motivos)
  const pregunta = recortar(cuerpo.pregunta, 500)
  if (!pregunta) return json({ ok: false, error: 'Falta la pregunta.' }, 400)

  const historial = Array.isArray(cuerpo.historial) ? cuerpo.historial.slice(-6) : []
  const contents = historial.flatMap((turno) => {
    const texto = recortar((turno as { texto?: unknown })?.texto, 500)
    if (!texto) return []
    const rol = (turno as { rol?: unknown })?.rol === 'faro' ? 'model' : 'user'
    return [{ role: rol, parts: [{ text: texto }] }]
  })
  contents.push({ role: 'user', parts: [{ text: pregunta }] })

  try {
    const res = await generar(clave, {
      systemInstruction: { parts: [{ text: sistema(nivel, motivos) }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    })
    if (!res.ok) {
      const detalle = await res.text()
      console.log('faro-modelo', res.status, detalle.replace(/AIza[0-9A-Za-z_-]+/g, '').slice(0, 180))
      return json({ ok: false, error: 'Faro no pudo razonar esta consulta.' })
    }
    const data = await res.json()
    const respuesta = textoModelo(data).slice(0, 1200)
    if (!respuesta || contradice(nivel, respuesta)) {
      return json({ ok: false, error: 'La respuesta no se pudo usar.' })
    }
    return json({ ok: true, respuesta })
  } catch {
    return json({ ok: false, error: 'Faro no pudo razonar esta consulta.' })
  }
})
