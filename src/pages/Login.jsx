import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthErrorMessage } from '../lib/authErrors.js'
import AuthLayout from '../components/AuthLayout.jsx'
import PageLoader from '../components/PageLoader.jsx'
import {
  AlertIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from '../components/Icons.jsx'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where the user was headed before being asked to sign in (if any).
  const from = location.state?.from?.pathname || '/dashboard'
  // Optional notice explaining why sign-in was requested (e.g. favorites)
  const notice = location.state?.notice

  if (loading) {
    return <PageLoader label="Restoring your session…" />
  }

  // Already signed in → leave the auth pages immediately.
  if (user) {
    return <Navigate to={from} replace />
  }

  const validate = () => {
    const errors = {}
    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (!password) {
      errors.password = 'Password is required.'
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
      const { error } = await signIn(email.trim(), password)
      if (error) {
        setFormError(getAuthErrorMessage(error))
      }
      // On success, AuthContext updates `user`, which triggers the
      // <Navigate> redirect above.
    } catch (err) {
      console.error('[Login] Unexpected sign-in error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your pets, appointments and more."
    >
      {notice && (
        <div role="status" className="mb-6 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {formError && (
        <div role="alert" className="form-banner--error mb-6">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-email"
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
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
          {fieldErrors.password && (
            <p className="field-error">{fieldErrors.password}</p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to VetAnimals?{' '}
        <Link
          to="/register"
          className="font-semibold text-emerald-700 transition hover:text-emerald-800"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
