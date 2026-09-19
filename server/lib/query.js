// ---------------------------------------------------------------------------
// Small query helpers shared by the read routes.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose'

/**
 * Build a case-insensitive "contains" regex from a user-typed search term.
 * Regex metacharacters are escaped so a search for "c++" cannot blow up, and
 * internal spaces become wildcards so "dog food" matches "Dog Dry Food".
 * @param {string} search
 * @returns {RegExp|null} null when there is nothing to search for
 */
export function searchRegex(search) {
  const term = String(search || '').trim()
  if (!term) return null
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(escaped.replace(/\s+/g, '.*'), 'i')
}

/**
 * Parse a comma-separated `ids` query param into valid ObjectIds.
 * Unparseable ids are dropped rather than throwing — a stale localStorage id
 * should show fewer results, not break the page.
 * @param {string|undefined} value
 * @returns {mongoose.Types.ObjectId[]}
 */
export function parseIds(value) {
  if (!value) return []
  return [...new Set(String(value).split(','))]
    .map((id) => id.trim())
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))
}

/** Clamp a `limit` query param, returning null when it is absent or invalid. */
export function parseLimit(value, max = 200) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(Math.round(n), max)
}
