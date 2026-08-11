// ---------------------------------------------------------------------------
// Veterinary discovery data layer.
// Reads real data from public.veterinarians and public.clinics through the
// shared Supabase client. RLS allows public reads of both tables; favorites
// are handled separately via public.favorites.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const VET_SELECT = `
  id,
  created_at,
  name,
  specialty,
  bio,
  avatar_url,
  license_number,
  clinic_id,
  clinics ( id, name, address, phone, email, website, latitude, longitude )
`

const CLINIC_SELECT = `
  id,
  name,
  address,
  phone,
  email,
  website,
  latitude,
  longitude
`

/** Strip PostgREST-special characters from a search term. */
function sanitizeSearchTerm(search) {
  return search
    .replace(/[(),%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch veterinarians with optional filters.
 * @param {{ search?: string, specialty?: string, clinicId?: string }} options
 * @returns {Promise<Array>}
 */
export async function fetchVeterinarians({
  search = '',
  specialty = '',
  clinicId = '',
} = {}) {
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase.from('veterinarians').select(VET_SELECT)

  if (clinicId) {
    query = query.eq('clinic_id', clinicId)
  }
  if (specialty) {
    query = query.eq('specialty', specialty)
  }

  const term = sanitizeSearchTerm(search)
  if (term) {
    // Internal spaces become wildcards so multi-word queries match across
    // word boundaries. Only plain columns — PostgREST `or()` does not support
    // embedded (clinics.name) filters.
    const q = `%${term.replace(/\s+/g, '%')}%`
    query = query.or(`name.ilike.${q},specialty.ilike.${q}`)
  }

  const { data, error } = await query.order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch clinics, optionally filtered by a search term (name/address).
 * @param {{ search?: string }} options
 * @returns {Promise<Array>}
 */
export async function fetchClinics({ search = '' } = {}) {
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase.from('clinics').select(CLINIC_SELECT)

  const term = sanitizeSearchTerm(search)
  if (term) {
    const q = `%${term.replace(/\s+/g, '%')}%`
    query = query.or(`name.ilike.${q},address.ilike.${q}`)
  }

  const { data, error } = await query.order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch the distinct specialties present on veterinarians.
 * @returns {Promise<string[]>}
 */
export async function fetchSpecialties() {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('veterinarians')
    .select('specialty')
    .not('specialty', 'is', null)
  if (error) throw error
  const values = [...new Set((data ?? []).map((row) => row.specialty).filter(Boolean))]
  return values.sort((a, b) => a.localeCompare(b))
}

/**
 * Fetch a single veterinarian by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchVeterinarianById(id) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('veterinarians')
    .select(VET_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Fetch active veterinarians by a list of ids (used by the Favorites page).
 * Deleted/unavailable rows are simply omitted — never crashes the page.
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchVetsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (!supabase || clean.length === 0) return []
  const { data, error } = await supabase
    .from('veterinarians')
    .select(VET_SELECT)
    .in('id', clean)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch clinics by a list of ids (used by the Favorites page). Deleted rows
 * are simply omitted.
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchClinicsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (!supabase || clean.length === 0) return []
  const { data, error } = await supabase
    .from('clinics')
    .select(CLINIC_SELECT)
    .in('id', clean)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch the veterinarian profile(s) linked to a user account (the
 * veterinarian portal uses this to identify which clinic the vet belongs to).
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchVetsByUserId(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('veterinarians')
    .select(VET_SELECT)
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single clinic by id, including its associated veterinarians.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchClinicById(id) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('clinics')
    .select(
      `${CLINIC_SELECT}, veterinarians ( id, name, specialty, bio, avatar_url, license_number )`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Convert a raw Supabase error into a friendly message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getVetsErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  const code = String(error.code || '')
  if (code === 'PGRST116') {
    return 'This entry is no longer available.'
  }
  if (code === '42501') {
    return 'You do not have permission to perform that action.'
  }

  const raw = String(error.message || '')
  if (/network|failed to fetch|fetch failed|load failed/i.test(raw)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }

  return fallback
}
