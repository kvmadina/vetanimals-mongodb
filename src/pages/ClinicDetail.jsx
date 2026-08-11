import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchClinicById, getVetsErrorMessage } from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
// Leaflet is heavy (~150 KB) and only used on this page, so it is loaded
// on demand instead of bloating the main bundle.
const ClinicMap = lazy(() => import('../components/ClinicMap.jsx'))
import FavoriteButton from '../components/FavoriteButton.jsx'
import VetCard from '../components/VetCard.jsx'
import {
  AlertIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  NavigationIcon,
  PhoneIcon,
} from '../components/Icons.jsx'

export default function ClinicDetail() {
  const { clinicId } = useParams()
  const { user } = useAuth()
  const { isClinicFavorite, toggleClinicFavorite, isVetFavorite, toggleVetFavorite } =
    useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [clinic, setClinic] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready' | 'missing'
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const loadClinic = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchClinicById(clinicId)
      if (!data) {
        setStatus('missing')
        return
      }
      setClinic(data)
      setStatus('ready')
    } catch (err) {
      console.error('[ClinicDetail] Failed to load clinic:', err)
      setError(getVetsErrorMessage(err, "We couldn't load this clinic. Please try again."))
      setStatus('error')
    }
  }, [clinicId])

  useEffect(() => {
    loadClinic()
  }, [loadClinic])

  const handleToggleFavorite = () => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          notice: 'Sign in to save clinics to your favorites.',
        },
      })
      return
    }
    const wasFavorite = isClinicFavorite(clinic.id)
    toggleClinicFavorite(clinic.id)
      .then(() => {
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[ClinicDetail] Favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleToggleVetFavorite = (vet) => {
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
        console.error('[ClinicDetail] Favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleBookAppointment = () => {
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          notice: 'Sign in to book an appointment.',
        },
      })
      return
    }
    navigate('/appointments/new', {
      state: {
        clinicId: clinic.id,
        clinicName: clinic.name,
      },
    })
  }

  const favorite = clinic ? isClinicFavorite(clinic.id) : false
  const vets = clinic?.veterinarians ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/clinics" className="font-medium text-slate-500 transition hover:text-emerald-700">
            Clinics
          </Link>
          {clinic?.name && (
            <>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300" />
              <span className="line-clamp-1 text-slate-400">{clinic.name}</span>
            </>
          )}
        </nav>

        {/* Loading */}
        {status === 'loading' && (
          <div className="mt-6 grid animate-pulse gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              <div className="h-8 w-2/3 rounded bg-slate-200" />
              <div className="h-28 rounded bg-slate-100" />
              <div className="h-64 rounded-2xl bg-slate-200" />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-40 rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load this clinic
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadClinic} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Not found */}
        {status === 'missing' && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BuildingIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              Clinic not found
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              This clinic may have been removed or is no longer available.
            </p>
            <Link to="/clinics" className="btn-primary mt-7">
              Back to clinics
            </Link>
          </div>
        )}

        {/* Clinic */}
        {status === 'ready' && clinic && (
          <>
            {/* Header */}
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BuildingIcon className="h-6 w-6" />
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {clinic.name}
                  </h1>
                </div>
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {clinic.address}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <FavoriteButton isFavorite={favorite} onToggle={handleToggleFavorite} label="favorites" />
                <button type="button" onClick={handleBookAppointment} className="btn-primary">
                  <CalendarIcon className="h-4 w-4" />
                  Book appointment
                </button>
              </div>
            </div>

            {actionError && (
              <div role="alert" className="form-banner--error mt-5">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Contact + map */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Contact &amp; location
                </h2>
                <dl className="mt-4 space-y-3.5 text-sm">
                  {clinic.phone && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`tel:${clinic.phone.replace(/[^+\d]/g, '')}`}
                        className="truncate transition hover:text-emerald-700"
                      >
                        {clinic.phone}
                      </a>
                    </div>
                  )}
                  {clinic.email && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <MailIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`mailto:${clinic.email}`}
                        className="truncate transition hover:text-emerald-700"
                      >
                        {clinic.email}
                      </a>
                    </div>
                  )}
                  {clinic.website && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <GlobeIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={clinic.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate transition hover:text-emerald-700"
                      >
                        {clinic.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {clinic.latitude != null && clinic.longitude != null && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-slate-400">
                        Coordinates: {Number(clinic.latitude).toFixed(4)},{' '}
                        {Number(clinic.longitude).toFixed(4)}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${clinic.latitude},${clinic.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
                      >
                        <NavigationIcon className="h-3.5 w-3.5" />
                        Get directions
                      </a>
                    </div>
                  )}
                </dl>
              </section>

              <Suspense
                fallback={
                  <div className="h-64 animate-pulse rounded-2xl bg-slate-200 sm:h-80" />
                }
              >
                <ClinicMap clinic={clinic} />
              </Suspense>
            </div>

            {/* Team */}
            <section className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Veterinarians at {clinic.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Meet the team practicing at this clinic.
                  </p>
                </div>
                <Link
                  to={`/vets?clinic=${clinic.id}`}
                  className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                >
                  View all veterinarians
                </Link>
              </div>

              {vets.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No veterinarians listed at this clinic yet
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    The team profiles will appear here once they&apos;re added.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {vets.map((vet) => (
                    <VetCard
                      key={vet.id}
                      vet={{ ...vet, clinics: { id: clinic.id, name: clinic.name } }}
                      isFavorite={isVetFavorite(vet.id)}
                      onToggleFavorite={handleToggleVetFavorite}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
