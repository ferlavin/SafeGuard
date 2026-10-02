import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
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

function credencialesGmail() {
  const usuario = (Deno.env.get('GMAIL_USER') ?? '').trim()
  const clave = (Deno.env.get('GMAIL_APP_PASSWORD') ?? '').replaceAll(/\s/g, '')
  return { usuario, clave }
}

function errorGmail(error: unknown) {
  const crudo = error instanceof Error ? error.message : 'Gmail rechazó el correo'
  if (/535|BadCredentials|Username and Password not accepted|Invalid login/i.test(crudo)) {
    return 'Gmail rechazó la contraseña de aplicación. Revisá GMAIL_USER y GMAIL_APP_PASSWORD en Supabase → Edge Functions → Secrets.'
  }
  return crudo
}

async function mandarGmail(from: string, to: string, subject: string, html: string, text: string) {
  const { usuario, clave } = credencialesGmail()
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: {
        username: usuario,
        password: clave,
      },
    },
  })
  try {
    await client.send({
      from,
      to,
      subject,
      content: text,
      html,
    })
  } finally {
    await client.close()
  }
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

    const { usuario, clave } = credencialesGmail()
    if (!usuario || !clave) {
      return json({
        ok: false,
        error:
          'Faltan los secretos GMAIL_USER y GMAIL_APP_PASSWORD en Supabase → Edge Functions → Secrets.',
      })
    }

    const personas = (eventos ?? []).map(
      (ev: { token_unico: string; empleados: { nombre?: string; email?: string } | null }) => {
        const persona = ev.empleados
        const sim = `${origen}/simulacion/${ev.token_unico}`
        const bien = `${origen}/bien/${ev.token_unico}`
        const mensaje = mensajeSimulacion(campana.canal, plantilla, sim)
        return {
          nombre: persona?.nombre ?? 'Empleado',
          email: persona?.email ?? '',
          sim,
          bien,
          mensaje,
        }
      },
    )

    const filas = personas
      .map(
        (persona) => `<tr>
          <td>${esc(persona.nombre)}<br/><span style="color:#667085">${esc(persona.email)}</span></td>
          <td><a href="${esc(persona.sim)}">${esc(persona.sim)}</a><pre style="white-space:pre-wrap;font-family:inherit">${esc(persona.mensaje)}</pre></td>
          <td><a href="${esc(persona.bien)}">${esc(persona.bien)}</a></td>
        </tr>`,
      )
      .join('')

    const texto = personas
      .map(
        (persona) =>
          `${persona.nombre} ${persona.email}\nSimulación: ${persona.sim}\nLo hiciste bien: ${persona.bien}\n${persona.mensaje}`,
      )
      .join('\n\n')

    const html = `
      <p>Se creó la campaña <strong>${esc(campana.nombre_campana)}</strong> (${esc(campana.canal)}).</p>
      <p>Estos son los enlaces para mandar a cada persona. El de simulación es el cebo; el de “lo hiciste bien” es para quien no tocó el enlace.</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <thead><tr><th>Persona</th><th>Simulación</th><th>Lo hiciste bien</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="3">Sin destinatarios.</td></tr>'}</tbody>
      </table>
    `

    const from = `PhishGuard <${usuario}>`
    const destino = user.email
    const asunto = `Campaña lista: ${campana.nombre_campana}`
    const plano = [
      `Se creó la campaña ${campana.nombre_campana} (${campana.canal}).`,
      'El enlace de simulación es el cebo. El de “lo hiciste bien” es para quien no tocó el enlace.',
      '',
      texto || 'Sin destinatarios.',
    ].join('\n')

    try {
      await mandarGmail(from, destino, asunto, html, plano)
    } catch (error) {
      console.log(JSON.stringify({ destino, from: usuario, campana: campanaId, ok: false }))
      return json({ ok: false, error: errorGmail(error) })
    }

    console.log(JSON.stringify({ destino, from: usuario, campana: campanaId, ok: true }))
    return json({ ok: true, destino })
  } catch (error) {
    console.error(error)
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo avisar',
    })
  }
})
