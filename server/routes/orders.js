// ---------------------------------------------------------------------------
// Orders.
//
// Line prices are ALWAYS read from the products collection here — the client's
// cart is a suggestion, never a source of prices. The total is recomputed from
// those prices, so the stored total always matches the stored lines.
//
// Stock is taken when the order is created and given back when it is
// cancelled, so the catalogue always reflects what is actually available.
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

/**
 * Put units back into the catalogue.
 * Best-effort on purpose: a line that cannot be restored is logged, never
 * thrown, so it can't mask the failure the caller is already reporting.
 * @param {Array<{ product_id: unknown, quantity: number }>} lines
 */
async function giveBackStock(lines) {
  for (const line of lines) {
    try {
      await Product.updateOne({ _id: line.product_id }, { $inc: { stock: line.quantity } })
    } catch (error) {
      console.error('[orders] Could not restore stock for', String(line.product_id), error)
    }
  }
}

/** Give every unit on a stored order back to the catalogue. */
async function restoreOrderStock(orderId) {
  const items = await OrderItem.find({ order_id: orderId }, 'product_id quantity').lean()
  await giveBackStock(items)
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

    const order = await Order.findById(req.params.id)
    if (!order) throw notFound('This order no longer exists.')

    const wasCancelled = order.status === 'cancelled'
    // Cancelling already returned the units to the catalogue, so reopening the
    // order would sell stock that is no longer held. The admin UI treats
    // cancelled as terminal; this is the server saying the same thing.
    if (wasCancelled && status !== 'cancelled') {
      throw badRequest(
        'A cancelled order cannot be reopened — its items were returned to stock.',
        'order-cancelled',
      )
    }

    order.status = status
    await order.save()

    if (status === 'cancelled' && !wasCancelled) await restoreOrderStock(order.id)

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

    // Take the stock one line at a time, and only while it is still there:
    // the `stock: { $gte: quantity }` filter makes each decrement atomic, so
    // two customers cannot both buy the same last unit. The checks above ran
    // against a read that is already stale by now — this is the one that counts.
    const taken = []
    let order
    try {
      for (const line of priced) {
        const reserved = await Product.findOneAndUpdate(
          { _id: line.product_id, is_active: true, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
        )
        if (!reserved) {
          throw badRequest(
            'Someone else just bought the last of an item in this order. Please review your cart.',
            'insufficient-stock',
          )
        }
        taken.push(line)
      }

      order = await Order.create({
        user_id: req.user.id,
        status: 'pending',
        total_amount: Math.round(total * 100) / 100,
        shipping_address,
      })

      await OrderItem.insertMany(priced.map((line) => ({ ...line, order_id: order.id })))
    } catch (error) {
      // Never leave a half-saved order or swallowed stock behind — undo both
      // and report the failure honestly.
      if (order) await Order.findByIdAndDelete(order.id)
      await giveBackStock(taken)
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
    // The customer is no longer buying these — put them back on the shelf.
    await restoreOrderStock(order.id)
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
