import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthErrorMessage } from '../lib/authErrors.js'
import AuthLayout from '../components/AuthLayout.jsx'
import { AlertIcon, ArrowLeftIcon, CheckCircleIcon, MailIcon } from '../components/Icons.jsx'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export default function ForgotPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFieldError('')

    const value = email.trim()
    if (!value) {
      setFieldError('Email address is required.')
      return
    }
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await resetPassword(value)
      if (error) {
        // Supabase intentionally returns a success response for unknown
        // emails, so a surfaced error here is a configuration problem.
        setFormError(getAuthErrorMessage(error, 'We could not send the reset email. Please try again.'))
        return
      }
      setSent(true)
    } catch (err) {
      console.error('[ForgotPassword] Unexpected error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="Your reset link is on its way.">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircleIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Reset link sent</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            If an account exists for <span className="font-semibold text-slate-700">{email.trim()}</span>,
            we emailed a password reset link. Click it to choose a new password.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Didn&apos;t receive it? Check your spam folder, or try again in a minute.
          </p>
          <Link to="/login" className="btn-primary mt-8 w-full">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to create a new one."
    >
      {formError && (
        <div role="alert" className="form-banner--error mb-6">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="form-label">
            Email address
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`input-field pl-10 ${fieldError ? 'input-field--error' : ''}`}
            />
          </div>
          {fieldError && <p className="field-error">{fieldError}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
              Sending link…
            </>
          ) : (
            'Send reset link'
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
