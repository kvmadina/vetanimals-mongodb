// ---------------------------------------------------------------------------
// The single place the frontend talks to the VetAnimals API.
//
// Vite proxies /api to the Express server (see vite.config.js), so requests
// stay same-origin. The login token lives in localStorage and is attached to
// every request; public endpoints simply ignore it.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'vetanimals:token'

/** @returns {string|null} the stored login token, or null when signed out. */
export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    // Private mode / storage disabled — treat it as signed out.
    return null
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to do — the session just will not survive a reload.
  }
}

export function clearToken() {
  setToken(null)
}

/**
 * Error thrown for any non-2xx response.
 * `code` is the server's stable error code; the getXErrorMessage() helpers in
 * the other lib modules branch on it to pick a user-facing message.
 */
export class ApiError extends Error {
  constructor(message, { code, status, problems } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.problems = problems
  }
}

/**
 * Make a request to the API.
 * @param {string} path Path under /api, e.g. '/products?limit=4'
 * @param {{ method?: string, body?: unknown }} options
 * @returns {Promise<any>} the parsed JSON body (null for 204 responses)
 */
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  } catch {
    // fetch only rejects when the request never reached the server.
    throw new ApiError(
      'Unable to reach the server. Please check your internet connection and try again.',
      { code: 'network' },
    )
  }

  if (response.status === 204) return null

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // An empty or non-JSON body is fine for a success; for a failure the
    // status code below still produces a sensible error.
  }

  if (!response.ok) {
    // An expired or rejected token means the stored session is dead — drop it
    // so the app stops sending it and shows the signed-out UI.
    if (response.status === 401) clearToken()

    throw new ApiError(payload?.error || `Request failed (${response.status})`, {
      code: payload?.code,
      status: response.status,
      problems: payload?.problems,
    })
  }

  return payload
}

/** Build a query string from defined, non-empty values. */
export function queryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const result = search.toString()
  return result ? `?${result}` : ''
}

/**
 * Shared "is this a connection problem?" check used by the friendly-message
 * helpers, so a dropped network never shows a generic fallback.
 */
export function isNetworkError(error) {
  if (!error) return false
  if (error.code === 'network') return true
  return /network|failed to fetch|fetch failed|load failed/i.test(String(error.message || ''))
}
