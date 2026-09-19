import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  fetchVetAppointments,
  getAppointmentErrorMessage,
  updateVetAppointment,
} from '../lib/appointments.js'
import { fetchMyVetProfiles } from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  AlertIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  MapPinIcon,
  PhoneIcon,
  StethoscopeIcon,
  XIcon,
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

export default function VetDashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [vets, setVets] = useState([])
  const [vetsStatus, setVetsStatus] = useState('loading') // loading | ready | error
  const [appointments, setAppointments] = useState(null) // null = loading
  const [tab, setTab] = useState('upcoming')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [editingNotesId, setEditingNotesId] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoadError('')
    setActionError('')
    try {
      const [vetRows, appointmentRows] = await Promise.all([
        fetchMyVetProfiles(),
        fetchVetAppointments(),
      ])
      setVets(vetRows)
      setAppointments(appointmentRows)
      setVetsStatus('ready')
    } catch (err) {
      console.error('[VetDashboard] Failed to load data:', err)
      setLoadError(getAppointmentErrorMessage(err, "We couldn't load your schedule."))
      setAppointments([])
      setVetsStatus('error')
    }
  }, [user])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const { upcoming, past, cancelled } = useMemo(() => {
    const now = new Date()
    const up = []
    const pa = []
    const ca = []
    for (const appt of appointments ?? []) {
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
    () => ({
      upcoming: upcoming.length,
      past: past.length,
      cancelled: cancelled.length,
    }),
    [upcoming, past, cancelled],
  )

  const activeList = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled

  const handleSetStatus = async (appt, status) => {
    if (updatingId) return
    setUpdatingId(appt.id)
    setActionError('')
    try {
      const updated = await updateVetAppointment({ appointmentId: appt.id, status })
      setAppointments((prev) =>
        prev.map((row) => (row.id === appt.id ? { ...row, status: updated.status } : row)),
      )
      showToast(`Appointment ${status === 'completed' ? 'completed' : `marked ${status}`}`)
    } catch (err) {
      console.error('[VetDashboard] Status update failed:', err)
      setActionError(
        getAppointmentErrorMessage(err, 'Could not update this appointment. Please try again.'),
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const startEditNotes = (appt) => {
    setEditingNotesId(appt.id)
    setNotesDraft(appt.notes || '')
    setActionError('')
  }

  const saveNotes = async (appt) => {
    if (updatingId) return
    setUpdatingId(appt.id)
    setActionError('')
    try {
      await updateVetAppointment({ appointmentId: appt.id, notes: notesDraft })
      setAppointments((prev) =>
        prev.map((row) => (row.id === appt.id ? { ...row, notes: notesDraft } : row)),
      )
      setEditingNotesId(null)
      showToast('Notes saved')
    } catch (err) {
      console.error('[VetDashboard] Notes save failed:', err)
      setActionError(getAppointmentErrorMessage(err, 'Could not save the notes. Please try again.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const primaryVet = vets[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Veterinarian portal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {primaryVet ? `Dr. ${primaryVet.name.replace(/^Dr\.\s*/i, '')}` : 'My schedule'}
            </h1>
            <p className="mt-2 text-slate-500">
              Confirm, complete and note appointments assigned to you.
            </p>
          </div>
          {vetsStatus === 'ready' && vets.length > 0 && (
            <p className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-xs">
              {vets.length} {vets.length === 1 ? 'linked profile' : 'linked profiles'}
            </p>
          )}
        </div>

        {/* Vet profile strip */}
        {vetsStatus === 'ready' && vets.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <Avatar src={primaryVet.avatar_url} name={primaryVet.name} className="h-12 w-12 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{primaryVet.name}</p>
              <p className="truncate text-xs capitalize text-slate-500">
                {primaryVet.specialty || 'Veterinarian'}
                {primaryVet.license_number ? ` · License ${primaryVet.license_number}` : ''}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="flex items-center justify-end gap-1.5 truncate text-xs font-medium text-slate-600">
                <BuildingIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span className="line-clamp-1">{primaryVet.clinics?.name}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                {primaryVet.clinics?.address}
              </p>
            </div>
          </div>
        )}

        {vetsStatus === 'ready' && vets.length === 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
            <p className="text-sm font-semibold text-amber-900">
              No veterinarian profile linked to your account yet
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-amber-800">
              An administrator needs to link your user account to a
              veterinarian record in the database. Until then there is no
              schedule to display here.
            </p>
            <Link to="/dashboard" className="btn-secondary mt-4">
              Back to dashboard
            </Link>
          </div>
        )}

        {loadError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
            <button type="button" onClick={loadAll} className="btn-secondary ml-auto px-3 py-1.5 text-xs">
              Try again
            </button>
          </div>
        )}

        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

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
                setActionError('')
                setEditingNotesId(null)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                tab === t.key ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.label}
              {appointments !== null && (
                <span
                  className={`ml-1.5 text-xs ${tab === t.key ? 'text-emerald-200' : 'text-slate-400'}`}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {appointments === null && (
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((key) => (
              <AppointmentSkeleton key={key} />
            ))}
          </div>
        )}

        {/* List */}
        {appointments !== null && (
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
                    ? 'Appointments booked with you will appear here once they are requested.'
                    : 'Nothing here yet.'}
                </p>
              </div>
            ) : (
              activeList.map((appt) => {
                const { date, time } = formatDateTime(appt.appointment_date)
                const owner = appt.profiles
                const isEditingNotes = editingNotesId === appt.id
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
                              {owner?.full_name || 'Owner'}
                              {owner?.email ? ` · ${owner.email}` : ''}
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
                        <span className="line-clamp-1">{appt.clinics?.name || 'Clinic'}</span>
                      </div>
                    </dl>

                    {/* Notes */}
                    {isEditingNotes ? (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                        <label htmlFor={`notes-${appt.id}`} className="form-label">
                          Notes
                        </label>
                        <textarea
                          id={`notes-${appt.id}`}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          maxLength={500}
                          className="input-field resize-none"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveNotes(appt)}
                            disabled={updatingId === appt.id}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            {updatingId === appt.id ? 'Saving…' : 'Save notes'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3.5 py-2.5">
                        <p className="min-w-0 text-sm text-slate-600">
                          {appt.notes ? (
                            <>
                              <span className="font-semibold text-slate-500">Notes: </span>
                              {appt.notes}
                            </>
                          ) : (
                            <span className="text-slate-400">No notes yet.</span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => startEditNotes(appt)}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                    )}

                    {/* Status actions */}
                    {(appt.status === 'pending' || appt.status === 'confirmed') && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        {appt.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(appt, 'confirmed')}
                            disabled={updatingId !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Confirm
                          </button>
                        )}
                        {appt.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(appt, 'completed')}
                            disabled={updatingId !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Mark completed
                          </button>
                        )}
                        {appt.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(appt, 'cancelled')}
                            disabled={updatingId !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XIcon className="h-4 w-4" />
                            Decline
                          </button>
                        )}
                        {updatingId === appt.id && (
                          <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    )}
                    {appt.status === 'cancelled' && (
                      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
                        This appointment was declined/cancelled.
                      </p>
                    )}
                    {appt.status === 'completed' && (
                      <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-400">
                        <PhoneIcon className="h-3.5 w-3.5" />
                        Completed visit — consider following up with the owner if needed.
                      </p>
                    )}
                  </article>
                )
              })
            )}
          </div>
        )}
      </main>
    </div>
  )
}
