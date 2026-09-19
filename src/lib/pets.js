// ---------------------------------------------------------------------------
// Pets data layer.
// Every /api/pets route is scoped to the signed-in owner on the server, so
// none of these functions pass an owner id — the token decides whose pets
// these are, and another user's pet simply reads as "not found".
// ---------------------------------------------------------------------------
import { api, isNetworkError } from './api.js'

/**
 * Fetch all pets owned by the current user.
 * @returns {Promise<Array>}
 */
export async function fetchPets() {
  return (await api('/pets')) ?? []
}

/**
 * Create a pet for the current user.
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createPet(input) {
  return api('/pets', { method: 'POST', body: input })
}

/**
 * Update one of the current user's pets.
 * @param {string} id
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function updatePet(id, input) {
  return api(`/pets/${id}`, { method: 'PATCH', body: input })
}

/**
 * Delete one of the current user's pets.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePet(id) {
  await api(`/pets/${id}`, { method: 'DELETE' })
}

/**
 * Convert an API error into a friendly message for pet operations.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getPetErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }
  // Schema validation carries its own field-level message — show it, since it
  // names exactly what the form got wrong.
  if (error.code === 'validation') {
    return error.message || 'One of the values is not valid. Please check the form and try again.'
  }
  if (error.code === 'invalid-id') {
    return 'One of the values is not valid. Please check the form and try again.'
  }
  if (error.code === 'not-found') {
    return 'This pet no longer exists. It may have been removed.'
  }
  if (error.code === 'forbidden' || error.code === 'auth-required') {
    return 'You do not have permission to perform that action.'
  }
  return fallback
}
