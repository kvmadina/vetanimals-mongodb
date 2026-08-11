// ---------------------------------------------------------------------------
// Appointments data layer.
// Backed by public.appointments. RLS guarantees users only ever see/manage
// their own rows (auth.uid() = user_id). The database trigger
// check_appointment_update_integrity additionally restricts updates to
// "owners may cancel their own pending appointments", so cancellation only
// works when the database allows it — errors are surfaced as-is.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const APPOINTMENT_SELECT = `
  id,
  created_at,
  updated_at,
  appointment_date,
  status,
  notes,
  pets ( id, name, type, breed, avatar_url ),
  veterinarians ( id, name, specialty, avatar_url ),
  clinics ( id, name, address, phone )
`

// Vet-facing select: same shape plus the owner profile for context.
const VET_APPOINTMENT_SELECT = `
  id,
  created_at,
  updated_at,
  appointment_date,
  status,
  notes,
  pets ( id, name, type, breed, avatar_url ),
  profiles ( id, full_name, email, phone ),
  clinics ( id, name, address, phone )
`

/**
 * Fetch the current user's appointments with pet/vet/clinic details.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchAppointments(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('user_id', userId)
    .order('appointment_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Insert a new appointment. RLS enforces `auth.uid() = user_id`, so users can
 * only ever book for themselves. Created with status 'pending' (the database
 * default is 'pending' too, but it is set explicitly for clarity).
 * @param {{
 *   userId: string, petId: string, vetId: string, clinicId: string,
 *   appointmentDate: string (ISO), notes?: string,
 * }}
 * @returns {Promise<object>}
 */
export async function createAppointment({
  userId,
  petId,
  vetId,
  clinicId,
  appointmentDate,
  notes,
}) {
  if (!supabase || !userId) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      pet_id: petId,
      veterinarian_id: vetId,
      clinic_id: clinicId,
      appointment_date: appointmentDate,
      status: 'pending',
      notes: notes || null,
    })
    .select('id, appointment_date, status')
    .single()
  if (error) throw error
  return data
}

/**
 * Cancel an appointment. The database trigger only permits owners to cancel
 * their own *pending* appointments, so a confirmed/completed/past appointment
 * will be rejected server-side and the real error is returned.
 * @param {string} userId
 * @param {string} appointmentId
 * @returns {Promise<object>}
 */
export async function cancelAppointment(userId, appointmentId) {
  if (!supabase || !userId) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('user_id', userId)
    .select('id, status')
    .single()
  if (error) throw error
  return data
}

/**
 * Fetch all appointments assigned to the veterinarians linked to a user
 * (used by the veterinarian portal). Relies on the RLS policy
 * "Veterinarians can select assigned appointments" — the requesting user must
 * be the linked veterinarian account.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchVetAppointments(userId) {
  if (!supabase || !userId) return []

  // Resolve the veterinarians linked to this user first.
  const { data: vets, error: vetsError } = await supabase
    .from('veterinarians')
    .select('id')
    .eq('user_id', userId)
  if (vetsError) throw vetsError

  const vetIds = (vets ?? []).map((row) => row.id)
  if (vetIds.length === 0) return []

  const { data, error } = await supabase
    .from('appointments')
    .select(VET_APPOINTMENT_SELECT)
    .in('veterinarian_id', vetIds)
    .order('appointment_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Update an appointment as a veterinarian (status and/or notes only). The
 * database trigger check_appointment_update_integrity permits veterinarians
 * to change status and notes but never the immutable booking metadata, and
 * RLS restricts updates to the vet's own assigned appointments.
 * @param {{ appointmentId: string, status?: string, notes?: string }} input
 * @returns {Promise<object>}
 */
export async function updateVetAppointment({ appointmentId, status, notes }) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const patch = {}
  if (status) patch.status = status
  if (typeof notes === 'string') patch.notes = notes
  if (Object.keys(patch).length === 0) {
    const err = new Error('Nothing to update.')
    err.code = 'empty-update'
    throw err
  }
  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', appointmentId)
    .select('id, status, notes')
    .single()
  if (error) throw error
  return data
}

/**
 * Count the user's non-cancelled appointments for a vet at a given datetime.
 * RLS limits this to the user's own rows, so it can only detect the user
 * double-booking themselves — clinic-wide availability is not claimed.
 * @param {string} vetId
 * @param {string} isoDateTime
 * @returns {Promise<number>}
 */
export async function fetchAppointmentCountForSlot(vetId, isoDateTime) {
  if (!supabase || !vetId) return 0
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('veterinarian_id', vetId)
    .eq('appointment_date', isoDateTime)
    .neq('status', 'cancelled')
  if (error) throw error
  return count ?? 0
}

/**
 * Convert a raw Supabase error into a friendly appointment message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getAppointmentErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  const code = String(error.code || '')
  const raw = String(error.message || '')

  // Trigger-raised exceptions (e.g. "Only pending appointments can be
  // cancelled.") carry the database's own message — pass it through.
  if (code === 'P0001') return raw
  if (code === '42501') {
    return 'You do not have permission to perform that action.'
  }
  if (code === '23514' || code === '22P02') {
    return 'One of the values is not valid. Please check the form and try again.'
  }
  if (code === '23503') {
    return 'Something went wrong — one of the selected items is no longer available. Please go back and try again.'
  }
  if (code === 'PGRST116') {
    return 'This appointment no longer exists.'
  }
  if (/network|failed to fetch|fetch failed|load failed/i.test(raw)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }
  if (/row-level security/i.test(raw)) {
    return 'You do not have permission to perform that action.'
  }

  return fallback
}
