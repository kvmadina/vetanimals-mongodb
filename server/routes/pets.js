// ---------------------------------------------------------------------------
// Pets — every route is scoped to the signed-in owner.
//
// The `owner_id: req.user.id` in each filter is what the RLS policy
// "Owners can manage their own pets" used to do. It is never taken from the
// request body, so a caller cannot read or write someone else's pet.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import { Pet } from '../models/Pet.js'
import { requireAuth } from '../middleware/auth.js'
import { notFound, route } from '../middleware/errorHandler.js'

const router = Router()

router.use(requireAuth)

const EDITABLE = ['name', 'type', 'breed', 'birth_date', 'gender', 'weight', 'avatar_url']

/** Copy only the fields a client may set — never owner_id. */
function pickEditable(body) {
  const patch = {}
  for (const field of EDITABLE) {
    if (field in body) patch[field] = body[field]
  }
  return patch
}

router.get(
  '/',
  route(async (req, res) => {
    res.json(await Pet.find({ owner_id: req.user.id }).sort({ created_at: -1 }))
  }),
)

router.post(
  '/',
  route(async (req, res) => {
    const pet = await Pet.create({ ...pickEditable(req.body), owner_id: req.user.id })
    res.status(201).json(pet)
  }),
)

router.patch(
  '/:id',
  route(async (req, res) => {
    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.user.id },
      pickEditable(req.body),
      { returnDocument: 'after', runValidators: true },
    )
    if (!pet) throw notFound('This pet no longer exists. It may have been removed.')
    res.json(pet)
  }),
)

router.delete(
  '/:id',
  route(async (req, res) => {
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, owner_id: req.user.id })
    if (!pet) throw notFound('This pet no longer exists. It may have been removed.')
    res.status(204).end()
  }),
)

export default router
