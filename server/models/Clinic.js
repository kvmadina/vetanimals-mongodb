import mongoose from 'mongoose'
import { timestamped } from './options.js'

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Clinic name is required.'], trim: true },
    address: { type: String, required: [true, 'Address is required.'], trim: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    website: { type: String, default: null },
  },
  timestamped,
)

// The clinic detail page reads `clinic.veterinarians`.
clinicSchema.virtual('veterinarians', {
  ref: 'Veterinarian',
  localField: '_id',
  foreignField: 'clinic_id',
})

export const Clinic = mongoose.model('Clinic', clinicSchema)
