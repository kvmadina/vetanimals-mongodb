import { Router } from 'express'
import { Category } from '../models/Category.js'
import { route } from '../middleware/errorHandler.js'

const router = Router()

/** GET /api/categories — used by the shop filter panel. */
router.get(
  '/',
  route(async (_req, res) => {
    res.json(await Category.find().sort({ name: 1 }))
  }),
)

export default router
