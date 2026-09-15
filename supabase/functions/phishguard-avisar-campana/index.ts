import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function esc(valor: string) {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function origenSeguro(valor: unknown) {
  if (typeof valor !== 'string') return ''
  try {
    const u = new URL(valor)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.origin
  } catch {
    return ''
  }
}

function clavePublica() {
  const directa =
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  if (directa) return directa
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<
      string,
      string
    >
    return keys.default ?? Object.values(keys)[0] ?? ''
  } catch {
    return ''
  }
}

function emailDePrueba(mensaje: string) {
  return mensaje.match(/\(([^)\s]+@[^)\s]+)\)/)?.[1] ?? ''
}

function mensajeSimulacion(
  canal: string,
  plantilla: {
    asunto_mail?: string | null
    remitente_falso?: string | null
    cuerpo_html?: string | null
  } | null,
  link: string,
) {
  const cuerpo = (plantilla?.cuerpo_html ?? 'Entrá acá: {link}').replaceAll('{link}', link)
  if (canal === 'email') {
    const de = plantilla?.remitente_falso ?? ''
    const asunto = plantilla?.asunto_mail ?? ''
    return `De: ${de}\nAsunto: ${asunto}\n\n${cuerpo}`
  }
  return cuerpo
}

async function mandarResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  const data = (await res.json()) as { id?: string; message?: string; name?: string }
  return { ok: res.ok, status: res.status, data }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Tenés que entrar' })

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', clavePublica(), {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: falloUser,
    } = await supabase.auth.getUser()

    if (falloUser || !user?.email) {
      return json({ ok: false, error: 'No hay sesión para saber a quién mandar el correo' })
    }

    const cuerpoReq = await req.json().catch(() => ({}))
    const campanaId = typeof cuerpoReq?.campana_id === 'string' ? cuerpoReq.campana_id : ''
    const origen = origenSeguro(cuerpoReq?.origen)

    if (!campanaId) return json({ ok: false, error: 'Falta la campaña' })
    if (!origen) return json({ ok: false, error: 'Falta la dirección de la app' })

    const { data: campana, error: falloCampana } = await supabase
      .from('campanas')
      .select('id, nombre_campana, canal, plantilla_id')
      .eq('id', campanaId)
      .maybeSingle()

    if (falloCampana || !campana) {
      return json({
        ok: false,
        error: falloCampana?.message ?? 'No se encontró la campaña',
      })
    }

    const [{ data: plantilla }, { data: eventos }] = await Promise.all([
      campana.plantilla_id
        ? supabase
            .from('plantillas_phishing')
            .select('titulo, asunto_mail, remitente_falso, cuerpo_html')
            .eq('id', campana.plantilla_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('eventos_simulacion')
        .select('token_unico, empleados(nombre, email)')
        .eq('campana_id', campanaId),
    ])

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json({
        ok: false,
        error: 'Falta el secreto RESEND_API_KEY en Supabase → Edge Functions → Secrets.',
      })
    }

    const filas = (eventos ?? [])
      .map((ev: { token_unico: string; empleados: { nombre?: string; email?: string } | null }) => {
        const persona = ev.empleados
        const sim = `${origen}/simulacion/${ev.token_unico}`
        const bien = `${origen}/bien/${ev.token_unico}`
        const mensaje = mensajeSimulacion(campana.canal, plantilla, sim)
        return `<tr>
          <td>${esc(persona?.nombre ?? 'Empleado')}<br/><span style="color:#667085">${esc(persona?.email ?? '')}</span></td>
          <td><a href="${esc(sim)}">${esc(sim)}</a><pre style="white-space:pre-wrap;font-family:inherit">${esc(mensaje)}</pre></td>
          <td><a href="${esc(bien)}">${esc(bien)}</a></td>
        </tr>`
      })
      .join('')

    const html = `
      <p>Se creó la campaña <strong>${esc(campana.nombre_campana)}</strong> (${esc(campana.canal)}).</p>
      <p>Estos son los enlaces para mandar a cada persona. El de simulación es el cebo; el de “lo hiciste bien” es para quien no tocó el enlace.</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <thead><tr><th>Persona</th><th>Simulación</th><th>Lo hiciste bien</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="3">Sin destinatarios.</td></tr>'}</tbody>
      </table>
    `

    const from = Deno.env.get('RESEND_FROM') ?? 'SafeGuard <beth.t@example.com>'
    const destinoForzado = Deno.env.get('RESEND_TO') ?? ''
    const destinos = [destinoForzado || user.email]

    let envio = await mandarResend(
      apiKey,
      from,
      destinos[0],
      `Campaña lista: ${campana.nombre_campana}`,
      html,
    )

    if (!envio.ok) {
      const permitido = emailDePrueba(envio.data.message ?? '')
      if (permitido && permitido.toLowerCase() !== destinos[0].toLowerCase()) {
        console.log(`resend_reintento hacia ${permitido}`)
        envio = await mandarResend(
          apiKey,
          from,
          permitido,
          `Campaña lista: ${campana.nombre_campana}`,
          html,
        )
        if (envio.ok) {
          return json({
            ok: true,
            destino: permitido,
            aviso: `Resend está en modo prueba: el correo salió a ${permitido}, no a ${user.email}.`,
          })
        }
      }
    }

    console.log(
      JSON.stringify({
        tiene_key: true,
        destino: destinos[0],
        usuario: user.email,
        campana: campanaId,
        resend_status: envio.status,
      }),
    )

    if (!envio.ok) {
      const crudo = envio.data.message ?? 'Resend rechazó el correo'
      const prueba = /testing emails|own email/i.test(crudo)
      return json({
        ok: false,
        error: prueba
          ? `Resend en modo prueba solo entrega al mail de la cuenta de Resend. ${crudo}`
          : crudo,
      })
    }

    return json({ ok: true, destino: destinos[0] })
  } catch (error) {
    console.error(error)
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo avisar',
    })
  }
})
