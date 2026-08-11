// ---------------------------------------------------------------------------
// Shop data layer.
// Reads real data from public.products and public.categories through the
// shared Supabase client. RLS limits public reads to active products only
// (is_active = true); we also filter explicitly for safety.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const PRODUCT_SELECT = `
  id,
  created_at,
  name,
  description,
  price,
  image_url,
  stock,
  is_active,
  species,
  category_id,
  categories ( id, name, slug )
`

const RECENT_STORAGE_KEY = 'vetanimals:recent-products'

/** Strip PostgREST-special characters from a search term. */
function sanitizeSearchTerm(search) {
  return search
    .replace(/[(),%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  if (species) {
    query = query.eq('species', species)
  }
  if (availability === 'in-stock') {
    query = query.gt('stock', 0)
  } else if (availability === 'low-stock') {
    query = query.gt('stock', 0).lte('stock', 5)
  } else if (availability === 'out-of-stock') {
    query = query.eq('stock', 0)
  }
  if (priceRange === 'under-25') {
    query = query.lt('price', 25)
  } else if (priceRange === '25-50') {
    query = query.gte('price', 25).lte('price', 50)
  } else if (priceRange === 'over-50') {
    query = query.gt('price', 50)
  }

  const term = sanitizeSearchTerm(search)
  if (term) {
    // Internal spaces become wildcards so multi-word queries match across
    // word boundaries ("dog food" → %dog%food%). Note: PostgREST's `or()`
    // does not support embedded filters (categories.name), so category
    // search is handled by the category filter instead.
    const q = `%${term.replace(/\s+/g, '%')}%`
    query = query.or(`name.ilike.${q},description.ilike.${q},species.ilike.${q}`)
  }

  if (sort === 'price-asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price-desc') {
    query = query.order('price', { ascending: false })
  } else if (sort === 'name-asc') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    query = query.limit(Math.round(Number(limit)))
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Fetch all categories (used by the category filter).
 * @returns {Promise<Array>}
 */
export async function fetchCategories() {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Fetch the distinct species values present on active products.
 * @returns {Promise<string[]>}
 */
export async function fetchSpecies() {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('products')
    .select('species')
    .eq('is_active', true)
    .not('species', 'is', null)
  if (error) throw error
  const values = [...new Set((data ?? []).map((row) => row.species).filter(Boolean))]
  return values.sort((a, b) => a.localeCompare(b))
}

/**
 * Fetch a single active product by id.
 * @param {string} id
 * @returns {Promise<object|null>} null when not found or inactive
 */
export async function fetchProductById(id) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Related products: same category OR same species, excluding the current one.
 * @param {object} product
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchRelatedProducts(product, limit = 4) {
  if (!supabase || !product?.id) return []
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(limit)

  const orParts = []
  if (product.category_id) orParts.push(`category_id.eq.${product.category_id}`)
  if (product.species) orParts.push(`species.eq.${product.species}`)
  if (orParts.length > 0) {
    query = query.or(orParts.join(','))
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Fetch active products by a list of ids (used for "recently viewed").
 * @param {string[]} ids
 * @returns {Promise<Array>}
 */
export async function fetchProductsByIds(ids) {
  const clean = [...new Set(ids)].filter(Boolean)
  if (!supabase || clean.length === 0) return []
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('id', clean)
    .eq('is_active', true)
  if (error) throw error
  return data ?? []
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
 * Convert a raw Supabase error into a friendly shop message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getShopErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  const code = String(error.code || '')
  if (code === 'PGRST116') {
    return 'This product is no longer available.'
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
