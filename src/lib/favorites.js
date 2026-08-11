// ---------------------------------------------------------------------------
// Favorites data layer.
// Backed by the real public.favorites table. RLS ("Users can manage their own
// favorites") guarantees users only ever touch their own rows. Never stored
// in localStorage.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

/**
 * Fetch the product ids the given user has favorited.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteProductIds(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId)
    .not('product_id', 'is', null)
  if (error) throw error
  return (data ?? []).map((row) => row.product_id).filter(Boolean)
}

/**
 * Add a product to the user's favorites.
 * @param {string} userId
 * @param {string} productId
 */
export async function addFavorite(userId, productId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, product_id: productId })
  if (error) throw error
}

/**
 * Remove a product from the user's favorites.
 * @param {string} userId
 * @param {string} productId
 */
export async function removeFavorite(userId, productId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Veterinarian favorites (public.favorites.veterinarian_id)
// ---------------------------------------------------------------------------

/**
 * Fetch the veterinarian ids the given user has favorited.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteVetIds(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('favorites')
    .select('veterinarian_id')
    .eq('user_id', userId)
    .not('veterinarian_id', 'is', null)
  if (error) throw error
  return (data ?? []).map((row) => row.veterinarian_id).filter(Boolean)
}

/**
 * Add a veterinarian to the user's favorites. The partial unique index
 * favorites_user_vet_idx prevents duplicates at the database level — a
 * 23505 violation is treated as success (it's already favorited).
 * @param {string} userId
 * @param {string} vetId
 */
export async function addVetFavorite(userId, vetId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, veterinarian_id: vetId })
  if (error && error.code !== '23505') throw error
}

/**
 * Remove a veterinarian from the user's favorites.
 * @param {string} userId
 * @param {string} vetId
 */
export async function removeVetFavorite(userId, vetId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('veterinarian_id', vetId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Clinic favorites (public.favorites.clinic_id)
// ---------------------------------------------------------------------------

/**
 * Fetch the clinic ids the given user has favorited.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchFavoriteClinicIds(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('favorites')
    .select('clinic_id')
    .eq('user_id', userId)
    .not('clinic_id', 'is', null)
  if (error) throw error
  return (data ?? []).map((row) => row.clinic_id).filter(Boolean)
}

/**
 * Add a clinic to the user's favorites. Duplicates are prevented by the
 * favorites_user_clinic_idx partial unique index (23505 treated as success).
 * @param {string} userId
 * @param {string} clinicId
 */
export async function addClinicFavorite(userId, clinicId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, clinic_id: clinicId })
  if (error && error.code !== '23505') throw error
}

/**
 * Remove a clinic from the user's favorites.
 * @param {string} userId
 * @param {string} clinicId
 */
export async function removeClinicFavorite(userId, clinicId) {
  if (!supabase || !userId) throw authRequiredError()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('clinic_id', clinicId)
  if (error) throw error
}

function authRequiredError() {
  const err = new Error('Sign in required')
  err.code = 'auth-required'
  return err
}
