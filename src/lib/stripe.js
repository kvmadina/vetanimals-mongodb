// ---------------------------------------------------------------------------
// Stripe client helpers.
//
// The publishable key is public by design and safe for the browser; the
// secret key only ever lives in the Supabase Edge Function environment.
// Everything sensitive (creating/verifying PaymentIntents, marking orders
// paid) happens server-side through supabase.functions.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

/** Stripe publishable key from Vite env (VITE_STRIPE_PUBLISHABLE_KEY). */
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

/** True when the publishable key is configured, i.e. payments are available. */
export const isStripeConfigured = Boolean(STRIPE_PUBLISHABLE_KEY)

/**
 * Ask the create-payment-intent Edge Function to start a payment for an order.
 * @param {string} orderId
 * @returns {Promise<{ clientSecret: string }>}
 */
export async function createPaymentIntent(orderId) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { orderId },
  })
  if (error) throw new Error(error.message || 'Could not start the payment.')
  return data
}

/**
 * Ask the confirm-payment Edge Function to verify the PaymentIntent with
 * Stripe and mark the order paid.
 * @param {string} orderId
 * @returns {Promise<{ status: string }>}
 */
export async function confirmOrderPayment(orderId) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: { orderId },
  })
  if (error) throw new Error(error.message || 'Could not confirm the payment.')
  return data
}

/** Friendly message for a client-side Stripe/PaymentElement error. */
export function getStripeErrorMessage(error, fallback = 'Payment could not be completed.') {
  if (!error) return ''
  const raw = String(error.message || error.error?.message || '')
  if (/network|failed to fetch|fetch failed|load failed/i.test(raw)) {
    return 'Unable to reach the payment service. Please check your internet connection and try again.'
  }
  return raw || fallback
}
