import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  fetchClinics,
  fetchSpecialties,
  fetchVeterinarians,
  getVetsErrorMessage,
} from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
import VetCard from '../components/VetCard.jsx'
import {
  AlertIcon,
  ChevronDownIcon,
  SearchIcon,
  StethoscopeIcon,
  XIcon,
} from '../components/Icons.jsx'

function VetCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 p-5">
        <div className="h-14 w-14 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3.5 w-1/3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2 px-5 pb-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
      <div className="p-4">
        <div className="h-9 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

export default function Vets() {
  const { user } = useAuth()
  const { isVetFavorite, toggleVetFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [vets, setVets] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [clinics, setClinics] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [filtersError, setFiltersError] = useState('')

  const [searchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [clinicId, setClinicId] = useState(searchParams.get('clinic') || '')

  // Debounce the search box before hitting Supabase
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadVets = useCallback(async () => {
    // Keep the current grid visible while refetching (no jarring skeleton
    // flash on every search/filter change).
    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'))
    setError('')
    try {
      const data = await fetchVeterinarians({ search: query, specialty, clinicId })
      setVets(data)
      setStatus('ready')
    } catch (err) {
      console.error('[Vets] Failed to load veterinarians:', err)
      setError(getVetsErrorMessage(err, "We couldn't load the veterinarians. Please try again."))
      setStatus('error')
    }
  }, [query, specialty, clinicId])

  useEffect(() => {
    loadVets()
  }, [loadVets])

  // Fetch filter options once
  useEffect(() => {
    let active = true
    setFiltersError('')
    Promise.all([fetchSpecialties(), fetchClinics()])
      .then(([specs, clins]) => {
        if (!active) return
        setSpecialties(specs)
        setClinics(clins)
      })
      .catch((err) => {
        console.error('[Vets] Failed to load filter options:', err)
        if (active) {
          setFiltersError("Couldn't load the filter options. Refreshing the page may help.")
        }
      })
    return () => {
      active = false
    }
  }, [])

  const activeFilters = useMemo(() => {
    const list = []
    if (query) {
      list.push({
        key: 'search',
        label: `“${query}”`,
        clear: () => {
          setSearchInput('')
          setQuery('')
        },
      })
    }
    if (specialty) {
      list.push({
        key: 'specialty',
        label: specialty.charAt(0).toUpperCase() + specialty.slice(1),
        clear: () => setSpecialty(''),
      })
    }
    if (clinicId) {
      const clinic = clinics.find((c) => c.id === clinicId)
      list.push({
        key: 'clinic',
        label: clinic?.name || 'Clinic',
        clear: () => setClinicId(''),
      })
    }
    return list
  }, [query, specialty, clinicId, clinics])

  const clearFilters = () => {
    setSearchInput('')
    setQuery('')
    setSpecialty('')
    setClinicId('')
  }

  // Keep the clinic filter in sync with a `?clinic=` URL param (e.g. linked
  // from a clinic detail page).
  useEffect(() => {
    const param = searchParams.get('clinic')
    if (param) setClinicId(param)
  }, [searchParams])

  const handleToggleFavorite = (vet) => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          notice: 'Sign in to save veterinarians to your favorites.',
        },
      })
      return
    }
    const wasFavorite = isVetFavorite(vet.id)
    toggleVetFavorite(vet.id)
      .then(() => {
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Vets] Favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const resultCount = useMemo(
    () => (status === 'ready' || status === 'refreshing' ? vets.length : null),
    [status, vets.length],
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Veterinarians
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Find the right vet for your pet
            </h1>
            <p className="mt-2 max-w-xl text-slate-500">
              Browse licensed veterinarians and the clinics they practice at.
            </p>
          </div>
        </div>

        {filtersError && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{filtersError}</span>
            <button
              type="button"
              onClick={() => setFiltersError('')}
              aria-label="Dismiss"
              className="ml-auto rounded-md p-1 text-amber-400 transition hover:text-amber-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              aria-label="Dismiss"
              className="ml-auto rounded-md p-1 text-red-400 transition hover:text-red-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or specialty…"
                aria-label="Search veterinarians"
                className="input-field pl-10 pr-10"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setQuery('')
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Specialty filter */}
            <div className="relative md:w-56">
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                aria-label="Filter by specialty"
                className="input-field appearance-none pr-10"
              >
                <option value="">All specialties</option>
                {specialties.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Clinic filter */}
            <div className="relative md:w-56">
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                aria-label="Filter by clinic"
                className="input-field appearance-none pr-10"
              >
                <option value="">All clinics</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {resultCount !== null && (
              <p className="flex items-center gap-2 text-sm text-slate-500 md:justify-end">
                {status === 'refreshing' && (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
                    aria-hidden="true"
                  />
                )}
                {resultCount} {resultCount === 1 ? 'veterinarian' : 'veterinarians'}
              </p>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Filters
              </span>
              {activeFilters.map((filter) => (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-medium text-emerald-800"
                >
                  {filter.label}
                  <button
                    type="button"
                    onClick={filter.clear}
                    aria-label={`Clear filter ${filter.label}`}
                    className="rounded-full p-0.5 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Error state */}
        {status === 'error' && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load the veterinarians
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadVets} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {status === 'loading' && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <VetCardSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Empty / no-results state */}
        {(status === 'ready' || status === 'refreshing') && vets.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <StethoscopeIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              {activeFilters.length > 0
                ? 'No veterinarians match your filters'
                : 'The directory is getting ready'}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {activeFilters.length > 0
                ? 'Try different keywords or clear the filters to see more veterinarians.'
                : 'Veterinarian profiles are on their way. Check back soon.'}
            </p>
            {activeFilters.length > 0 && (
              <button type="button" onClick={clearFilters} className="btn-primary mt-7">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {vets.length > 0 && (status === 'ready' || status === 'refreshing') && (
          <div
            className={`mt-8 grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
              status === 'refreshing' ? 'opacity-60' : ''
            }`}
          >
            {vets.map((vet) => (
              <VetCard
                key={vet.id}
                vet={vet}
                isFavorite={isVetFavorite(vet.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
