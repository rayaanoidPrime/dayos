import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })
  return { error: error?.message ?? null }
}

export async function getSessionEmail(): Promise<string | null> {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session?.user?.email ?? null
}

export async function consumeAuthRedirect(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not configured.' }
  }

  const hash = window.location.hash
  const query = window.location.search
  const hasAuthParams =
    hash.includes('access_token=') || hash.includes('refresh_token=') || query.includes('code=')

  if (!hasAuthParams) {
    return { error: null }
  }

  if (query.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
    if (error) {
      return { error: error.message }
    }
    window.history.replaceState({}, document.title, window.location.pathname)
    return { error: null }
  }

  // For hash-based magic-link redirects, let Supabase parse/store tokens first.
  // Clearing hash too early can drop the session before it is persisted.
  if (hash.includes('access_token=') || hash.includes('refresh_token=')) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < 2500) {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        break
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100))
    }
  }

  return { error: null }
}

export async function signOutSession(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase is not configured.' }
  }
  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) {
    return null
  }
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}
