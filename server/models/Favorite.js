// ---------------------------------------------------------------------------
// Favorite — one saved product, veterinarian OR clinic per row.
// The "exactly one target" rule was a CHECK constraint in Postgres; here it is
// a schema-level validator, so a malformed favorite is a 400, not a bad row.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose'
import { createdOnly } from './options.js'

const favoriteSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    veterinarian_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian', default: null },
    clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', default: null },
  },
  createdOnly,
)

favoriteSchema.pre('validate', function enforceSingleTarget(next) {
  const targets = [this.product_id, this.veterinarian_id, this.clinic_id].filter(Boolean)
  if (targets.length !== 1) {
    this.invalidate(
      'product_id',
      'A favorite must point at exactly one product, veterinarian or clinic.',
    )
  }
  next()
})

// Partial unique indexes: one favorite per user per target, mirroring the
// Postgres partial unique indexes.
favoriteSchema.index(
  { user_id: 1, product_id: 1 },
  { unique: true, partialFilterExpression: { product_id: { $type: 'objectId' } } },
)
favoriteSchema.index(
  { user_id: 1, veterinarian_id: 1 },
  { unique: true, partialFilterExpression: { veterinarian_id: { $type: 'objectId' } } },
)
favoriteSchema.index(
  { user_id: 1, clinic_id: 1 },
  { unique: true, partialFilterExpression: { clinic_id: { $type: 'objectId' } } },
)

export const Favorite = mongoose.model('Favorite', favoriteSchema)
