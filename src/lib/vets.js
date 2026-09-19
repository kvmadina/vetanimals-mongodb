// ---------------------------------------------------------------------------
// Veterinary discovery data layer.
// Reads /api/veterinarians and /api/clinics. Both are public endpoints;
// favorites are handled separately in favorites.js.
// ---------------------------------------------------------------------------
import { api, isNetworkError, queryString } from './api.js'

/**
 * Fetch veterinarians with optional filters.
 * @param {{ search?: string, specialty?: string, clinicId?: string }} options
 * @returns {Promise<Array>}
 */
export async function fetchVeterinarians({ search = '', specialty = '', clinicId = '' } = {}) {
  return (await api(`/veterinarians${queryString({ search, specialty, clinicId })}`)) ?? []
}

/**
 * Fetch clinics, optionally filtered by a search term (name/address).
 * @param {{ search?: string }} options
 * @returns {Promise<Array>}
 */
export async function fetchClinics({ search = '' } = {}) {
  return (await api(`/clinics${queryString({ search })}`)) ?? []
}

/**
 * Fetch the distinct specialties present on veterinarians.
 * @returns {Promise<string[]>}
 */
export async function fetchSpecialties() {
  return (await api('/veterinarians/specialties')) ?? []
}

/**
 * Fetch a single veterinarian by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchVeterinarianById(id) {
  try {
    return await api(`/veterinarians/${id}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

/**
 * Fetch veterinarians by a list of ids (used by the Favorites page).
 * Deleted/unavailable rows are simply omitted — never crashes the page.
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchVetsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (clean.length === 0) return []
  return (await api(`/veterinarians${queryString({ ids: clean.join(',') })}`)) ?? []
}

/**
 * Fetch clinics by a list of ids (used by the Favorites page). Deleted rows
 * are simply omitted.
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchClinicsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (clean.length === 0) return []
  return (await api(`/clinics${queryString({ ids: clean.join(',') })}`)) ?? []
}

/**
 * Fetch the veterinarian profile(s) linked to the signed-in account (the
 * veterinarian portal uses this to identify which clinic the vet belongs to).
 * The server reads the account from the token, so no id is sent.
 * @returns {Promise<Array>}
 */
export async function fetchMyVetProfiles() {
  return (await api('/veterinarians/me')) ?? []
}

/**
 * Fetch a single clinic by id, including its veterinarians.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchClinicById(id) {
  try {
    return await api(`/clinics/${id}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

/**
 * Convert an API error into a friendly message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getVetsErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }
  if (error.code === 'not-found') {
    return 'This entry is no longer available.'
  }
  if (error.code === 'forbidden') {
    return 'You do not have permission to perform that action.'
  }
  return fallback
}
