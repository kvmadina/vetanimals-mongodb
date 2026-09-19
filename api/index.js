// ---------------------------------------------------------------------------
// Vercel serverless entry point.
//
// Vercel turns every file in api/ into a function. vercel.json rewrites all
// /api/* traffic here, so this one function serves the whole Express app —
// which keeps routing in one place instead of splitting it across files.
//
// Unlike server/index.js there is no listen(): Vercel hands the function a
// request and expects it to answer, not to own a port.
// ---------------------------------------------------------------------------
import app from '../server/app.js'
import { connectDB } from '../server/db.js'

export default async function handler(req, res) {
  try {
    // Cached inside db.js, so this is a real connection only on a cold start.
    await connectDB()
  } catch (error) {
    // Tell the client the database is unreachable rather than letting every
    // route fail with a confusing 500.
    console.error('[api] MongoDB connection failed:', error)
    return res.status(503).json({
      error: 'The database is unavailable right now. Please try again shortly.',
      code: 'db-unavailable',
    })
  }

  return app(req, res)
}
