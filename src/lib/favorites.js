// ---------------------------------------------------------------------------
// Favorites data layer.
// Backed by /api/favorites, which is always scoped to the signed-in account.
// Never stored in localStorage.
// ---------------------------------------------------------------------------
import { api } from './api.js'

/** Saving something twice must succeed quietly — the server upserts. */
async function addFavoriteOfType(type, id) {
  await api(`/favorites/${type}/${id}`, { method: 'POST' })
}

/** Removing something that is already gone is not an error for the UI. */
async function removeFavoriteOfType(type, id) {
  try {
    await api(`/favorites/${type}/${id}`, { method: 'DELETE' })
  } catch (error) {
    if (error.status !== 404) throw error
  }
}

// --- Products ---------------------------------------------------------------

/**
 * Fetch the product ids the current user has favorited.
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteProductIds() {
  return (await api('/favorites/products')) ?? []
}

export async function addFavorite(productId) {
  return addFavoriteOfType('products', productId)
}

export async function removeFavorite(productId) {
  return removeFavoriteOfType('products', productId)
}

// --- Veterinarians ----------------------------------------------------------

/**
 * Fetch the veterinarian ids the current user has favorited.
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteVetIds() {
  return (await api('/favorites/veterinarians')) ?? []
}

export async function addVetFavorite(vetId) {
  return addFavoriteOfType('veterinarians', vetId)
}

export async function removeVetFavorite(vetId) {
  return removeFavoriteOfType('veterinarians', vetId)
}

// --- Clinics ----------------------------------------------------------------

/**
 * Fetch the clinic ids the current user has favorited.
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteClinicIds() {
  return (await api('/favorites/clinics')) ?? []
}

export async function addClinicFavorite(clinicId) {
  return addFavoriteOfType('clinics', clinicId)
}

export async function removeClinicFavorite(clinicId) {
  return removeFavoriteOfType('clinics', clinicId)
}
