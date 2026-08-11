// ---------------------------------------------------------------------------
// confirm-payment — Supabase Edge Function (Deno)
//
// Client-side fallback for confirming an order after Stripe's Payment Element
// reports success. Unlike the webhook this works without a public webhook
// URL (great for local dev), while remaining secure: the PaymentIntent status
// is re-verified directly with Stripe's API — the browser can never claim a
// payment that didn't actually succeed.
//
// For production, prefer the stripe-webhook function; this one is a
// convenient complement that also covers interrupted webhook delivery.
//
// Secrets:
//   STRIPE_SECRET_KEY — Stripe secret key
// ---------------------------------------------------------------------------
import Stripe from 'npm:stripe@17.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.')
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return json({ error: 'Authentication required.' }, 401, corsHeaders)
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return json({ error: 'orderId is required.' }, 400, corsHeaders)
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, payment_intent_id')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError || !order) {
      return json({ error: 'Order not found.' }, 404, corsHeaders)
    }
    if (order.user_id !== user.id) {
      return json({ error: 'You can only confirm your own orders.' }, 403, corsHeaders)
    }
    if (order.status === 'paid') {
      return json({ status: 'paid' }, 200, corsHeaders)
    }
    if (order.status !== 'pending') {
      return json({ error: 'This order can no longer be paid.' }, 400, corsHeaders)
    }

    // Re-verify with Stripe: the PaymentIntent must actually be succeeded.
    if (!order.payment_intent_id) {
      return json({ error: 'No payment was started for this order.' }, 400, corsHeaders)
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent_id)
    if (paymentIntent.status !== 'succeeded') {
      return json(
        { error: `Payment is not complete (status: ${paymentIntent.status}).` },
        400,
        corsHeaders,
      )
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid', payment_intent_id: paymentIntent.id })
      .eq('id', order.id)
    if (updateError) {
      console.error('[confirm-payment] Failed to update order:', updateError.message)
      return json({ error: 'Could not confirm the order.' }, 500, corsHeaders)
    }

    return json({ status: 'paid' }, 200, corsHeaders)
  } catch (err) {
    console.error('[confirm-payment] Error:', err)
    return json({ error: 'Could not confirm the payment. Please try again.' }, 500, corsHeaders)
  }
})

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
