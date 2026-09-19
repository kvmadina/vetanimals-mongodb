import mongoose from 'mongoose'
import { timestamped } from './options.js'

const productSchema = new mongoose.Schema(
  {
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    name: { type: String, required: [true, 'Product name is required.'], trim: true },
    description: { type: String, default: null },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price cannot be negative.'],
    },
    image_url: { type: String, default: null },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative.'] },
    is_active: { type: Boolean, default: true },
    species: { type: String, default: null },
  },
  timestamped,
)

// Named `categories` (plural) because that is the key PostgREST used for the
// embedded row, and the shop pages read `product.categories?.name`.
productSchema.virtual('categories', {
  ref: 'Category',
  localField: 'category_id',
  foreignField: '_id',
  justOne: true,
})

productSchema.index({ category_id: 1 })

export const Product = mongoose.model('Product', productSchema)
