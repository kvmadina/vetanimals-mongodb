import mongoose from 'mongoose'
import { timestamped } from './options.js'

const veterinarianSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
    clinic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'A veterinarian must belong to a clinic.'],
    },
    name: { type: String, required: [true, 'Name is required.'], trim: true },
    specialty: { type: String, default: null },
    bio: { type: String, default: null },
    avatar_url: { type: String, default: null },
    license_number: { type: String, default: null },
  },
  timestamped,
)

// `clinics` (plural) matches the embedded key the vet pages already read.
veterinarianSchema.virtual('clinics', {
  ref: 'Clinic',
  localField: 'clinic_id',
  foreignField: '_id',
  justOne: true,
})

veterinarianSchema.index({ clinic_id: 1 })
veterinarianSchema.index({ user_id: 1 })

export const Veterinarian = mongoose.model('Veterinarian', veterinarianSchema)
