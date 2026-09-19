// ---------------------------------------------------------------------------
// The Express application — routes and middleware only, no listening.
//
// Two things start it:
//   server/index.js  — local development: connects, then listens on a port.
//   api/index.js     — Vercel: connects per invocation, exports the app as the
//                      serverless handler. A serverless function must never
//                      call listen(), which is why that call lives elsewhere.
// ---------------------------------------------------------------------------
import express from 'express'
import cors from 'cors'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import categoryRoutes from './routes/categories.js'
import clinicRoutes from './routes/clinics.js'
import vetRoutes from './routes/vets.js'
import petRoutes from './routes/pets.js'
import appointmentRoutes from './routes/appointments.js'
import favoriteRoutes from './routes/favorites.js'
import orderRoutes from './routes/orders.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/clinics', clinicRoutes)
app.use('/api/veterinarians', vetRoutes)
app.use('/api/pets', petRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/orders', orderRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
