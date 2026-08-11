// ---------------------------------------------------------------------------
// Pets data layer.
// All queries go through the shared Supabase client. Row-level security (RLS)
// on public.pets guarantees users can only read/write rows where
// `owner_id = auth.uid()` — this module never filters by anything else and
// never touches other users' data.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const PET_SELECT =
  'id, created_at, updated_at, owner_id, name, type, breed, birth_date, gender, weight, avatar_url'

/**
 * Fetch all pets owned by the current user.
 * @returns {Promise<Array>}
 */
export async function fetchPets() {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('pets')
    .select(PET_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Create a pet owned by the given user.
 * @param {string} ownerId
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createPet(ownerId, input) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...input, owner_id: ownerId })
    .select(PET_SELECT)
    .single()
  if (error) throw error
  return data
}

/**
 * Update an existing pet (id must belong to the current user — enforced by RLS).
 * @param {string} id
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function updatePet(id, input) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('pets')
    .update(input)
    .eq('id', id)
    .select(PET_SELECT)
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a pet owned by the current user (enforced by RLS).
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePet(id) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('pets').delete().eq('id', id)
  if (error) throw error
}

/**
 * Convert a raw Supabase error into a friendly message for pet operations.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getPetErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  const code = String(error.code || '')
  if (code === '42501') {
    return 'You do not have permission to perform that action.'
  }
  if (code === '23514' || code === '22P02') {
    return 'One of the values is not valid. Please check the form and try again.'
  }
  if (code === 'PGRST116') {
    return 'This pet no longer exists. It may have been removed.'
  }

  const raw = String(error.message || '')
  if (/network|failed to fetch|fetch failed|load failed/i.test(raw)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }
  if (/row-level security/i.test(raw)) {
    return 'You do not have permission to perform that action.'
  }

  return fallback
}
