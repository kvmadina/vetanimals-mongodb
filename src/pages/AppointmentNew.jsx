import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPets } from '../lib/pets.js'
import {
  createAppointment,
  fetchAppointmentCountForSlot,
  getAppointmentErrorMessage,
} from '../lib/appointments.js'
import { fetchVeterinarianById, fetchVeterinarians } from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  AlertIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  MapPinIcon,
  PawIcon,
  PhoneIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

const STEPS = ['Pet', 'Veterinarian', 'Schedule', 'Notes', 'Review']

const TIME_SLOTS = []
for (let hour = 9; hour <= 16; hour += 1) {
  TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:00`)
  if (hour < 16) TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:30`)
}

const todayLocal = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0]
}

function StepIndicator({ step }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Booking progress">
      {STEPS.map((label, index) => {
        const n = index + 1
        const done = n < step
        const current = n === step
        return (
          <li key={label} className="flex items-center gap-1 sm:gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                done
                  ? 'bg-emerald-600 text-white'
                  : current
                    ? 'border-2 border-emerald-600 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
              }`}
              aria-current={current ? 'step' : undefined}
            >
              {done ? <CheckIcon className="h-3.5 w-3.5" /> : n}
            </span>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                current ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
            {n < STEPS.length && (
              <span className="h-px w-4 bg-slate-200 sm:w-8" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ChoiceCard({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
        selected
          ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function RadioDot({ selected }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? 'border-emerald-600' : 'border-slate-300'
      }`}
      aria-hidden="true"
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
    </span>
  )
}

export default function AppointmentNew() {
  const { user } = useAuth()
  const location = useLocation()
  const preselect = location.state || {}

  const [step, setStep] = useState(1)
  const [pets, setPets] = useState([])
  const [vets, setVets] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')

  const [petId, setPetId] = useState('')
  const [vetId, setVetId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const [slotBusy, setSlotBusy] = useState(false)
  const [checkingSlot, setCheckingSlot] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load the user's pets and the relevant veterinarians
  useEffect(() => {
    let active = true
    setError('')

    const loadPets = fetchPets().catch((err) => {
      console.error('[AppointmentNew] Failed to load pets:', err)
      throw err
    })

    let loadVets
    if (preselect.vetId) {
      loadVets = fetchVeterinarianById(preselect.vetId).then((vet) => (vet ? [vet] : []))
    } else if (preselect.clinicId) {
      loadVets = fetchVeterinarians({ clinicId: preselect.clinicId })
    } else {
      loadVets = fetchVeterinarians()
    }

    Promise.all([loadPets, loadVets])
      .then(([petRows, vetRows]) => {
        if (!active) return
        setPets(petRows)
        setVets(vetRows)
        setStatus('ready')
        if (preselect.vetId) setVetId(preselect.vetId)
        else if (vetRows.length === 1) setVetId(vetRows[0].id)
        if (petRows.length === 1) setPetId(petRows[0].id)
      })
      .catch((err) => {
        console.error('[AppointmentNew] Failed to load booking data:', err)
        if (active) {
          setError("We couldn't load the booking form. Please try again.")
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [preselect.vetId, preselect.clinicId])

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === petId) || null,
    [pets, petId],
  )
  const selectedVet = useMemo(
    () => vets.find((vet) => vet.id === vetId) || null,
    [vets, vetId],
  )

  // Prevent the user double-booking themselves: check their own non-cancelled
  // appointments for the selected vet + datetime. Clinic-wide availability is
  // never claimed (RLS only exposes the user's own rows).
  useEffect(() => {
    if (!vetId || !date || !time) {
      setSlotBusy(false)
      setCheckingSlot(false)
      return
    }
    let active = true
    setCheckingSlot(true)
    const iso = new Date(`${date}T${time}:00`).toISOString()
    fetchAppointmentCountForSlot(vetId, iso)
      .then((count) => {
        if (active) setSlotBusy(count > 0)
      })
      .catch((err) => {
        console.error('[AppointmentNew] Slot check failed:', err)
        if (active) setSlotBusy(false)
      })
      .finally(() => {
        if (active) setCheckingSlot(false)
      })
    return () => {
      active = false
    }
  }, [vetId, date, time])

  const now = new Date()
  const isSlotInPast = (slot) => {
    if (date !== todayLocal()) return false
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes()
  }

  const canGoNext = {
    1: Boolean(petId),
    2: Boolean(vetId),
    3: Boolean(date && time) && !checkingSlot && !slotBusy,
    4: true,
  }

  const handleNext = () => {
    if (!canGoNext[step]) return
    setSubmitError('')
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  const handleBack = () => {
    setSubmitError('')
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleConfirm = async () => {
    if (!selectedVet || !selectedPet || !user || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const appointmentDate = new Date(`${date}T${time}:00`).toISOString()
      // The clinic is derived from the chosen vet on the server, so it is not
      // sent from here.
      await createAppointment({ petId, vetId, appointmentDate, notes })
      setSuccess(true)
    } catch (err) {
      console.error('[AppointmentNew] Booking failed:', err)
      // Stay on the review step — the entered form state is preserved.
      setSubmitError(
        getAppointmentErrorMessage(err, 'Could not book the appointment. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Success screen (only after the server confirms the booking)
  // -------------------------------------------------------------------------
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-8 w-8" />
            </span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              Appointment requested
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              Your appointment is now pending. The clinic will confirm the
              booking shortly — you can track it in My Appointments.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/appointments" className="btn-primary">
                View my appointments
              </Link>
              <Link to="/vets" className="btn-secondary">
                Browse veterinarians
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Booking wizard
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Appointments
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Book an appointment
          </h1>
          <p className="mt-2 text-slate-500">
            A few quick steps to schedule a visit for your pet.
          </p>
        </div>

        {status === 'loading' && (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="h-12 rounded-lg bg-slate-200" />
            <div className="h-12 rounded-lg bg-slate-200" />
            <div className="h-12 rounded-lg bg-slate-200" />
            <div className="h-24 rounded-lg bg-slate-100" />
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <p className="mx-auto mt-3 max-w-md text-sm text-red-700">{error}</p>
            <Link to="/vets" className="btn-primary mt-6">
              Back to veterinarians
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <div className="mt-8">
            {/* Stepper */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
              <StepIndicator step={step} />
              <p className="mt-3 text-center text-xs font-medium text-slate-400 sm:hidden">
                Step {step} of {STEPS.length} — {STEPS[step - 1]}
              </p>
            </div>

            {/* STEP 1 — PET */}
            {step === 1 && (
              <div className="mt-6 space-y-6">
                <SectionCard
                  title="Which pet is this for?"
                  subtitle="Appointments are booked for one of your pets."
                >
                  {pets.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <PawIcon className="h-7 w-7" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        You don&apos;t have any pets yet
                      </p>
                      <p className="mt-1 max-w-xs text-sm text-slate-500">
                        Add a pet to your profile before booking an appointment.
                      </p>
                      <Link to="/pets" className="btn-primary mt-5">
                        Add a pet
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pets.map((pet) => (
                        <ChoiceCard key={pet.id} selected={petId === pet.id} onClick={() => setPetId(pet.id)}>
                          <div className="flex items-center gap-3">
                            <Avatar src={pet.avatar_url} name={pet.name} className="h-11 w-11 text-base" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{pet.name}</p>
                              <p className="text-xs capitalize text-slate-500">
                                {pet.type}
                                {pet.breed ? ` · ${pet.breed}` : ''}
                              </p>
                            </div>
                            <RadioDot selected={petId === pet.id} />
                          </div>
                        </ChoiceCard>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* STEP 2 — VETERINARIAN */}
            {step === 2 && (
              <div className="mt-6 space-y-6">
                <SectionCard
                  title="Choose a veterinarian"
                  subtitle="You can filter by clinic or specialty on the directory."
                >
                  {vets.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <StethoscopeIcon className="h-7 w-7" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        No veterinarians available
                      </p>
                      <p className="mt-1 max-w-xs text-sm text-slate-500">
                        There are no veterinarians to book with right now. Check
                        back soon.
                      </p>
                      <Link to="/vets" className="btn-primary mt-5">
                        Browse veterinarians
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vets.map((vet) => (
                        <ChoiceCard key={vet.id} selected={vetId === vet.id} onClick={() => setVetId(vet.id)}>
                          <div className="flex items-center gap-3">
                            <Avatar src={vet.avatar_url} name={vet.name} className="h-11 w-11 text-base" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">{vet.name}</p>
                              <p className="text-xs capitalize text-slate-500">
                                {vet.specialty || 'Veterinarian'}
                              </p>
                              {vet.clinics?.name && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                  <MapPinIcon className="h-3 w-3 shrink-0 text-emerald-600" />
                                  <span className="line-clamp-1">{vet.clinics.name}</span>
                                </p>
                              )}
                            </div>
                            <RadioDot selected={vetId === vet.id} />
                          </div>
                        </ChoiceCard>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Clinic is derived from the selected veterinarian */}
                {selectedVet?.clinics && (
                  <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs sm:p-6">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <BuildingIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          {selectedVet.clinics.name}
                        </h2>
                        <p className="text-xs text-slate-500">Clinic for this appointment</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 pl-10 text-sm text-slate-600">
                      {selectedVet.clinics.address && (
                        <p className="flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          {selectedVet.clinics.address}
                        </p>
                      )}
                      {selectedVet.clinics.phone && (
                        <p className="flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          {selectedVet.clinics.phone}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* STEP 3 — DATE & TIME */}
            {step === 3 && (
              <div className="mt-6 space-y-6">
                <SectionCard
                  title="Pick a date and time"
                  subtitle="Times are indicative — the clinic confirms exact availability."
                >
                  <div>
                    <label htmlFor="appointment-date" className="form-label">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        id="appointment-date"
                        type="date"
                        value={date}
                        min={todayLocal()}
                        onChange={(e) => {
                          setDate(e.target.value)
                          setTime('')
                        }}
                        className="input-field"
                      />
                      <CalendarIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="form-label">
                      Time
                      {date === todayLocal() && (
                        <span className="ml-1 font-normal text-slate-400">
                          (past times are hidden)
                        </span>
                      )}
                    </p>
                    {date ? (
                      <div
                        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
                        role="radiogroup"
                        aria-label="Available times"
                      >
                        {TIME_SLOTS.map((slot) => {
                          const past = isSlotInPast(slot)
                          return (
                            <button
                              key={slot}
                              type="button"
                              role="radio"
                              aria-checked={time === slot}
                              disabled={past}
                              onClick={() => setTime(slot)}
                              className={`rounded-lg border px-2 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                                past
                                  ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                                  : time === slot
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                              }`}
                            >
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        Select a date to see available times.
                      </p>
                    )}
                  </div>

                  {slotBusy && (
                    <div role="status" className="form-banner--error mt-5">
                      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        You already have an appointment with this veterinarian at
                        that time. Please choose another time.
                      </span>
                    </div>
                  )}
                  {checkingSlot && (
                    <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <span
                        className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
                        aria-hidden="true"
                      />
                      Checking your schedule…
                    </p>
                  )}
                </SectionCard>
              </div>
            )}

            {/* STEP 4 — NOTES */}
            {step === 4 && (
              <div className="mt-6 space-y-6">
                <SectionCard
                  title="Add notes"
                  subtitle="Optional — anything the veterinarian should know before the visit."
                >
                  <label htmlFor="appointment-notes" className="form-label">
                    Notes <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="appointment-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Current symptoms, medication, or questions for the veterinarian…"
                    className="input-field resize-none"
                  />
                  <p className="mt-1.5 text-right text-xs text-slate-400">
                    {notes.length}/500
                  </p>
                </SectionCard>
              </div>
            )}

            {/* STEP 5 — REVIEW */}
            {step === 5 && (
              <div className="mt-6 space-y-6">
                <SectionCard
                  title="Review your appointment"
                  subtitle="Please check the details before confirming."
                >
                  <dl className="divide-y divide-slate-100">
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Pet</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">
                        {selectedPet?.name}
                        {selectedPet?.type ? (
                          <span className="text-slate-400"> · {selectedPet.type}</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Veterinarian</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">
                        {selectedVet?.name}
                        {selectedVet?.specialty ? (
                          <span className="capitalize text-slate-400"> · {selectedVet.specialty}</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Clinic</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">
                        {selectedVet?.clinics?.name || '—'}
                        {selectedVet?.clinics?.address ? (
                          <span className="block text-xs font-normal text-slate-400">
                            {selectedVet.clinics.address}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Date</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">
                        {date
                          ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Time</dt>
                      <dd className="text-right text-sm font-medium text-slate-900">{time || '—'}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-6 py-3">
                      <dt className="shrink-0 text-sm text-slate-500">Notes</dt>
                      <dd className="max-w-[60%] text-right text-sm text-slate-700">
                        {notes ? (
                          <span className="line-clamp-3 whitespace-pre-wrap">{notes}</span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </SectionCard>

                {submitError && (
                  <div role="alert" className="form-banner--error">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer navigation */}
            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button type="button" onClick={handleBack} disabled={submitting} className="btn-secondary">
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <Link to="/vets" className="btn-secondary">
                  Cancel
                </Link>
              )}

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext[step]}
                  className="btn-primary"
                >
                  Continue
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="btn-primary min-w-44"
                >
                  {submitting ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      Booking…
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4" />
                      Confirm appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
