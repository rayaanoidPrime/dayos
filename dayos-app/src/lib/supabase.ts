import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl!, supabaseAnonKey!) : null

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }
  }

  const { error } = await supabase.auth.signInWithOtp({ email })
  return { error: error?.message ?? null }
}

export async function getSessionEmail(): Promise<string | null> {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session?.user?.email ?? null
}
