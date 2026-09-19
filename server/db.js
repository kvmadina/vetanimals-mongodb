// ---------------------------------------------------------------------------
// MongoDB connection.
//
// The URI comes from MONGODB_URI — never hardcode credentials here.
//
// The connection is cached on globalThis because serverless invocations reuse
// the same container: without the cache every request would open a new
// connection and exhaust the Atlas connection limit within minutes. Locally
// the cache simply means connectDB() is a no-op after the first call.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose'

const cache = (globalThis.__vetanimalsMongoose ??= { promise: null })

export async function connectDB() {
  if (cache.promise) return cache.promise

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      'MONGODB_URI topilmadi. Lokalda — loyiha ildizidagi .env fayliga qo\'shing; ' +
        'Vercel\'da — Project Settings → Environment Variables bo\'limiga.',
    )
  }

  cache.promise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 5000,
      // One connection per container is plenty: a serverless invocation
      // handles a single request at a time.
      maxPoolSize: 10,
    })
    .then((connection) => {
      console.log('✅ MongoDB ulandi, baza:', mongoose.connection.name)
      return connection
    })
    .catch((error) => {
      // Clear the cache so the next invocation retries instead of replaying a
      // rejected promise forever.
      cache.promise = null
      throw error
    })

  return cache.promise
}
