import { analizar, nivelDesde } from './analisis.js'

let pdfjsCargado = null

async function cargarPdfjs() {
  if (!pdfjsCargado) {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    pdfjsCargado = pdfjs
  }
  return pdfjsCargado
}

export async function analizarPdf(archivo) {
  const pdfjs = await cargarPdfjs()
  const datos = await archivo.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: datos }).promise
  const senales = []
  const enlaces = []
  let puntos = 0

  const adjuntos = await doc.getAttachments()
  if (adjuntos && Object.keys(adjuntos).length > 0) {
    puntos += 25
    senales.push('El PDF trae archivos adjuntos adentro.')
  }

  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i)
    const anotaciones = await pagina.getAnnotations()
    for (const anotacion of anotaciones) {
      if (anotacion.subtype === 'Widget') {
        puntos += 15
        senales.push('Tiene un formulario: puede pedir datos.')
      }
      if (anotacion.action === 'Launch') {
        puntos += 40
        senales.push('Intenta abrir un programa de tu computadora.')
      }
      const href = anotacion.url ?? anotacion.unsafeUrl
      if (href) enlaces.push(href)
    }
    const js = await pagina.getJSActions()
    if (js && Object.keys(js).length > 0) {
      puntos += 30
      senales.push('Ejecuta JavaScript dentro del PDF.')
    }
    const texto = await pagina.getTextContent()
    const plano = texto.items.map((it) => it.str).join(' ')
    for (const m of plano.match(/https?:\/\/[^\s]+/g) ?? []) enlaces.push(m)
  }

  const unicos = [...new Set(enlaces)]
  const analizados = unicos.map((u) => analizar(u)).filter(Boolean)
  const peor = analizados.reduce((a, b) => (b.puntuacion > a.puntuacion ? b : a), {
    puntuacion: 0,
  })

  const puntuacion = Math.min(100, puntos + (peor.puntuacion ?? 0))
  if (senales.length === 0 && analizados.length === 0) {
    senales.push('No aparecen formularios, scripts ni enlaces raros.')
  }

  return {
    url: archivo.name,
    nombre: archivo.name,
    dominio: analizados[0]?.dominio ?? 'archivo-sin-enlaces',
    puntuacion,
    nivel: nivelDesde(puntuacion),
    motivos: [
      ...senales,
      ...analizados.flatMap((e) => e.motivos.filter((m) => !m.startsWith('No aparecen'))),
    ],
    senales,
    enlaces: analizados,
  }
}
