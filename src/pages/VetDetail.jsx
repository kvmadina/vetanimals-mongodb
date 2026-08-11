import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchVeterinarianById, getVetsErrorMessage } from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import {
  AlertIcon,
  CalendarIcon,
  ChevronRightIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

export default function VetDetail() {
  const { vetId } = useParams()
  const { user } = useAuth()
  const { isVetFavorite, toggleVetFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [vet, setVet] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready' | 'missing'
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const loadVet = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchVeterinarianById(vetId)
      if (!data) {
        setStatus('missing')
        return
      }
      setVet(data)
      setStatus('ready')
    } catch (err) {
      console.error('[VetDetail] Failed to load veterinarian:', err)
      setError(getVetsErrorMessage(err, "We couldn't load this profile. Please try again."))
      setStatus('error')
    }
  }, [vetId])

  useEffect(() => {
    loadVet()
  }, [loadVet])

  const handleToggleFavorite = () => {
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
        console.error('[VetDetail] Favorite error:', err)
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
        vetId: vet.id,
        vetName: vet.name,
        clinicId: vet.clinic_id,
      },
    })
  }

  const favorite = vet ? isVetFavorite(vet.id) : false

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/vets" className="font-medium text-slate-500 transition hover:text-emerald-700">
            Veterinarians
          </Link>
          {vet?.name && (
            <>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300" />
              <span className="line-clamp-1 text-slate-400">{vet.name}</span>
            </>
          )}
        </nav>

        {/* Loading */}
        {status === 'loading' && (
          <div className="mt-6 grid animate-pulse gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-200" />
              <div className="mx-auto mt-4 h-5 w-2/3 rounded bg-slate-200" />
              <div className="mx-auto mt-2 h-4 w-1/3 rounded bg-slate-100" />
            </div>
            <div className="space-y-4 pt-2">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              <div className="h-24 rounded bg-slate-100" />
              <div className="h-28 rounded bg-slate-100" />
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load this profile
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadVet} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Not found */}
        {status === 'missing' && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <StethoscopeIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              Veterinarian not found
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              This profile may have been removed or is no longer available.
            </p>
            <Link to="/vets" className="btn-primary mt-7">
              Back to veterinarians
            </Link>
          </div>
        )}

        {/* Profile */}
        {status === 'ready' && vet && (
          <div className="mt-6 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* Identity card */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
              <Avatar src={vet.avatar_url} name={vet.name} className="mx-auto h-24 w-24 text-3xl" />
              <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{vet.name}</h1>
              {vet.specialty && (
                <p className="mt-1.5 text-sm font-medium capitalize text-emerald-700">
                  {vet.specialty}
                </p>
              )}
              {vet.license_number && (
                <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  License {vet.license_number}
                </p>
              )}

              <div className="mt-6 flex justify-center gap-2">
                <FavoriteButton
                  isFavorite={favorite}
                  onToggle={handleToggleFavorite}
                  label="favorites"
                />
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  className="btn-primary h-10 flex-1"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Book appointment
                </button>
              </div>

              {actionError && (
                <div role="alert" className="form-banner--error mt-4 text-left">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
            </aside>

            {/* Details */}
            <div className="space-y-6">
              {vet.bio && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-base font-bold tracking-tight text-slate-900">About</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{vet.bio}</p>
                </section>
              )}

              {vet.clinics && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-base font-bold tracking-tight text-slate-900">
                    Practice at
                  </h2>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/clinics/${vet.clinics.id}`}
                        className="text-base font-semibold text-slate-900 transition hover:text-emerald-700"
                      >
                        {vet.clinics.name}
                      </Link>
                      {vet.clinics.address && (
                        <p className="mt-1.5 flex items-start gap-2 text-sm text-slate-600">
                          <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          {vet.clinics.address}
                        </p>
                      )}
                    </div>
                    <Link to={`/clinics/${vet.clinics.id}`} className="btn-secondary shrink-0 px-3 py-2 text-sm">
                      View clinic
                    </Link>
                  </div>

                  <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
                    {vet.clinics.phone && (
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <a
                          href={`tel:${vet.clinics.phone.replace(/[^+\d]/g, '')}`}
                          className="truncate transition hover:text-emerald-700"
                        >
                          {vet.clinics.phone}
                        </a>
                      </div>
                    )}
                    {vet.clinics.email && (
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <MailIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <a
                          href={`mailto:${vet.clinics.email}`}
                          className="truncate transition hover:text-emerald-700"
                        >
                          {vet.clinics.email}
                        </a>
                      </div>
                    )}
                    {vet.clinics.website && (
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <GlobeIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <a
                          href={vet.clinics.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate transition hover:text-emerald-700"
                        >
                          {vet.clinics.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </dl>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <button type="button" onClick={handleBookAppointment} className="btn-primary w-full sm:w-auto">
                      <CalendarIcon className="h-4 w-4" />
                      Book an appointment
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
