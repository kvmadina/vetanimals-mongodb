import mongoose from 'mongoose'
import { createdOnly } from './options.js'

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], unique: true, trim: true },
    slug: { type: String, required: [true, 'Category slug is required.'], unique: true, trim: true },
    description: { type: String, default: null },
  },
  createdOnly,
)

export const Category = mongoose.model('Category', categorySchema)
