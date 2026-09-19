import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import {
  distanceKm,
  fetchPetStores,
  getGeoErrorMessage,
  getUserLocation,
  hasValidCoords,
  searchPlace,
} from '../lib/geo.js'
import { fetchClinics, getVetsErrorMessage } from '../lib/vets.js'
import PlaceCard from './PlaceCard.jsx'
import {
  AlertIcon,
  BagIcon,
  BuildingIcon,
  MapPinIcon,
  NavigationIcon,
  SearchIcon,
} from './Icons.jsx'

// Leaflet is heavy (~150 KB) and only needed when the map actually renders,
// so it is loaded on demand to keep the rest of Home fast.
const NearbyMap = lazy(() => import('./NearbyMap.jsx'))

const RADII = [5, 10, 25]
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'clinics', label: 'Clinics' },
  { key: 'stores', label: 'Pet stores' },
]

function MapSkeleton() {
  return (
    <div className="flex h-72 animate-pulse items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 sm:h-96">
      <span className="flex items-center gap-2 text-sm text-slate-400">
        <MapPinIcon className="h-5 w-5" />
        Loading the map…
      </span>
    </div>
  )
}

export default function NearbySection() {
  // Location state: idle | locating | ready | denied | error | manual
  const [locationState, setLocationState] = useState('idle')
  const [coords, setCoords] = useState(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [locationError, setLocationError] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [searchingPlace, setSearchingPlace] = useState(false)

  const [clinics, setClinics] = useState([])
  const [clinicsStatus, setClinicsStatus] = useState('loading') // loading | ready | error
  const [clinicsError, setClinicsError] = useState('')

  const [stores, setStores] = useState([])
  const [storesStatus, setStoresStatus] = useState('idle') // idle | loading | ready | error
  const [storesError, setStoresError] = useState('')

  const [filter, setFilter] = useState('all')
  const [radiusKm, setRadiusKm] = useState(10)
  const [nearMe, setNearMe] = useState(true)

  // Clinics from the API (single fetch; the map/list reuse this data)
  useEffect(() => {
    let active = true
    fetchClinics()
      .then((rows) => {
        if (!active) return
        setClinics(rows)
        setClinicsStatus('ready')
      })
      .catch((err) => {
        console.error('[NearbySection] Failed to load clinics:', err)
        if (active) {
          setClinics([])
          setClinicsError(getVetsErrorMessage(err, 'We could not load nearby clinics.'))
          setClinicsStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Request browser location once (session-cached in lib/geo.js — never
  // re-prompts on remounts). Denial keeps the page fully usable.
  useEffect(() => {
    let active = true
    getUserLocation()
      .then((c) => {
        if (!active) return
        setCoords(c)
        setLocationLabel('Your location')
        setLocationState('ready')
        setNearMe(true)
      })
      .catch((err) => {
        if (!active) return
        setLocationError(getGeoErrorMessage(err))
        setLocationState(err.code === 'denied' ? 'denied' : 'error')
        setShowSearch(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Pet stores (real OSM data via Overpass) — fetched only once we know where
  // "here" is; refetched when the radius changes.
  useEffect(() => {
    if (!coords) return
    let active = true
    setStoresStatus('loading')
    setStoresError('')
    fetchPetStores({ lat: coords.lat, lng: coords.lng, radiusKm })
      .then((rows) => {
        if (!active) return
        setStores(rows)
        setStoresStatus('ready')
      })
      .catch((err) => {
        console.error('[NearbySection] Pet-store lookup failed:', err)
        if (active) {
          setStores([])
          setStoresError(getGeoErrorMessage(err, 'Pet-store data is unavailable right now.'))
          setStoresStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [coords, radiusKm])

  const handleUseMyLocation = useCallback(async () => {
    setLocationState('locating')
    setLocationError('')
    try {
      const c = await getUserLocation()
      setCoords(c)
      setLocationLabel('Your location')
      setLocationState('ready')
      setNearMe(true)
      setShowSearch(false)
    } catch (err) {
      setLocationError(getGeoErrorMessage(err))
      setLocationState(err.code === 'denied' ? 'denied' : 'error')
    }
  }, [])

  const handleSearchPlace = useCallback(
    async (e) => {
      e.preventDefault()
      const term = manualQuery.trim()
      if (searchingPlace || term.length < 3) return
      setSearchingPlace(true)
      setLocationError('')
      try {
        const result = await searchPlace(term)
        if (!result) {
          setLocationError('No location found for that search. Try a city or area name.')
          return
        }
        setCoords({ lat: result.lat, lng: result.lng })
        setLocationLabel(result.label)
        setLocationState('manual')
        setNearMe(true)
        setShowSearch(false)
        setManualQuery('')
      } catch (err) {
        setLocationError(getGeoErrorMessage(err, 'The location search failed. Please try again.'))
      } finally {
        setSearchingPlace(false)
      }
    },
    [manualQuery, searchingPlace],
  )

  const clinicsWithCoords = useMemo(
    () => clinics.filter((c) => hasValidCoords(c.latitude, c.longitude)),
    [clinics],
  )

  // Map center: user location → average of clinic coordinates → world view.
  const mapCenter = useMemo(() => {
    if (coords) return [coords.lat, coords.lng]
    if (clinicsWithCoords.length > 0) {
      const avgLat =
        clinicsWithCoords.reduce((sum, c) => sum + Number(c.latitude), 0) / clinicsWithCoords.length
      const avgLng =
        clinicsWithCoords.reduce((sum, c) => sum + Number(c.longitude), 0) / clinicsWithCoords.length
      return [avgLat, avgLng]
    }
    return [20, 0]
  }, [coords, clinicsWithCoords])

  const mapZoom = coords ? 12 : clinicsWithCoords.length > 0 ? 5 : 2

  const mapClinics = filter === 'stores' ? [] : clinicsWithCoords
  const mapStores = filter === 'clinics' ? [] : stores
  const hasAnyMarkers = mapClinics.length > 0 || mapStores.length > 0 || Boolean(coords)

  // "Near You" list (clinics always included in the list — even without
  // coordinates; stores only once location data exists).
  const places = useMemo(() => {
    const list = []
    if (filter === 'all' || filter === 'clinics') {
      for (const c of clinics) {
        const valid = hasValidCoords(c.latitude, c.longitude)
        list.push({
          id: c.id,
          name: c.name,
          type: 'clinic',
          address: c.address,
          phone: c.phone,
          website: c.website,
          hasCoords: valid,
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          distanceKm:
            coords && valid ? distanceKm(coords.lat, coords.lng, c.latitude, c.longitude) : null,
        })
      }
    }
    if (filter === 'all' || filter === 'stores') {
      for (const s of stores) {
        list.push({
          id: s.id,
          name: s.name,
          type: 'store',
          address: s.address,
          phone: s.phone,
          website: s.website,
          hasCoords: true,
          lat: s.lat,
          lng: s.lng,
          distanceKm: coords ? distanceKm(coords.lat, coords.lng, s.lat, s.lng) : null,
        })
      }
    }
    if (nearMe && coords) {
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [clinics, stores, filter, nearMe, coords])

  const showStoresSection = filter !== 'clinics'

  return (
    <section id="nearby" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Nearby pet care
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Find care close to home
        </h2>
        <p className="mt-3 text-slate-600">
          Veterinary clinics and pet stores near you — with real locations from
          our clinic directory and OpenStreetMap.
        </p>
      </div>

      {/* Location + filter controls */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Filters */}
          <div
            className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Filter map places"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                  filter === f.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Location pill + radius + near me */}
          <div className="flex flex-wrap items-center gap-2.5">
            {coords && (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{locationLabel || 'Your location'}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSearch((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              {coords ? 'Change location' : 'Search a place'}
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span>Radius</span>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                aria-label="Search radius"
                className="input-field h-8 rounded-lg px-2 py-0 text-xs"
              >
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <button
                type="button"
                role="switch"
                aria-checked={nearMe}
                onClick={() => setNearMe((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition ${
                  nearMe ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    nearMe ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
              Near me
            </label>
          </div>
        </div>

        {/* Location banner / manual search */}
        {(!coords || showSearch) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {locationState === 'denied'
                    ? 'Location access is turned off'
                    : locationState === 'error' || locationState === 'manual'
                      ? 'Search for a place'
                      : 'Allow location access to discover pet care near you.'}
                </p>
                {locationError ? (
                  <p className="mt-1 text-sm text-slate-500">{locationError}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    The map still works without it — search for a city or area
                    instead.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locationState === 'locating'}
                className="btn-secondary h-9 px-3 py-0"
              >
                {locationState === 'locating' ? (
                  <>
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                      aria-hidden="true"
                    />
                    Locating…
                  </>
                ) : (
                  <>
                    <NavigationIcon className="h-4 w-4" />
                    Use my location
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSearchPlace} className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="City, neighbourhood or area…"
                  aria-label="Search for a place"
                  className="input-field pl-9"
                />
              </div>
              <button
                type="submit"
                disabled={searchingPlace || manualQuery.trim().length < 3}
                className="btn-primary h-9 px-4 py-0"
              >
                {searchingPlace ? 'Searching…' : 'Search'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="mt-4">
        {clinicsStatus === 'loading' ? (
          <MapSkeleton />
        ) : clinicsStatus === 'error' && filter !== 'stores' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <p className="mx-auto mt-3 max-w-md text-sm text-red-700">{clinicsError}</p>
          </div>
        ) : !hasAnyMarkers ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BuildingIcon className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-slate-900">
              {filter === 'stores' ? 'No pet stores on the map yet' : 'No locations on the map yet'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {filter === 'stores'
                ? 'Share your location or search for a place to find pet stores nearby.'
                : 'We don\'t have location data for clinics near here yet. Allow location access to also search for pet stores.'}
            </p>
          </div>
        ) : (
          <Suspense fallback={<MapSkeleton />}>
            <NearbyMap
              clinics={mapClinics}
              stores={mapStores}
              userCoords={coords}
              center={mapCenter}
              zoom={mapZoom}
            />
          </Suspense>
        )}

        {/* Nothing in range note */}
        {hasAnyMarkers &&
          mapClinics.length === 0 &&
          mapStores.length === 0 &&
          coords && (
            <p className="mt-3 text-sm text-slate-500">
              Nothing nearby in this radius yet — try a wider radius or search
              for a different place.
            </p>
          )}

        {/* Legend */}
        {hasAnyMarkers && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Veterinary clinic
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" aria-hidden="true" />
              Pet store
            </span>
            {coords && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                You
              </span>
            )}
          </div>
        )}
      </div>

      {/* Near You list */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Near you</h3>
            <p className="mt-1 text-sm text-slate-500">
              {coords
                ? `Showing places within ${radiusKm} km${nearMe ? ', closest first' : ''}.`
                : 'Showing the full directory until you share a location.'}
            </p>
          </div>
          {places.length > 0 && (
            <p className="text-sm text-slate-500">
              {places.length} {places.length === 1 ? 'place' : 'places'}
            </p>
          )}
        </div>

        {clinicsStatus === 'loading' ? (
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : places.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500">
            {showStoresSection && storesStatus === 'error' ? (
              <span className="inline-flex items-center gap-2">
                <AlertIcon className="h-4 w-4 shrink-0 text-amber-500" />
                {storesError}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <BagIcon className="h-4 w-4 shrink-0 text-slate-400" />
                No {filter === 'stores' ? 'pet stores' : 'places'} to show here
                {coords ? ' yet — try a wider radius.' : '. Share a location to find nearby places.'}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
