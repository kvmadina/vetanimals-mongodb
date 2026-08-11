import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthErrorMessage } from '../lib/authErrors.js'
import AuthLayout from '../components/AuthLayout.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { AlertIcon, ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeOffIcon, LockIcon } from '../components/Icons.jsx'

export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // `loading` stays true until AuthContext's getSession() resolves, which
  // includes the PKCE token exchange for the recovery link. So once loading
  // is false, `user` tells us definitively whether a (recovery) session
  // exists — no timers or guesswork needed.
  if (loading) {
    return <PageLoader label="Checking your reset link…" />
  }

  if (!user) {
    return (
      <AuthLayout title="Link not recognised" subtitle="We couldn't verify that reset link.">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">
            This link is invalid or expired
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Reset links only work once and expire after a short time. Request a
            fresh link and try again.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-8 w-full">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="Your new password is active.">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircleIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">All set!</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            You can now sign in with your new password.
          </p>
          <Link to="/login" className="btn-primary mt-8 w-full">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const errors = {}
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const { error } = await updatePassword(password)
      if (error) {
        setFormError(getAuthErrorMessage(error, 'We could not update your password. Please try again.'))
        return
      }
      setDone(true)
    } catch (err) {
      console.error('[ResetPassword] Unexpected error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick a strong password for your account.">
      {formError && (
        <div role="alert" className="form-banner--error mb-6">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-password" className="form-label">
            New password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reset-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`input-field pl-10 pr-11 ${fieldErrors.password ? 'input-field--error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
        </div>

        <div>
          <label htmlFor="reset-confirm-password" className="form-label">
            Confirm new password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`input-field pl-10 pr-11 ${fieldErrors.confirmPassword ? 'input-field--error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Updating password…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 transition hover:text-emerald-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
