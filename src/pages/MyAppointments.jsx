import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  cancelAppointment,
  fetchAppointments,
  getAppointmentErrorMessage,
} from '../lib/appointments.js'
import AppHeader from '../components/AppHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  AlertIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
}

function StatusBadge({ status }) {
  const label = status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.cancelled}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

function formatDateTime(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

function AppointmentSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3.5 w-2/3 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

export default function MyAppointments() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [appointments, setAppointments] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [tab, setTab] = useState('upcoming')
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

  const loadAppointments = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    setError('')
    try {
      const data = await fetchAppointments(user.id)
      setAppointments(data)
      setStatus('ready')
    } catch (err) {
      console.error('[MyAppointments] Failed to load appointments:', err)
      setError(
        getAppointmentErrorMessage(err, "We couldn't load your appointments. Please try again."),
      )
      setStatus('error')
    }
  }, [user])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Group + sort client-side
  const { upcoming, past, cancelled } = useMemo(() => {
    const now = new Date()
    const up = []
    const pa = []
    const ca = []
    for (const appt of appointments) {
      const when = new Date(appt.appointment_date)
      if (appt.status === 'cancelled') {
        ca.push(appt)
      } else if (
        (appt.status === 'pending' || appt.status === 'confirmed') &&
        when >= now
      ) {
        up.push(appt)
      } else {
        pa.push(appt)
      }
    }
    const byDateAsc = (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)
    const byDateDesc = (a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)
    return {
      upcoming: up.sort(byDateAsc),
      past: pa.sort(byDateDesc),
      cancelled: ca.sort(byDateDesc),
    }
  }, [appointments])

  const counts = useMemo(
    () => ({ upcoming: upcoming.length, past: past.length, cancelled: cancelled.length }),
    [upcoming, past, cancelled],
  )

  const handleCancel = async (appt) => {
    setCancellingId(appt.id)
    setCancelError('')
    try {
      await cancelAppointment(user.id, appt.id)
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status: 'cancelled' } : a)),
      )
      showToast('Appointment cancelled')
    } catch (err) {
      console.error('[MyAppointments] Cancel failed:', err)
      // The database refused (e.g. it is no longer pending) — show the real error.
      setCancelError(
        getAppointmentErrorMessage(err, 'Could not cancel this appointment. Please try again.'),
      )
    } finally {
      setCancellingId(null)
    }
  }

  const activeList = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Appointments
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My appointments
            </h1>
            <p className="mt-2 text-slate-500">
              Track and manage your scheduled visits.
            </p>
          </div>
          <Link to="/appointments/new" className="btn-primary">
            <CalendarIcon className="h-4 w-4" />
            Book new
          </Link>
        </div>

        {/* Tabs */}
        <div
          className="mt-8 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
          role="tablist"
          aria-label="Appointment groups"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key)
                setCancelError('')
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                tab === t.key ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.label}
              {status === 'ready' && (
                <span
                  className={`ml-1.5 text-xs ${
                    tab === t.key ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {cancelError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((key) => (
              <AppointmentSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load your appointments
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadAppointments} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* List */}
        {status === 'ready' && (
          <div className="mt-6 space-y-4">
            {activeList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <CalendarIcon className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-base font-semibold text-slate-900">
                  No {tab} appointments
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  {tab === 'upcoming'
                    ? 'Book a visit with a trusted veterinarian for one of your pets.'
                    : tab === 'past'
                      ? 'Completed and past appointments will appear here.'
                      : 'Appointments you cancel will appear here.'}
                </p>
                {tab === 'upcoming' && (
                  <Link to="/appointments/new" className="btn-primary mt-6">
                    Book an appointment
                  </Link>
                )}
              </div>
            ) : (
              activeList.map((appt) => {
                const { date, time } = formatDateTime(appt.appointment_date)
                const cancellable =
                  appt.status === 'pending' &&
                  new Date(appt.appointment_date) >= new Date()
                return (
                  <article
                    key={appt.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          src={appt.pets?.avatar_url}
                          name={appt.pets?.name || 'Pet'}
                          className="h-11 w-11 text-base"
                        />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                            {appt.pets?.name || 'Pet'}
                            {appt.pets?.type && (
                              <span className="text-xs font-normal capitalize text-slate-400">
                                {appt.pets.type}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <StethoscopeIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="line-clamp-1">
                              {appt.veterinarians?.name || 'Veterinarian'}
                              {appt.veterinarians?.specialty
                                ? ` · ${appt.veterinarians.specialty}`
                                : ''}
                            </span>
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>

                    <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        {date}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        {time}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPinIcon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="line-clamp-1">
                          {appt.clinics?.name || 'Clinic'}
                        </span>
                      </div>
                    </dl>

                    {appt.notes && (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                        <span className="font-semibold text-slate-500">Notes: </span>
                        {appt.notes}
                      </p>
                    )}

                    {cancellable && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {cancellingId === appt.id ? (
                          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
                            <p className="text-sm font-medium text-red-700">
                              Cancel this appointment?
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCancel(appt)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                              Yes, cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancellingId(null)}
                              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                            >
                              Keep it
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCancellingId(appt.id)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-red-600"
                          >
                            Cancel appointment
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>
        )}

        {status === 'ready' && appointments.length > 0 && (
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <BuildingIcon className="h-3.5 w-3.5" />
            Pending appointments are shown until the clinic confirms them.
          </p>
        )}
      </main>
    </div>
  )
}
