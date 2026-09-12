import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const clavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !clavePublica) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example a .env.local y reiniciá el servidor.',
  )
}

export const supabase = createClient(url, clavePublica)
