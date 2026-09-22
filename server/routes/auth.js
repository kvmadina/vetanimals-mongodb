// ---------------------------------------------------------------------------
// Authentication: register, sign in, read/update the signed-in profile.
//
// `role` is never taken from the request body — a new account is always a
// plain 'user'. This replaces the handle_new_user() / profile-integrity
// triggers that used to enforce it inside Postgres.
// ---------------------------------------------------------------------------
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Profile } from '../models/Profile.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { ApiError, badRequest, route } from '../middleware/errorHandler.js'

const router = Router()

const MIN_PASSWORD_LENGTH = 6

router.post(
  '/register',
  route(async (req, res) => {
    const { email, password, full_name, phone } = req.body

    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      throw badRequest(
        `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        'weak_password',
      )
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (await Profile.exists({ email: normalizedEmail })) {
      throw new ApiError(
        409,
        'An account with this email already exists. Try signing in instead.',
        'user_already_exists',
      )
    }

    const profile = await Profile.create({
      email: normalizedEmail,
      password_hash: await bcrypt.hash(String(password), 10),
      full_name: full_name || '',
      phone: phone || null,
      // role intentionally omitted — the schema default ('user') wins.
    })

    res.status(201).json({ token: signToken(profile), profile })
  }),
)

router.post(
  '/login',
  route(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')

    // password_hash has select:false, so ask for it explicitly.
    const profile = await Profile.findOne({ email }).select('+password_hash')

    // Same message whether the email is unknown or the password is wrong —
    // otherwise this endpoint tells an attacker which emails are registered.
    const invalid = new ApiError(
      401,
      'The email or password you entered is incorrect. Please try again.',
      'invalid_credentials',
    )
    if (!profile) throw invalid
    if (!(await bcrypt.compare(password, profile.password_hash))) throw invalid

    profile.password_hash = undefined
    res.json({ token: signToken(profile), profile })
  }),
)

router.get(
  '/me',
  requireAuth,
  route(async (req, res) => {
    res.json({ profile: req.user })
  }),
)

/**
 * Update the signed-in user's own profile.
 * Only these three fields are writable: role and email changes would be
 * privilege escalation, so they are simply not read from the body.
 */
router.patch(
  '/me',
  requireAuth,
  route(async (req, res) => {
    const patch = {}
    for (const field of ['full_name', 'phone', 'avatar_url']) {
      if (field in req.body) patch[field] = req.body[field]
    }
    if (Object.keys(patch).length === 0) throw badRequest('Nothing to update.', 'empty-update')

    const profile = await Profile.findByIdAndUpdate(req.user.id, patch, {
      returnDocument: 'after',
      runValidators: true,
    })
    res.json({ profile })
  }),
)

/**
 * Change the signed-in user's password.
 * The current password must be proved here, not just on the client: a stolen
 * token must not be enough to lock the real owner out of their account.
 */
router.patch(
  '/password',
  requireAuth,
  route(async (req, res) => {
    const currentPassword = String(req.body.current_password || '')
    const password = String(req.body.password || '')

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw badRequest(
        `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        'weak_password',
      )
    }

    const profile = await Profile.findById(req.user.id).select('+password_hash')
    if (!(await bcrypt.compare(currentPassword, profile.password_hash))) {
      throw new ApiError(401, 'Your current password is incorrect.', 'invalid_current_password')
    }
    // The current password is already known to match the stored hash, so this
    // comparison is the same test as re-hashing the new one.
    if (currentPassword === password) {
      throw badRequest('New password must be different from your current password.', 'same_password')
    }

    profile.password_hash = await bcrypt.hash(password, 10)
    await profile.save()
    res.json({ ok: true })
  }),
)

export default router
