import mongoose from 'mongoose'
import { timestamped } from './options.js'

const petSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: [true, 'A pet must have an owner.'],
    },
    name: { type: String, required: [true, "Your pet's name is required."], trim: true },
    type: { type: String, required: [true, 'Type is required, e.g. Dog, Cat or Bird.'], trim: true },
    breed: { type: String, default: null },
    // Kept as a plain YYYY-MM-DD string (not Date) because the edit form binds
    // it straight to <input type="date">, which only accepts that format.
    birth_date: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format.'],
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'unknown', null],
        message: 'Gender must be male, female or unknown.',
      },
      default: null,
    },
    weight: { type: Number, default: null, min: [0, 'Weight must be 0 or more.'] },
    avatar_url: { type: String, default: null },
  },
  timestamped,
)

petSchema.index({ owner_id: 1 })

export const Pet = mongoose.model('Pet', petSchema)
