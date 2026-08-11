import { supabase, getMissingEnvVars } from './supabase.js'

/**
 * Development-only connection test for the Supabase client.
 *
 * - Logs results to the browser console only — it never renders any UI.
 * - Makes one real, table-free request to the Supabase server. No tables are
 *   created and no fake/mock responses are used.
 * - Exits early with a clear message when environment variables are missing.
 *
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function testSupabaseConnection() {
  if (!import.meta.env.DEV) {
    return { ok: false, reason: 'dev-only-check' }
  }

  const missing = getMissingEnvVars()
  if (missing.length > 0) {
    console.error(
      `[Supabase] Connection test skipped — missing environment variable(s): ` +
        `${missing.join(', ')}. Fill them in .env.local and restart the dev server.`,
    )
    return { ok: false, reason: `missing: ${missing.join(', ')}` }
  }

  if (!supabase) {
    console.error('[Supabase] Connection test skipped — client is not initialized.')
    return { ok: false, reason: 'client-not-initialized' }
  }

  try {
    // A real round trip that works before any tables exist:
    // - 42P01 ("relation does not exist") means the server responded and the
    //   key is valid — the expected result when no tables are created yet.
    // - PGRST205 ("could not find the table in the schema cache") is the newer
    //   PostgREST equivalent of 42P01 — also proof of a valid round trip.
    // - PGRST301 (401) means the key is invalid.
    // - A network error means the URL is wrong.
    const { error } = await supabase.from('_connection_test').select('*').limit(1)

    if (!error || error.code === '42P01' || error.code === 'PGRST205') {
      console.info('[Supabase] Connection OK — client initialized, server reachable, credentials valid.')
      return { ok: true }
    }

    if (error.code === 'PGRST301') {
      console.error('[Supabase] Connection FAILED — invalid VITE_SUPABASE_PUBLISHABLE_KEY.')
      return { ok: false, reason: error.message }
    }

    console.error(`[Supabase] Connection FAILED — ${error.message}`)
    return { ok: false, reason: error.message }
  } catch (error) {
    console.error(`[Supabase] Connection FAILED — ${error.message}`)
    return { ok: false, reason: error.message }
  }
}
