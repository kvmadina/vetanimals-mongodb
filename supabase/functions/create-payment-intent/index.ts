// ---------------------------------------------------------------------------
// create-payment-intent — Supabase Edge Function (Deno)
//
// Creates a Stripe PaymentIntent for an order and stores the intent id on the
// order row (orders.payment_intent_id). The client confirms the PaymentIntent
// with Stripe's Payment Element using the returned client_secret.
//
// Secrets (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY   — Stripe secret key (sk_test_... or sk_live_...)
//
// The function is called with the Supabase JWT (supabase.functions.invoke
// attaches it automatically) so we can verify the order belongs to the caller.
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
    // --- Authenticate the caller -------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return json({ error: 'Authentication required.' }, 401, corsHeaders)
    }

    // --- Validate the request body -----------------------------------------
    const { orderId } = await req.json()
    if (!orderId) {
      return json({ error: 'orderId is required.' }, 400, corsHeaders)
    }

    // --- Load the order and verify ownership -------------------------------
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, payment_intent_id')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError || !order) {
      return json({ error: 'Order not found.' }, 404, corsHeaders)
    }
    if (order.user_id !== user.id) {
      return json({ error: 'You can only pay for your own orders.' }, 403, corsHeaders)
    }
    if (order.status !== 'pending') {
      return json({ error: 'Only pending orders can be paid.' }, 400, corsHeaders)
    }

    // --- Reuse an existing PaymentIntent if one exists ---------------------
    // Never create a second intent for the same order: if the stored intent is
    // awaiting payment, return its client_secret; if it already succeeded or
    // is processing, surface that instead of risking a duplicate charge.
    if (order.payment_intent_id) {
      const existing = await stripe.paymentIntents.retrieve(order.payment_intent_id)
      if (existing && existing.status === 'requires_payment_method') {
        return json({ clientSecret: existing.client_secret }, 200, corsHeaders)
      }
      if (existing && (existing.status === 'succeeded' || existing.status === 'processing')) {
        // Mark the order paid here — the confirm-payment/webhook path may
        // have been missed (e.g. webhook delivery failed).
        await supabase
          .from('orders')
          .update({ status: 'paid', payment_intent_id: existing.id })
          .eq('id', order.id)
        return json({ clientSecret: existing.client_secret, alreadyPaid: true }, 200, corsHeaders)
      }
    }

    // --- Create the PaymentIntent ------------------------------------------
    const amount = Math.round(Number(order.total_amount) * 100) // cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { order_id: order.id },
    })

    // Persist the intent id on the order for reconciliation.
    await supabase
      .from('orders')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', order.id)

    return json({ clientSecret: paymentIntent.client_secret }, 200, corsHeaders)
  } catch (err) {
    console.error('[create-payment-intent] Error:', err)
    return json({ error: 'Could not start the payment. Please try again.' }, 500, corsHeaders)
  }
})

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
