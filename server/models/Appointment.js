import mongoose from 'mongoose'
import { timestamped } from './options.js'

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed']

const appointmentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    pet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: [true, 'Choose which pet the visit is for.'],
    },
    veterinarian_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinarian',
      required: [true, 'Choose a veterinarian.'],
    },
    clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    appointment_date: {
      type: Date,
      required: [true, 'Choose a date and time for the visit.'],
    },
    status: {
      type: String,
      enum: {
        values: APPOINTMENT_STATUSES,
        message: 'Status must be pending, confirmed, cancelled or completed.',
      },
      default: 'pending',
    },
    notes: { type: String, default: null },
  },
  timestamped,
)

// Embedded-row keys the appointment pages already read.
appointmentSchema.virtual('pets', {
  ref: 'Pet',
  localField: 'pet_id',
  foreignField: '_id',
  justOne: true,
})
appointmentSchema.virtual('veterinarians', {
  ref: 'Veterinarian',
  localField: 'veterinarian_id',
  foreignField: '_id',
  justOne: true,
})
appointmentSchema.virtual('clinics', {
  ref: 'Clinic',
  localField: 'clinic_id',
  foreignField: '_id',
  justOne: true,
})
appointmentSchema.virtual('profiles', {
  ref: 'Profile',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true,
})

appointmentSchema.index({ user_id: 1 })
appointmentSchema.index({ veterinarian_id: 1, appointment_date: 1 })

export const Appointment = mongoose.model('Appointment', appointmentSchema)
