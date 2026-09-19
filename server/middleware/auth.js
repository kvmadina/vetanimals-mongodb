// ---------------------------------------------------------------------------
// JWT authentication.
//
// Supabase enforced access with row-level security inside the database. Here
// the guard is explicit: requireAuth puts the caller on req.user, and every
// route that touches user-owned data filters by req.user.id itself.
// ---------------------------------------------------------------------------
import jwt from 'jsonwebtoken'
import { Profile } from '../models/Profile.js'
import { forbidden, route, unauthorized } from './errorHandler.js'

const TOKEN_TTL = '7d'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set — add it to .env before starting the server.')
  }
  return secret
}

/** Issue a signed token for a profile document. */
export function signToken(profile) {
  return jwt.sign({ sub: profile.id, role: profile.role }, getSecret(), {
    expiresIn: TOKEN_TTL,
  })
}

/** Reject the request unless it carries a valid Bearer token. */
export const requireAuth = route(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw unauthorized()

  let payload
  try {
    payload = jwt.verify(token, getSecret())
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.')
  }

  // Read the role from the database, not the token: a role changed after the
  // token was issued must take effect immediately.
  const profile = await Profile.findById(payload.sub)
  if (!profile) throw unauthorized('Your account no longer exists.')

  req.user = profile
  next()
})

/** Reject the request unless the caller holds one of the given roles. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (!roles.includes(req.user.role)) return next(forbidden())
    next()
  }
}

/**
 * Attach req.user when a valid token is present, but never reject.
 * Used by endpoints that are public yet behave differently when signed in.
 */
export const optionalAuth = route(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(header.slice(7), getSecret())
    req.user = await Profile.findById(payload.sub)
  } catch {
    // An invalid token on a public route is simply "not signed in".
  }
  next()
})
