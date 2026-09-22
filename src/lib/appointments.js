// ---------------------------------------------------------------------------
// Appointments data layer.
//
// The server decides who the caller is from the token: /appointments returns
// the caller's own bookings, /appointments/vet returns the ones assigned to
// them as a veterinarian. The rules that used to live in database triggers
// ("owners may only cancel a pending booking", "vets may only change status
// and notes") are enforced by those endpoints, so a rejected change comes back
// as a real error rather than silently doing nothing.
// ---------------------------------------------------------------------------
import { api, isNetworkError, queryString } from './api.js'

/**
 * Fetch the current user's appointments with pet/vet/clinic details.
 * @returns {Promise<Array>}
 */
export async function fetchAppointments() {
  return (await api('/appointments')) ?? []
}

/**
 * Book a visit. The server takes the owner from the token, checks the pet
 * belongs to them, and derives the clinic from the chosen veterinarian.
 * @param {{ petId: string, vetId: string, appointmentDate: string, notes?: string }} input
 * @returns {Promise<object>}
 */
export async function createAppointment({ petId, vetId, appointmentDate, notes }) {
  return api('/appointments', {
    method: 'POST',
    body: {
      pet_id: petId,
      veterinarian_id: vetId,
      appointment_date: appointmentDate,
      notes: notes || null,
    },
  })
}

/**
 * Cancel one of the caller's own pending appointments. A confirmed, completed
 * or already-cancelled booking is rejected by the server.
 * @param {string} appointmentId
 * @returns {Promise<object>}
 */
export async function cancelAppointment(appointmentId) {
  return api(`/appointments/${appointmentId}/cancel`, { method: 'PATCH' })
}

/**
 * Fetch the appointments assigned to the caller as a veterinarian (used by the
 * veterinarian portal). Returns an empty list when the account is not linked
 * to a veterinarian record.
 * @returns {Promise<Array>}
 */
export async function fetchVetAppointments() {
  return (await api('/appointments/vet')) ?? []
}

/**
 * Update an appointment as a veterinarian — status and/or notes only.
 * @param {{ appointmentId: string, status?: string, notes?: string }} input
 * @returns {Promise<object>}
 */
export async function updateVetAppointment({ appointmentId, status, notes }) {
  const body = {}
  if (status) body.status = status
  if (typeof notes === 'string') body.notes = notes
  if (Object.keys(body).length === 0) {
    const err = new Error('Nothing to update.')
    err.code = 'empty-update'
    throw err
  }
  return api(`/appointments/${appointmentId}/vet`, { method: 'PATCH', body })
}

/**
 * Count the non-cancelled appointments already on a vet's slot.
 * A warning for the booking form only — the server refuses a taken slot when
 * the booking is actually submitted.
 * @param {string} vetId
 * @param {string} isoDateTime
 * @returns {Promise<number>}
 */
export async function fetchAppointmentCountForSlot(vetId, isoDateTime) {
  if (!vetId || !isoDateTime) return 0
  const result = await api(`/appointments/slot-count${queryString({ vetId, date: isoDateTime })}`)
  return result?.count ?? 0
}

/**
 * Convert an API error into a friendly appointment message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getAppointmentErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }

  // These carry a specific, already user-facing sentence from the server.
  const passThrough = [
    'not-cancellable',
    'invalid-pet',
    'invalid-vet',
    'invalid-date',
    'invalid-status',
    'slot-taken',
    'validation',
  ]
  if (passThrough.includes(error.code)) {
    return error.message || fallback
  }

  if (error.code === 'forbidden' || error.code === 'auth-required') {
    return 'You do not have permission to perform that action.'
  }
  if (error.code === 'invalid-id') {
    return 'One of the values is not valid. Please check the form and try again.'
  }
  if (error.code === 'not-found') {
    return 'This appointment no longer exists.'
  }
  return fallback
}
