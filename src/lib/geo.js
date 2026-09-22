// ---------------------------------------------------------------------------
// Location helpers for the Home "Nearby Pet Care" experience.
//
// - Browser geolocation is requested at most once per session (result cached
//   in sessionStorage so re-mounts never re-prompt).
// - Clinic data always comes from /api/clinics (coordinates from the stored
//   latitude/longitude fields — never invented).
// - Pet stores come from OpenStreetMap via the public Overpass API (real
//   external location data; shop=pet nodes/ways near a point). When the API
//   is unreachable we fail gracefully.
// - Manual place search uses the OSM Nominatim geocoder (no API key).
// ---------------------------------------------------------------------------

const GEO_CACHE_KEY = 'vetanimals:geo-cache'
const GEO_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

/** True when the value is a finite, non-zero coordinate pair. */
export function hasValidCoords(lat, lng) {
  const nLat = Number(lat)
  const nLng = Number(lng)
  return Number.isFinite(nLat) && Number.isFinite(nLng) && (nLat !== 0 || nLng !== 0)
}

/** Great-circle distance between two points in kilometres (haversine). */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(Number(lat2) - Number(lat1))
  const dLng = toRad(Number(lng2) - Number(lng1))
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(lat1))) * Math.cos(toRad(Number(lat2))) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Format a distance for display. */
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return null
  return km < 10 ? `${km.toFixed(1)} km away` : `${Math.round(km)} km away`
}

function readGeoCache() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null
    if (Date.now() - parsed.at > GEO_CACHE_TTL_MS) return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

function writeGeoCache(lat, lng) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      GEO_CACHE_KEY,
      JSON.stringify({ lat, lng, at: Date.now() }),
    )
  } catch {
    // Storage unavailable — location simply isn't cached.
  }
}

/**
 * Resolve the user's location: session cache first, then a single browser
 * geolocation request. Rejects with { code: 'denied' | 'unavailable' | ... }.
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export function getUserLocation() {
  const cached = readGeoCache()
  if (cached) return Promise.resolve(cached)

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const err = new Error('Geolocation is not supported by this browser.')
    err.code = 'unsupported'
    return Promise.reject(err)
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude }
        writeGeoCache(coords.lat, coords.lng)
        resolve(coords)
      },
      (err) => {
        const error = new Error(err.message || 'Could not determine your location.')
        error.code = err.code === 1 ? 'denied' : err.code === 2 ? 'unavailable' : 'error'
        reject(error)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  })
}

/**
 * Fetch pet stores near a point from OpenStreetMap's Overpass API.
 * Real external location data (shop=pet) — never hardcoded. Fails cleanly
 * with an empty result when the API is unavailable.
 * @param {{ lat: number, lng: number, radiusKm: number }} input
 * @returns {Promise<Array>}
 */
export async function fetchPetStores({ lat, lng, radiusKm = 10 }) {
  const radiusM = Math.round(Number(radiusKm) * 1000)
  const query = `[out:json][timeout:10];(node["shop"="pet"](around:${radiusM},${lat},${lng});way["shop"="pet"](around:${radiusM},${lat},${lng}););out center tags;`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`)
    const json = await res.json()
    const elements = Array.isArray(json?.elements) ? json.elements : []

    return elements
      .map((el) => {
        const t = el.tags || {}
        const elLat = el.type === 'way' ? el.center?.lat : el.lat
        const elLng = el.type === 'way' ? el.center?.lon : el.lon
        if (!hasValidCoords(elLat, elLng)) return null
        const address = [
          t['addr:housenumber'],
          t['addr:street'],
          t['addr:city'],
          t['addr:postcode'],
        ]
          .filter(Boolean)
          .join(', ')
        return {
          id: `osm-${el.type}-${el.id}`,
          name: t.name || 'Pet store',
          address: address || t['addr:full'] || '',
          phone: t.phone || t['contact:phone'] || '',
          website: t.website || t['contact:website'] || '',
          lat: Number(elLat),
          lng: Number(elLng),
        }
      })
      .filter(Boolean)
      .slice(0, 30)
  } catch (err) {
    if (err?.name === 'AbortError') {
      const abortError = new Error('The pet-store lookup timed out.')
      abortError.code = 'timeout'
      throw abortError
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Geocode a free-text place with OpenStreetMap's Nominatim service.
 * @param {string} query
 * @returns {Promise<{ lat: number, lng: number, label: string } | null>}
 */
export async function searchPlace(query) {
  const term = String(query || '').trim()
  if (term.length < 3) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const url = `${NOMINATIM_ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(term)}`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`)
    const results = await res.json()
    const hit = Array.isArray(results) ? results[0] : null
    if (!hit) return null
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name || term,
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      const abortError = new Error('The location search timed out.')
      abortError.code = 'timeout'
      throw abortError
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Friendly message for a geolocation failure. */
export function getGeoErrorMessage(err, fallback = 'Could not determine your location.') {
  if (!err) return ''
  const code = String(err.code || '')
  if (code === 'denied') {
    return 'Location access was denied. You can still browse clinics or search for a place below.'
  }
  if (code === 'unavailable') {
    return 'Your location is currently unavailable. You can search for a place below instead.'
  }
  if (code === 'unsupported') {
    return 'This browser does not support location access. You can search for a place below instead.'
  }
  if (code === 'timeout') {
    return 'The location lookup timed out. Please try again.'
  }
  if (/network|failed to fetch|fetch failed|load failed/i.test(String(err.message || ''))) {
    return 'Unable to reach the location service. Please check your internet connection.'
  }
  return fallback
}
