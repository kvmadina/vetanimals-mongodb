// ---------------------------------------------------------------------------
// Orders.
//
// Line prices are ALWAYS read from the products collection here — the client's
// cart is a suggestion, never a source of prices. The total is recomputed from
// those prices, so the stored total always matches the stored lines.
//
// Payment is a demo: POST /:id/pay flips a pending order to paid. There is no
// card processing and no money moves.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import mongoose from 'mongoose'
import { Order, OrderItem, ORDER_STATUSES } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { badRequest, notFound, route } from '../middleware/errorHandler.js'

const router = Router()

router.use(requireAuth)

const ITEMS_POPULATE = {
  path: 'order_items',
  populate: { path: 'products', select: 'name image_url' },
}

// -- Admin -------------------------------------------------------------------
// Mounted before /:id so "admin" is never read as an order id.

router.get(
  '/admin',
  requireRole('admin'),
  route(async (_req, res) => {
    res.json(
      await Order.find()
        .populate(ITEMS_POPULATE)
        .populate({ path: 'profiles', select: 'full_name email' })
        .sort({ created_at: -1 }),
    )
  }),
)

router.get(
  '/admin/:id',
  requireRole('admin'),
  route(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(ITEMS_POPULATE)
    if (!order) throw notFound('This order no longer exists.')
    res.json(order)
  }),
)

router.patch(
  '/admin/:id/status',
  requireRole('admin'),
  route(async (req, res) => {
    const { status } = req.body
    if (!ORDER_STATUSES.includes(status)) {
      throw badRequest('That is not a valid order status.', 'invalid-status')
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true },
    )
    if (!order) throw notFound('This order no longer exists.')
    res.json(order)
  }),
)

// -- Customer ----------------------------------------------------------------

router.get(
  '/',
  route(async (req, res) => {
    res.json(
      await Order.find({ user_id: req.user.id })
        .populate(ITEMS_POPULATE)
        .sort({ created_at: -1 }),
    )
  }),
)

/**
 * POST /api/orders
 * Body: { shipping_address, lines: [{ product_id, quantity }] }
 * Any price sent by the client is ignored.
 */
router.post(
  '/',
  route(async (req, res) => {
    const { shipping_address, lines } = req.body

    if (!Array.isArray(lines) || lines.length === 0) {
      throw badRequest('Your cart is empty.', 'empty-cart')
    }

    const ids = lines
      .map((line) => line.product_id)
      .filter((id) => mongoose.isValidObjectId(id))
    const products = await Product.find({ _id: { $in: ids }, is_active: true })
    const productById = new Map(products.map((product) => [product.id, product]))

    const priced = []
    for (const line of lines) {
      const product = productById.get(String(line.product_id))
      if (!product) {
        throw badRequest('A product in this order is no longer available.', 'product-missing')
      }
      const quantity = Math.floor(Number(line.quantity))
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw badRequest(`Enter a valid quantity for ${product.name}.`, 'invalid-quantity')
      }
      if (quantity > product.stock) {
        throw badRequest(
          `Only ${product.stock} of ${product.name} ${product.stock === 1 ? 'is' : 'are'} in stock.`,
          'insufficient-stock',
        )
      }
      priced.push({ product_id: product.id, quantity, price_at_purchase: product.price })
    }

    const total = priced.reduce((sum, line) => sum + line.price_at_purchase * line.quantity, 0)

    const order = await Order.create({
      user_id: req.user.id,
      status: 'pending',
      total_amount: Math.round(total * 100) / 100,
      shipping_address,
    })

    try {
      await OrderItem.insertMany(priced.map((line) => ({ ...line, order_id: order.id })))
    } catch (error) {
      // Never leave an order with no lines behind — undo it and report the
      // failure honestly instead of showing the customer a half-saved order.
      await Order.findByIdAndDelete(order.id)
      throw error
    }

    res.status(201).json(order)
  }),
)

router.get(
  '/:id',
  route(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user_id: req.user.id }).populate(
      ITEMS_POPULATE,
    )
    if (!order) throw notFound('This order no longer exists.')
    res.json(order)
  }),
)

router.patch(
  '/:id/cancel',
  route(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!order) throw notFound('This order no longer exists.')
    if (order.status !== 'pending') {
      throw badRequest('Only pending orders can be cancelled.', 'not-cancellable')
    }

    order.status = 'cancelled'
    await order.save()
    res.json(order)
  }),
)

/** POST /api/orders/:id/pay — demo payment: pending -> paid, no card, no charge. */
router.post(
  '/:id/pay',
  route(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!order) throw notFound('This order no longer exists.')
    if (order.status !== 'pending') {
      throw badRequest('This order has already been paid or is no longer open.', 'not-payable')
    }

    order.status = 'paid'
    await order.save()
    res.json(order)
  }),
)

export default router
