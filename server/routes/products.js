// ---------------------------------------------------------------------------
// Shop catalogue — public reads. Only active products are ever returned; the
// route never exposes an inactive one, the way the old RLS policy did.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { notFound, route } from '../middleware/errorHandler.js'
import { parseIds, parseLimit, searchRegex } from '../lib/query.js'

const router = Router()

const SORTS = {
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'name-asc': { name: 1 },
  newest: { created_at: -1 },
}

/** GET /api/products — filtered listing. */
router.get(
  '/',
  route(async (req, res) => {
    const { categoryId, species, search, sort, availability, priceRange, limit, ids } = req.query

    const filter = { is_active: true }

    const idList = parseIds(ids)
    if (ids !== undefined) {
      // An explicit `ids` list that resolved to nothing must return nothing,
      // not the whole catalogue.
      if (idList.length === 0) return res.json([])
      filter._id = { $in: idList }
    }

    if (categoryId && mongoose.isValidObjectId(categoryId)) filter.category_id = categoryId
    if (species) filter.species = species

    if (availability === 'in-stock') filter.stock = { $gt: 0 }
    else if (availability === 'low-stock') filter.stock = { $gt: 0, $lte: 5 }
    else if (availability === 'out-of-stock') filter.stock = 0

    if (priceRange === 'under-25') filter.price = { $lt: 25 }
    else if (priceRange === '25-50') filter.price = { $gte: 25, $lte: 50 }
    else if (priceRange === 'over-50') filter.price = { $gt: 50 }

    const regex = searchRegex(search)
    if (regex) {
      filter.$or = [{ name: regex }, { description: regex }, { species: regex }]
    }

    let query = Product.find(filter).populate('categories').sort(SORTS[sort] || SORTS.newest)
    const max = parseLimit(limit)
    if (max) query = query.limit(max)

    res.json(await query)
  }),
)

/** GET /api/products/species — distinct species across active products. */
router.get(
  '/species',
  route(async (_req, res) => {
    const values = await Product.distinct('species', { is_active: true, species: { $ne: null } })
    res.json(values.filter(Boolean).sort((a, b) => a.localeCompare(b)))
  }),
)

/** GET /api/products/:id/related — same category or species, excluding itself. */
router.get(
  '/:id/related',
  route(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, is_active: true })
    if (!product) return res.json([])

    const alternatives = []
    if (product.category_id) alternatives.push({ category_id: product.category_id })
    if (product.species) alternatives.push({ species: product.species })
    if (alternatives.length === 0) return res.json([])

    const related = await Product.find({
      is_active: true,
      _id: { $ne: product._id },
      $or: alternatives,
    })
      .populate('categories')
      .limit(parseLimit(req.query.limit) || 4)

    res.json(related)
  }),
)

/** GET /api/products/:id */
router.get(
  '/:id',
  route(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, is_active: true }).populate(
      'categories',
    )
    if (!product) throw notFound('This product is no longer available.')
    res.json(product)
  }),
)

export default router
