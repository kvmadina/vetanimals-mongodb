import { Router } from 'express'
import { Clinic } from '../models/Clinic.js'
import { notFound, route } from '../middleware/errorHandler.js'
import { parseIds, searchRegex } from '../lib/query.js'

const router = Router()

/** GET /api/clinics — public listing, optional search or explicit id list. */
router.get(
  '/',
  route(async (req, res) => {
    const filter = {}

    const idList = parseIds(req.query.ids)
    if (req.query.ids !== undefined) {
      if (idList.length === 0) return res.json([])
      filter._id = { $in: idList }
    }

    const regex = searchRegex(req.query.search)
    if (regex) filter.$or = [{ name: regex }, { address: regex }]

    res.json(await Clinic.find(filter).sort({ name: 1 }))
  }),
)

/** GET /api/clinics/:id — includes the clinic's veterinarians. */
router.get(
  '/:id',
  route(async (req, res) => {
    const clinic = await Clinic.findById(req.params.id).populate({
      path: 'veterinarians',
      options: { sort: { name: 1 } },
    })
    if (!clinic) throw notFound('This clinic is no longer available.')
    res.json(clinic)
  }),
)

export default router
