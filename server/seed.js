// ---------------------------------------------------------------------------
// Seed the catalogue: categories, products, clinics and veterinarians.
// Ported from supabase/seed/*.sql and idempotent in the same way — rows are
// matched by name and skipped when they already exist, never duplicated.
//
//   npm run seed
// ---------------------------------------------------------------------------
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from './db.js'
import { Category } from './models/Category.js'
import { Product } from './models/Product.js'
import { Clinic } from './models/Clinic.js'
import { Veterinarian } from './models/Veterinarian.js'

const CATEGORIES = [
  ['Food', 'food', 'Nutritious food for every species.'],
  ['Treats', 'treats', 'Rewards and training treats.'],
  ['Toys', 'toys', 'Toys that keep pets active and happy.'],
  ['Accessories', 'accessories', 'Collars, bowls, carriers and everyday gear.'],
  ['Hygiene', 'hygiene', 'Grooming, litter and cleanliness essentials.'],
  ['Health & Care', 'health-care', 'Supplements and wellness products.'],
  ['Beds & Comfort', 'beds-comfort', 'Cozy beds and comfort essentials.'],
]

// [categoryName, name, description, price, image_url, stock, species]
const PRODUCTS = [
  ['Food', 'Premium Adult Dog Food', 'Complete and balanced dry food for adult dogs, with real chicken and essential vitamins.', 49.99, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80&auto=format&fit=crop', 85, 'dog'],
  ['Food', 'Puppy Chicken Food', 'Specially formulated kibble for growing puppies, rich in protein and DHA.', 39.99, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80&auto=format&fit=crop', 60, 'dog'],
  ['Food', 'Cat Dry Food', 'Everyday dry food for adult cats with salmon and balanced minerals.', 34.99, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80&auto=format&fit=crop', 95, 'cat'],
  ['Food', 'Kitten Food', 'High-energy food for kittens up to 12 months, with extra taurine.', 29.99, 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80&auto=format&fit=crop', 70, 'cat'],
  ['Food', 'Bird Seed Mix', 'Premium seed blend for parakeets and small birds, fortified with vitamins.', 12.99, 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80&auto=format&fit=crop', 110, 'bird'],
  ['Food', 'Rabbit Hay', 'Timothy hay for rabbits and guinea pigs — high fibre for healthy digestion.', 18.99, 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=800&q=80&auto=format&fit=crop', 80, 'rabbit'],
  ['Food', 'Hamster Food Mix', 'Nutritious seed and grain mix for hamsters and gerbils.', 9.99, 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80&auto=format&fit=crop', 120, 'hamster'],
  ['Food', 'Rabbit Food Pellets', 'High-fibre pellets with added vitamins for adult rabbits.', 16.99, 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&q=80&auto=format&fit=crop', 65, 'rabbit'],

  ['Treats', 'Dental Chew Treats', 'Daily dental chews that help reduce plaque and tartar.', 14.99, 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80&auto=format&fit=crop', 75, 'dog'],
  ['Treats', 'Salmon Cat Treats', 'Soft salmon bites that cats love, ideal for training rewards.', 11.99, 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=800&q=80&auto=format&fit=crop', 90, 'cat'],
  ['Treats', 'Bird Millet Spray', 'Natural millet spray, a favourite treat for small birds.', 6.99, 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=800&q=80&auto=format&fit=crop', 100, 'bird'],
  ['Treats', 'Rabbit Treat Sticks', 'Yummy fruit and seed sticks for rabbits, great for bonding time.', 8.99, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80&auto=format&fit=crop', 85, 'rabbit'],

  ['Toys', 'Interactive Dog Toy', 'Durable puzzle toy that keeps dogs entertained and mentally sharp.', 19.99, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80&auto=format&fit=crop', 55, 'dog'],
  ['Toys', 'Cat Scratching Toy', 'Cardboard scratcher with catnip, perfect for claw care.', 24.99, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop', 40, 'cat'],
  ['Toys', 'Bird Swinging Perch', 'Natural wood swinging perch for small and medium birds.', 15.99, 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80&auto=format&fit=crop', 50, 'bird'],
  ['Toys', 'Hamster Running Wheel', 'Silent running wheel for hamsters and small rodents.', 22.99, 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80&auto=format&fit=crop', 45, 'hamster'],
  ['Toys', 'Plush Squeaky Toy', 'Soft plush toy with a squeaker, for playful dogs of all sizes.', 12.49, 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80&auto=format&fit=crop', 130, 'dog'],

  ['Accessories', 'Adjustable Dog Collar', 'Strong, adjustable nylon collar with a quick-release buckle.', 17.99, 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80&auto=format&fit=crop', 95, 'dog'],
  ['Accessories', 'Cat Harness & Leash', 'Comfortable harness with matching leash for safe walks.', 21.99, 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800&q=80&auto=format&fit=crop', 60, 'cat'],
  ['Accessories', 'Stainless Pet Bowl', 'Rust-proof stainless steel bowl with anti-slip base.', 13.99, 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80&auto=format&fit=crop', 140, 'dog'],
  ['Accessories', 'Small Pet Carrier', 'Ventilated carrier for small cats, with a soft liner and shoulder strap.', 45.99, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80&auto=format&fit=crop', 25, 'cat'],

  ['Hygiene', 'Clumping Cat Litter', 'Odour-controlling clumping litter, low dust and easy to scoop.', 23.99, 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&q=80&auto=format&fit=crop', 75, 'cat'],
  ['Hygiene', 'Gentle Dog Shampoo', 'pH-balanced oat shampoo for sensitive skin, no harsh chemicals.', 15.99, 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=800&q=80&auto=format&fit=crop', 88, 'dog'],
  ['Hygiene', 'Pet Grooming Brush', 'Dual-sided grooming brush that removes loose fur and tangles.', 11.49, 'https://images.unsplash.com/photo-1560053608-13721e0d69e8?w=800&q=80&auto=format&fit=crop', 105, 'dog'],
  ['Hygiene', 'Bird Cage Liner', 'Absorbent paper liner sheets that keep the cage fresh and clean.', 9.99, 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=800&q=80&auto=format&fit=crop', 70, 'bird'],

  ['Health & Care', 'Dog Joint Supplement', 'Glucosamine and chondroitin chews for healthy joints.', 27.99, 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=800&q=80&auto=format&fit=crop', 50, 'dog'],
  ['Health & Care', 'Cat Hairball Paste', 'Palatable malt paste that helps prevent hairballs.', 13.49, 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=800&q=80&auto=format&fit=crop', 62, 'cat'],
  ['Health & Care', 'Flea & Tick Spray', 'Vet-grade spray for dogs that repels fleas, ticks and mosquitoes.', 19.49, 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&q=80&auto=format&fit=crop', 45, 'dog'],

  ['Beds & Comfort', 'Orthopedic Dog Bed', 'Memory foam bed with washable cover for joint support.', 59.99, 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80&auto=format&fit=crop', 30, 'dog'],
  ['Beds & Comfort', 'Cozy Cat Cave Bed', 'Snuggly cave-shaped bed that keeps cats warm and secure.', 34.99, 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop', 40, 'cat'],
]

// [name, address, phone, email, website, latitude, longitude]
const CLINICS = [
  ['Paws & Claws Veterinary Clinic', '1420 Maple Avenue, Austin, TX 78701', '(512) 555-0142', 'hello@pawscandclaws.example', 'https://www.pawscandclaws.example', 30.2672, -97.7431],
  ['Green Valley Animal Hospital', '88 Orchard Lane, Portland, OR 97205', '(503) 555-0178', 'care@greenvalley.example', 'https://www.greenvalley.example', 45.5231, -122.6765],
  ['Lakeside Pet Care Center', '5 Harborview Drive, Chicago, IL 60601', '(312) 555-0196', 'hello@lakesidepetcare.example', 'https://www.lakesidepetcare.example', 41.8781, -87.6298],
  ['Blue Oak Veterinary Group', '412 Cedar Street, Denver, CO 80202', '(720) 555-0134', 'team@blueoak.example', 'https://www.blueoakvet.example', 39.7392, -104.9903],
  ['Sunny Meadows Animal Clinic', '27 Meadowbrook Road, Raleigh, NC 27601', '(919) 555-0117', 'care@sunnymeadows.example', 'https://www.sunnymeadows.example', 35.7796, -78.6382],
  ['CityPaws Veterinary Hospital', '900 Market Street, San Francisco, CA 94102', '(415) 555-0129', 'hello@citypaws.example', 'https://www.citypaws.example', 37.7749, -122.4194],
  ['Hearth & Home Vet Clinic', '61 Elmwood Avenue, Nashville, TN 37203', '(615) 555-0153', 'hello@hearthandhome.example', 'https://www.hearthandhome.example', 36.1627, -86.7816],
  ['Harborview Animal Clinic', '340 Bay Street, Seattle, WA 98101', '(206) 555-0181', 'care@harborview.example', 'https://www.harborview.example', 47.6062, -122.3321],
]

// [clinicName, name, specialty, bio, avatar_url, license_number]
const VETS = [
  ['Paws & Claws Veterinary Clinic', 'Dr. Maya Chen', 'general practice', 'General practice veterinarian focused on preventive wellness and everyday care for dogs and cats.', 'https://i.pravatar.cc/300?img=47', 'TX-48201'],
  ['Paws & Claws Veterinary Clinic', 'Dr. Daniel Okafor', 'surgery', 'Soft-tissue and orthopedic surgeon with a gentle, low-stress approach to surgical recovery.', 'https://i.pravatar.cc/300?img=12', 'TX-48202'],
  ['Paws & Claws Veterinary Clinic', 'Dr. Sofia Ramirez', 'dentistry', 'Veterinary dentistry including cleanings, extractions and oral-health education.', 'https://i.pravatar.cc/300?img=45', 'TX-48203'],
  ['Green Valley Animal Hospital', 'Dr. Emily Watson', 'internal medicine', 'Internal medicine specialist with a focus on chronic conditions and diagnostic workups.', 'https://i.pravatar.cc/300?img=44', 'OR-61203'],
  ['Green Valley Animal Hospital', 'Dr. James Park', 'cardiology', 'Cardiology consultations, echocardiography and long-term cardiac care for pets.', 'https://i.pravatar.cc/300?img=13', 'OR-61204'],
  ['Lakeside Pet Care Center', 'Dr. Rachel Kim', 'preventive care', 'Preventive medicine, vaccinations and wellness plans tailored to each pet.', 'https://i.pravatar.cc/300?img=49', 'IL-77301'],
  ['Lakeside Pet Care Center', 'Dr. Michael Torres', 'emergency & critical care', 'Emergency and critical care for urgent cases, available for same-day triage.', 'https://i.pravatar.cc/300?img=14', 'IL-77302'],
  ['Blue Oak Veterinary Group', 'Dr. Sarah Mitchell', 'dermatology', 'Dermatology services for allergies, skin and ear conditions.', 'https://i.pravatar.cc/300?img=48', 'CO-92501'],
  ['Blue Oak Veterinary Group', 'Dr. David Nguyen', 'behavior', 'Behavior consultations to help pets and their people build better routines.', 'https://i.pravatar.cc/300?img=15', 'CO-92502'],
  ['Sunny Meadows Animal Clinic', 'Dr. Laura Bennett', 'general practice', 'Compassionate general practice care with a special interest in senior pets.', 'https://i.pravatar.cc/300?img=43', 'NC-33601'],
  ['Sunny Meadows Animal Clinic', 'Dr. Chris Evans', 'ophthalmology', 'Eye care including exams, treatment of common conditions and post-operative checks.', 'https://i.pravatar.cc/300?img=16', 'NC-33602'],
  ['CityPaws Veterinary Hospital', 'Dr. Anita Desai', 'exotic animal medicine', 'Care for small mammals, birds and reptiles, from wellness visits to urgent concerns.', 'https://i.pravatar.cc/300?img=46', 'CA-94101'],
  ['CityPaws Veterinary Hospital', 'Dr. Robert Hughes', 'oncology', 'Oncology consultations and supportive treatment planning for pets with cancer.', 'https://i.pravatar.cc/300?img=17', 'CA-94102'],
  ['Hearth & Home Vet Clinic', 'Dr. Grace Thompson', 'general practice', 'Neighborhood general practice for dogs and cats, with a focus on family-centered care.', 'https://i.pravatar.cc/300?img=50', 'TN-37201'],
  ['Hearth & Home Vet Clinic', 'Dr. Omar Farouk', 'surgery', 'Routine and advanced surgical procedures with thorough pre- and post-operative care.', 'https://i.pravatar.cc/300?img=18', 'TN-37202'],
  ['Harborview Animal Clinic', 'Dr. Jessica Lane', 'emergency & critical care', 'Emergency medicine and intensive care, including after-hours stabilization.', 'https://i.pravatar.cc/300?img=42', 'WA-98101'],
  ['Harborview Animal Clinic', 'Dr. Kevin Brooks', 'preventive care', 'Wellness exams, parasite prevention and nutrition guidance for every life stage.', 'https://i.pravatar.cc/300?img=19', 'WA-98102'],
]

/** Insert only the rows whose `name` is not in the collection yet. */
async function insertMissing(Model, label, rows) {
  const existing = new Set(
    (await Model.find({}, 'name').lean()).map((doc) => doc.name),
  )
  const fresh = rows.filter((row) => !existing.has(row.name))
  if (fresh.length > 0) await Model.insertMany(fresh)
  console.log(`  ${label}: ${fresh.length} qo'shildi, ${rows.length - fresh.length} allaqachon bor`)
}

async function seed() {
  await connectDB()

  await insertMissing(
    Category,
    'Kategoriyalar',
    CATEGORIES.map(([name, slug, description]) => ({ name, slug, description })),
  )

  const categoryIdByName = new Map(
    (await Category.find({}, 'name').lean()).map((doc) => [doc.name, doc._id]),
  )
  const missingCategory = PRODUCTS.find(([categoryName]) => !categoryIdByName.has(categoryName))
  if (missingCategory) {
    throw new Error(`Seed to'xtatildi: "${missingCategory[0]}" kategoriyasi topilmadi.`)
  }

  await insertMissing(
    Product,
    'Mahsulotlar',
    PRODUCTS.map(([categoryName, name, description, price, image_url, stock, species]) => ({
      category_id: categoryIdByName.get(categoryName),
      name,
      description,
      price,
      image_url,
      stock,
      species,
      is_active: true,
    })),
  )

  await insertMissing(
    Clinic,
    'Klinikalar',
    CLINICS.map(([name, address, phone, email, website, latitude, longitude]) => ({
      name,
      address,
      phone,
      email,
      website,
      latitude,
      longitude,
    })),
  )

  const clinicIdByName = new Map(
    (await Clinic.find({}, 'name').lean()).map((doc) => [doc.name, doc._id]),
  )
  const missingClinic = VETS.find(([clinicName]) => !clinicIdByName.has(clinicName))
  if (missingClinic) {
    throw new Error(`Seed to'xtatildi: "${missingClinic[0]}" klinikasi topilmadi.`)
  }

  await insertMissing(
    Veterinarian,
    'Shifokorlar',
    VETS.map(([clinicName, name, specialty, bio, avatar_url, license_number]) => ({
      clinic_id: clinicIdByName.get(clinicName),
      name,
      specialty,
      bio,
      avatar_url,
      license_number,
    })),
  )

  console.log('✅ Seed tugadi.')
}

try {
  await seed()
} catch (error) {
  console.error('❌ Seed xatosi:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
