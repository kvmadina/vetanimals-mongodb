// ---------------------------------------------------------------------------
// Shop data layer.
// Reads the catalogue from /api/products and /api/categories. The API only
// ever returns active products, so nothing here has to filter for that.
// ---------------------------------------------------------------------------
import { api, isNetworkError, queryString } from './api.js'

const RECENT_STORAGE_KEY = 'vetanimals:recent-products'

/**
 * Fetch active products with optional filters.
 * @param {{
 *   categoryId?: string|null,
 *   species?: string|null,
 *   search?: string,
 *   sort?: 'newest'|'price-asc'|'price-desc'|'name-asc',
 *   availability?: ''|'in-stock'|'low-stock'|'out-of-stock',
 *   priceRange?: ''|'under-25'|'25-50'|'over-50',
 *   limit?: number,
 * }} options
 * @returns {Promise<Array>}
 */
export async function fetchProducts({
  categoryId = null,
  species = null,
  search = '',
  sort = 'newest',
  availability = '',
  priceRange = '',
  limit = null,
} = {}) {
  const query = queryString({ categoryId, species, search, sort, availability, priceRange, limit })
  return (await api(`/products${query}`)) ?? []
}

/**
 * Fetch all categories (used by the category filter).
 * @returns {Promise<Array>}
 */
export async function fetchCategories() {
  return (await api('/categories')) ?? []
}

/**
 * Fetch the distinct species values present on active products.
 * @returns {Promise<string[]>}
 */
export async function fetchSpecies() {
  return (await api('/products/species')) ?? []
}

/**
 * Fetch a single active product by id.
 * @param {string} id
 * @returns {Promise<object|null>} null when not found or inactive
 */
export async function fetchProductById(id) {
  try {
    return await api(`/products/${id}`)
  } catch (error) {
    // A missing product is an empty state for the page, not a failure.
    if (error.status === 404) return null
    throw error
  }
}

/**
 * Related products: same category OR same species, excluding the current one.
 * @param {object} product
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchRelatedProducts(product, limit = 4) {
  if (!product?.id) return []
  return (await api(`/products/${product.id}/related${queryString({ limit })}`)) ?? []
}

/**
 * Fetch active products by a list of ids (used for "recently viewed").
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchProductsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (clean.length === 0) return []
  return (await api(`/products${queryString({ ids: clean.join(',') })}`)) ?? []
}

// ---------------------------------------------------------------------------
// Recently viewed (client-side browsing history — not a data source for
// products, only a navigation aid).
// ---------------------------------------------------------------------------
export function getRecentProductIds() {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function addRecentProductId(id) {
  if (!id) return
  try {
    const next = [id, ...getRecentProductIds().filter((existing) => existing !== id)].slice(0, 8)
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — browsing history is non-essential
  }
}

/** Format a numeric price as a currency string. */
export function formatPrice(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Convert an API error into a friendly shop message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getShopErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }
  if (error.code === 'not-found') {
    return 'This product is no longer available.'
  }
  if (error.code === 'forbidden') {
    return 'You do not have permission to perform that action.'
  }
  return fallback
}
