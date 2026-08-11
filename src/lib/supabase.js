import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Single centralized Supabase client for the whole app.
// Credentials come exclusively from Vite environment variables (.env.local).
// Never hardcode Supabase credentials in source code, and never use a
// service-role/secret key in frontend code.
// ---------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Returns the names of any required environment variables that are missing.
 * @returns {string[]}
 */
export function getMissingEnvVars() {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabasePublishableKey) missing.push('VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY')
  return missing
}

const missingEnvVars = getMissingEnvVars()

// Clear, loud error instead of a silent failure, in dev and production alike.
// Only the variable *names* are logged — no sensitive values are exposed.
if (missingEnvVars.length > 0) {
  console.error(
    `[Supabase] Configuration error: missing ${missingEnvVars.join(' and ')}. ` +
      'Add them to your .env.local file and restart the dev server.',
  )
}

/**
 * The shared Supabase client.
 * Is `null` until both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/PUBLISHABLE_KEY
 * are present, so callers must guard with `if (supabase)` or check
 * `getMissingEnvVars()` first.
 */
export const supabase =
  missingEnvVars.length === 0
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null
