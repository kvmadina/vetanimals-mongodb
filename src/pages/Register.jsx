import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthErrorMessage } from '../lib/authErrors.js'
import AuthLayout from '../components/AuthLayout.jsx'
import PageLoader from '../components/PageLoader.jsx'
import {
  AlertIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../components/Icons.jsx'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const PHONE_PATTERN = /^[+()\-.\s\d]{7,20}$/

export default function Register() {
  const { user, loading, signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <PageLoader label="Restoring your session…" />
  }

  // Already signed in → leave the auth pages immediately.
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const validate = () => {
    const errors = {}
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.'
    }
    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
      errors.phone = 'Enter a valid phone number, e.g. +1 (555) 000-0000.'
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      // Registration signs the account straight in — the API returns a token
      // with the new profile, so AuthContext updates `user` and the
      // <Navigate> above redirects. There is no email-confirmation step.
      const { error } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        phone.trim(),
      )
      if (error) {
        setFormError(getAuthErrorMessage(error))
      }
    } catch (err) {
      console.error('[Register] Unexpected sign-up error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join VetAnimals and start caring for your pets in one place."
    >
      {formError && (
        <div role="alert" className="form-banner--error mb-6">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="register-name" className="form-label">
            Full name
          </label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="register-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className={`input-field pl-10 ${
                fieldErrors.fullName ? 'input-field--error' : ''
              }`}
            />
          </div>
          {fieldErrors.fullName && (
            <p className="field-error">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="register-email" className="form-label">
            Email address
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`input-field pl-10 ${
                fieldErrors.email ? 'input-field--error' : ''
              }`}
            />
          </div>
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="register-phone" className="form-label">
            Phone number <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="register-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={`input-field pl-10 ${
                fieldErrors.phone ? 'input-field--error' : ''
              }`}
            />
          </div>
          {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`input-field pl-10 pr-11 ${
                fieldErrors.password ? 'input-field--error' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="field-error">{fieldErrors.password}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">
              At least 6 characters.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`input-field pl-10 pr-11 ${
                fieldErrors.confirmPassword ? 'input-field--error' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="field-error">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-emerald-700 transition hover:text-emerald-800"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
