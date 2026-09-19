// ---------------------------------------------------------------------------
// Appointments.
//
// Postgres enforced "owners may only cancel their own pending appointment" and
// "vets may only change status and notes" with BEFORE UPDATE triggers. Those
// rules now live in these handlers: each one filters by the caller and only
// ever writes the fields that caller is allowed to write.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import mongoose from 'mongoose'
import { Appointment, APPOINTMENT_STATUSES } from '../models/Appointment.js'
import { Pet } from '../models/Pet.js'
import { Veterinarian } from '../models/Veterinarian.js'
import { requireAuth } from '../middleware/auth.js'
import { badRequest, forbidden, notFound, route } from '../middleware/errorHandler.js'

const router = Router()

router.use(requireAuth)

const OWNER_POPULATE = [
  { path: 'pets', select: 'name type breed avatar_url' },
  { path: 'veterinarians', select: 'name specialty avatar_url' },
  { path: 'clinics', select: 'name address phone' },
]

const VET_POPULATE = [
  { path: 'pets', select: 'name type breed avatar_url' },
  { path: 'profiles', select: 'full_name email phone' },
  { path: 'clinics', select: 'name address phone' },
]

/** The veterinarian documents linked to the signed-in account. */
async function vetIdsFor(userId) {
  const vets = await Veterinarian.find({ user_id: userId }, '_id').lean()
  return vets.map((vet) => vet._id)
}

/** GET /api/appointments — the caller's own bookings. */
router.get(
  '/',
  route(async (req, res) => {
    res.json(
      await Appointment.find({ user_id: req.user.id })
        .populate(OWNER_POPULATE)
        .sort({ appointment_date: -1 }),
    )
  }),
)

/** GET /api/appointments/vet — bookings assigned to the caller as a vet. */
router.get(
  '/vet',
  route(async (req, res) => {
    const vetIds = await vetIdsFor(req.user.id)
    if (vetIds.length === 0) return res.json([])

    res.json(
      await Appointment.find({ veterinarian_id: { $in: vetIds } })
        .populate(VET_POPULATE)
        .sort({ appointment_date: -1 }),
    )
  }),
)

/**
 * GET /api/appointments/slot-count?vetId=&date=
 * How many of the CALLER's own non-cancelled bookings sit on this slot. Used
 * by the booking form to stop a user double-booking themselves; it deliberately
 * does not report other customers' bookings.
 */
router.get(
  '/slot-count',
  route(async (req, res) => {
    const { vetId, date } = req.query
    if (!vetId || !mongoose.isValidObjectId(vetId) || !date) return res.json({ count: 0 })

    const count = await Appointment.countDocuments({
      user_id: req.user.id,
      veterinarian_id: vetId,
      appointment_date: new Date(date),
      status: { $ne: 'cancelled' },
    })
    res.json({ count })
  }),
)

/** POST /api/appointments — book a visit for one of the caller's own pets. */
router.post(
  '/',
  route(async (req, res) => {
    const { pet_id, veterinarian_id, appointment_date, notes } = req.body

    // The pet must belong to the caller — otherwise anyone could book visits
    // against someone else's animal.
    if (!mongoose.isValidObjectId(pet_id) || !(await Pet.exists({ _id: pet_id, owner_id: req.user.id }))) {
      throw badRequest('Choose one of your own pets for this visit.', 'invalid-pet')
    }

    // clinic_id is derived from the vet rather than trusted from the body, so
    // the booking can never point at a clinic the vet does not work at.
    const vet = mongoose.isValidObjectId(veterinarian_id)
      ? await Veterinarian.findById(veterinarian_id)
      : null
    if (!vet) throw badRequest('That veterinarian is no longer available.', 'invalid-vet')

    const appointment = await Appointment.create({
      user_id: req.user.id,
      pet_id,
      veterinarian_id: vet.id,
      clinic_id: vet.clinic_id,
      appointment_date,
      status: 'pending',
      notes: notes || null,
    })

    res.status(201).json(appointment)
  }),
)

/** PATCH /api/appointments/:id/cancel — owners may cancel a pending booking. */
router.patch(
  '/:id/cancel',
  route(async (req, res) => {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    })
    if (!appointment) throw notFound('This appointment no longer exists.')
    if (appointment.status !== 'pending') {
      throw badRequest('Only pending appointments can be cancelled.', 'not-cancellable')
    }

    appointment.status = 'cancelled'
    await appointment.save()
    res.json(appointment)
  }),
)

/** PATCH /api/appointments/:id/vet — vets may change status and notes only. */
router.patch(
  '/:id/vet',
  route(async (req, res) => {
    const { status, notes } = req.body

    const patch = {}
    if (status) {
      if (!APPOINTMENT_STATUSES.includes(status)) {
        throw badRequest('That is not a valid appointment status.', 'invalid-status')
      }
      patch.status = status
    }
    if (typeof notes === 'string') patch.notes = notes
    if (Object.keys(patch).length === 0) throw badRequest('Nothing to update.', 'empty-update')

    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) throw notFound('This appointment no longer exists.')

    const vetIds = await vetIdsFor(req.user.id)
    const assignedToCaller = vetIds.some((id) => id.equals(appointment.veterinarian_id))
    if (!assignedToCaller && req.user.role !== 'admin') throw forbidden()

    appointment.set(patch)
    await appointment.save()
    res.json(appointment)
  }),
)

export default router
