// ---------------------------------------------------------------------------
// Profile — the user account.
//
// Supabase split this across auth.users (credentials) and public.profiles
// (details). Here both live in one document; `password_hash` has
// `select: false` so it is never loaded, and never serialized, by accident.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose'
import { timestamped } from './options.js'

const profileSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    full_name: { type: String, trim: true, default: '' },
    avatar_url: { type: String, default: '' },
    role: {
      type: String,
      enum: {
        values: ['user', 'veterinarian', 'admin'],
        message: 'Role must be user, veterinarian or admin.',
      },
      default: 'user',
    },
    phone: { type: String, trim: true, default: null },
  },
  timestamped,
)

// select:false keeps the hash out of query results, but a document built by
// create() still holds it in memory. Strip it on the way out too, so no route
// can leak it by returning the document it just created.
profileSchema.set('toJSON', {
  ...timestamped.toJSON,
  transform(doc, ret, options) {
    timestamped.toJSON.transform(doc, ret, options)
    delete ret.password_hash
    return ret
  },
})

export const Profile = mongoose.model('Profile', profileSchema)
