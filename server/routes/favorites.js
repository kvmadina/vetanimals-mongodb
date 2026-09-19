// ---------------------------------------------------------------------------
// Favorites — saved products, veterinarians and clinics.
// One collection, one field per target type, always scoped to the caller.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import { Favorite } from '../models/Favorite.js'
import { requireAuth } from '../middleware/auth.js'
import { badRequest, notFound, route } from '../middleware/errorHandler.js'

const router = Router()

router.use(requireAuth)

/** URL segment -> the document field that holds that kind of target. */
const FIELD_BY_TYPE = {
  products: 'product_id',
  veterinarians: 'veterinarian_id',
  clinics: 'clinic_id',
}

function fieldFor(type) {
  const field = FIELD_BY_TYPE[type]
  if (!field) throw badRequest(`Unknown favorite type: ${type}`, 'invalid-type')
  return field
}

/** GET /api/favorites/:type — the ids the caller has saved, as a flat array. */
router.get(
  '/:type',
  route(async (req, res) => {
    const field = fieldFor(req.params.type)
    const rows = await Favorite.find(
      { user_id: req.user.id, [field]: { $ne: null } },
      field,
    ).lean()
    res.json(rows.map((row) => String(row[field])))
  }),
)

/** POST /api/favorites/:type/:id — saving something already saved is a no-op. */
router.post(
  '/:type/:id',
  route(async (req, res) => {
    const field = fieldFor(req.params.type)
    const filter = { user_id: req.user.id, [field]: req.params.id }

    // upsert rather than insert: re-favoriting must succeed quietly instead of
    // failing on the unique index.
    await Favorite.findOneAndUpdate(filter, filter, { upsert: true, returnDocument: 'after' })
    res.status(201).json({ ok: true })
  }),
)

router.delete(
  '/:type/:id',
  route(async (req, res) => {
    const field = fieldFor(req.params.type)
    const removed = await Favorite.findOneAndDelete({
      user_id: req.user.id,
      [field]: req.params.id,
    })
    if (!removed) throw notFound('That item was not in your favorites.')
    res.status(204).end()
  }),
)

export default router
