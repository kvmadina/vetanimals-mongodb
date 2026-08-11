// ---------------------------------------------------------------------------
// stripe-webhook — Supabase Edge Function (Deno)
//
// Production-grade payment confirmation. Stripe calls this endpoint when
// payment events happen; on payment_intent.succeeded the matching order is
// marked 'paid' using the service-role client (bypasses RLS — never do this
// from the browser).
//
// Secrets:
//   STRIPE_SECRET_KEY           — Stripe secret key
//   STRIPE_WEBHOOK_SIGNING_SECRET — whsec_... from the Stripe dashboard
//
// Point the Stripe dashboard webhook at:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// ---------------------------------------------------------------------------
import Stripe from 'npm:stripe@17.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')
if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SIGNING_SECRET.')
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 })
  }

  let event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const orderId = paymentIntent.metadata?.order_id

      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'paid', payment_intent_id: paymentIntent.id })
          .eq('id', orderId)
        if (error) {
          console.error('[stripe-webhook] Failed to update order:', error.message)
          return new Response('Failed to update order.', { status: 500 })
        }
        console.log(`[stripe-webhook] Order ${orderId} marked paid.`)
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    return new Response('Webhook handler error.', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
