import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Tenés que entrar' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: falloUser,
    } = await supabase.auth.getUser()

    if (falloUser || !user?.email) {
      return json({ ok: false, error: 'No hay sesión' }, 401)
    }

    const cuerpoReq = await req.json().catch(() => ({}))
    const campanaId = typeof cuerpoReq?.campana_id === 'string' ? cuerpoReq.campana_id : ''
    const origen = origenSeguro(cuerpoReq?.origen)

    if (!campanaId) return json({ ok: false, error: 'Falta la campaña' }, 400)
    if (!origen) return json({ ok: false, error: 'Falta la dirección de la app' }, 400)

    const { data: campana, error: falloCampana } = await supabase
      .from('campanas')
      .select(
        'id, nombre_campana, canal, plantillas_phishing(titulo, asunto_mail, remitente_falso, cuerpo_html), eventos_simulacion(token_unico, empleados(nombre, email))',
      )
      .eq('id', campanaId)
      .maybeSingle()

    if (falloCampana || !campana) {
      return json({ ok: false, error: falloCampana?.message ?? 'No se encontró la campaña' }, 404)
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json({
        ok: false,
        error: 'Falta configurar RESEND_API_KEY en los secretos de Supabase.',
      })
    }

    const plantilla = Array.isArray(campana.plantillas_phishing)
      ? campana.plantillas_phishing[0]
      : campana.plantillas_phishing
    const eventos = campana.eventos_simulacion ?? []
    const filas = eventos
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
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: `Campaña lista: ${campana.nombre_campana}`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return json({
        ok: false,
        error: data?.message ?? 'Resend rechazó el correo',
      })
    }

    return json({ ok: true })
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'No se pudo avisar' },
      400,
    )
  }
})
