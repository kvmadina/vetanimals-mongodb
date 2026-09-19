import { Router } from 'express'
import mongoose from 'mongoose'
import { Veterinarian } from '../models/Veterinarian.js'
import { notFound, route } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { parseIds, searchRegex } from '../lib/query.js'

const router = Router()

/** GET /api/veterinarians — public listing with optional filters. */
router.get(
  '/',
  route(async (req, res) => {
    const { search, specialty, clinicId, ids } = req.query
    const filter = {}

    const idList = parseIds(ids)
    if (ids !== undefined) {
      if (idList.length === 0) return res.json([])
      filter._id = { $in: idList }
    }

    if (clinicId && mongoose.isValidObjectId(clinicId)) filter.clinic_id = clinicId
    if (specialty) filter.specialty = specialty

    const regex = searchRegex(search)
    if (regex) filter.$or = [{ name: regex }, { specialty: regex }]

    res.json(await Veterinarian.find(filter).populate('clinics').sort({ name: 1 }))
  }),
)

/** GET /api/veterinarians/specialties — distinct specialties for the filter. */
router.get(
  '/specialties',
  route(async (_req, res) => {
    const values = await Veterinarian.distinct('specialty', { specialty: { $ne: null } })
    res.json(values.filter(Boolean).sort((a, b) => a.localeCompare(b)))
  }),
)

/**
 * GET /api/veterinarians/me — the vet profile(s) linked to the caller.
 * The veterinarian portal uses this to know which clinic it is acting for.
 */
router.get(
  '/me',
  requireAuth,
  route(async (req, res) => {
    res.json(
      await Veterinarian.find({ user_id: req.user.id }).populate('clinics').sort({ name: 1 }),
    )
  }),
)

/** GET /api/veterinarians/:id */
router.get(
  '/:id',
  route(async (req, res) => {
    const vet = await Veterinarian.findById(req.params.id).populate('clinics')
    if (!vet) throw notFound('This veterinarian is no longer available.')
    res.json(vet)
  }),
)

export default router
