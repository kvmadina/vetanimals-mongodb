// ---------------------------------------------------------------------------
// Grant a role to an existing account.
//
// Registration always creates a plain 'user' — that is deliberate, since the
// role decides who can reach the admin panel. This script is the only way to
// promote someone, and it runs against the database directly, never over HTTP.
//
//   npm run role -- someone@example.com admin
//   npm run role -- vet@example.com veterinarian "Dr. Maya Chen"
//
// The third argument links the account to an existing veterinarian record, so
// the veterinarian portal knows whose schedule to show.
// ---------------------------------------------------------------------------
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './db.js'
import { Profile } from './models/Profile.js'
import { Veterinarian } from './models/Veterinarian.js'

const ROLES = ['user', 'veterinarian', 'admin']

async function main() {
  const [email, role, vetName] = process.argv.slice(2)

  if (!email || !role) {
    throw new Error(
      'Foydalanish: npm run role -- <email> <user|veterinarian|admin> ["Shifokor ismi"]',
    )
  }
  if (!ROLES.includes(role)) {
    throw new Error(`Noto'g'ri rol: "${role}". Mumkin: ${ROLES.join(', ')}`)
  }

  await connectDB()

  const profile = await Profile.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { role },
    { returnDocument: 'after' },
  )
  if (!profile) throw new Error(`"${email}" emaili bilan hisob topilmadi.`)
  console.log(`✅ ${profile.email} → ${profile.role}`)

  if (!vetName) {
    if (role === 'veterinarian') {
      console.log(
        'ℹ️  Shifokor ismi berilmadi — hisob hech qaysi shifokor yozuviga ' +
          'bog\'lanmadi, shuning uchun /vet sahifasi bo\'sh bo\'ladi.',
      )
    }
    return
  }

  const vet = await Veterinarian.findOneAndUpdate(
    { name: vetName },
    { user_id: profile.id },
    { returnDocument: 'after' },
  )
  if (!vet) {
    throw new Error(`"${vetName}" ismli shifokor topilmadi. Avval: npm run seed`)
  }
  console.log(`✅ ${profile.email} → ${vet.name} yozuviga bog'landi`)
}

try {
  await main()
} catch (error) {
  console.error('❌', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
