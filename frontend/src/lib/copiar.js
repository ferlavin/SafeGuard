export async function copiarTexto(texto) {
  if (!texto) return false

  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const campo = document.createElement('textarea')
      campo.value = texto
      campo.setAttribute('readonly', '')
      campo.style.cssText = 'position:fixed;left:-9999px;top:0'
      document.body.appendChild(campo)
      campo.focus()
      campo.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(campo)
      return ok
    } catch {
      return false
    }
  }
}
