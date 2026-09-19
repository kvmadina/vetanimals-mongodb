import mongoose from 'mongoose'
import { timestamped, createdOnly } from './options.js'

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'completed']

// Line items stay in their own collection (rather than embedded) so the
// response keeps the `order_items[].products` shape the order pages read.
const orderItemSchema = new mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1.'],
    },
    price_at_purchase: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative.'],
    },
  },
  createdOnly,
)

orderItemSchema.virtual('products', {
  ref: 'Product',
  localField: 'product_id',
  foreignField: '_id',
  justOne: true,
})

orderItemSchema.index({ order_id: 1 })

const orderSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: 'Status must be pending, paid, shipped, cancelled or completed.',
      },
      default: 'pending',
    },
    total_amount: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative.'],
    },
    shipping_address: {
      type: String,
      required: [true, 'A shipping address is required.'],
      trim: true,
    },
  },
  timestamped,
)

orderSchema.virtual('order_items', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'order_id',
})
orderSchema.virtual('profiles', {
  ref: 'Profile',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true,
})

orderSchema.index({ user_id: 1 })
orderSchema.index({ status: 1 })

export const Order = mongoose.model('Order', orderSchema)
export const OrderItem = mongoose.model('OrderItem', orderItemSchema)
