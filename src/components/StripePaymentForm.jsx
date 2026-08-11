import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  STRIPE_PUBLISHABLE_KEY,
  confirmOrderPayment,
  createPaymentIntent,
  getStripeErrorMessage,
} from '../lib/stripe.js'
import { formatPrice } from '../lib/shop.js'
import { AlertIcon, CheckCircleIcon, LockIcon } from './Icons.jsx'

// Never call loadStripe with an empty key — this module is statically
// imported by Checkout, so guard the call to avoid a CDN request + console
// error when Stripe isn't configured.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

/**
 * Card payment step shown after an order is created (status 'pending').
 * Creates the PaymentIntent via the Edge Function, renders Stripe's Payment
 * Element, and on success asks the confirm-payment Edge Function to verify
 * the intent with Stripe and mark the order 'paid'.
 *
 * @param {{ orderId: string, total: number, onPaid: () => void }}
 */
export default function StripePaymentForm({ orderId, total, onPaid }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [intentStatus, setIntentStatus] = useState('loading') // loading | error | ready
  const [intentError, setIntentError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let active = true
    setIntentStatus('loading')
    createPaymentIntent(orderId)
      .then((data) => {
        if (!active) return
        if (data.alreadyPaid) {
          // The order was already paid (e.g. the user paid in another tab).
          onPaid()
          return
        }
        setClientSecret(data.clientSecret)
        setIntentStatus('ready')
      })
      .catch((err) => {
        console.error('[StripePaymentForm] Failed to start payment:', err)
        if (!active) return
        setIntentError(
          getStripeErrorMessage(err, 'We could not start the payment. Please try again.'),
        )
        setIntentStatus('error')
      })
    return () => {
      active = false
    }
  }, [orderId, onPaid])

  // Payments not configured — Checkout only renders this component when
  // isStripeConfigured, so this is a defensive no-op. Hooks must stay above.
  if (!stripePromise) {
    return null
  }

  if (intentStatus === 'loading') {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-400">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
          aria-hidden="true"
        />
        Preparing secure payment…
      </div>
    )
  }

  if (intentStatus === 'error' || !clientSecret) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-sm font-semibold text-amber-900">Payment could not be started</p>
        <p className="mt-1 text-sm text-amber-800">{intentError}</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-700">
          Your order is saved as pending — you have not been charged. If this
          keeps happening, contact support.
        </p>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardForm orderId={orderId} total={total} onPaid={onPaid} submitError={submitError} setSubmitError={setSubmitError} submitting={submitting} setSubmitting={setSubmitting} />
    </Elements>
  )
}

function CardForm({ orderId, total, onPaid, submitError, setSubmitError, submitting, setSubmitting }) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/orders` },
        redirect: 'if_required',
      })

      if (confirmError) {
        setSubmitError(
          getStripeErrorMessage(confirmError, 'The card was declined. Please try a different payment method.'),
        )
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        // Server-side verification via the Edge Function, then mark paid.
        await confirmOrderPayment(orderId)
        onPaid()
      }
    } catch (err) {
      console.error('[CardForm] Payment failed:', err)
      setSubmitError(getStripeErrorMessage(err, 'Payment could not be completed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PaymentElement />
      </div>

      {submitError && (
        <div role="alert" className="form-banner--error">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
            Processing payment…
          </>
        ) : (
          <>
            <LockIcon className="h-4 w-4" />
            Pay {formatPrice(total)}
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <LockIcon className="h-3.5 w-3.5" />
        Secure payment powered by Stripe — your order is confirmed the moment
        payment succeeds.
      </p>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-emerald-700">
        <CheckCircleIcon className="h-3.5 w-3.5" />
        Your order is already placed — this step only processes the payment.
      </p>
    </form>
  )
}
