// ---------------------------------------------------------------------------
// Orders data layer.
// Backed by public.orders + public.order_items through the shared Supabase
// client. RLS guarantees users only ever see, create and cancel their own
// orders, and only pending orders can be cancelled (pending -> cancelled).
// NOTE: the database has no stock-reservation trigger, so nothing here claims
// stock is reserved — quantities are only validated against current stock.
// ---------------------------------------------------------------------------
import { supabase } from './supabase'

const ORDER_SELECT = `
  id,
  user_id,
  created_at,
  status,
  total_amount,
  shipping_address,
  order_items (
    id,
    quantity,
    price_at_purchase,
    products ( id, name, image_url )
  )
`

// Admin listing also resolves the customer (profiles) for each order.
const ADMIN_ORDER_SELECT = `
  id,
  created_at,
  status,
  total_amount,
  shipping_address,
  profiles ( id, full_name, email ),
  order_items (
    id,
    quantity,
    price_at_purchase,
    products ( id, name, image_url )
  )
`

/** All valid order statuses (matches the database CHECK constraint). */
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'completed']

/**
 * Sensible workflow transitions per status. The database itself permits any
 * status change for admins; this map is a UX guard to prevent nonsensical
 * jumps (e.g. pending -> completed). Cancelled/completed are terminal.
 */
export const NEXT_ORDER_STATUSES = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
}

/**
 * Fetch the authenticated user's orders, newest first.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchMyOrders(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single order belonging to the user, with its items.
 * @param {string} userId
 * @param {string} orderId
 * @returns {Promise<object|null>} null when not found / not owned
 */
export async function fetchOrderById(userId, orderId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Create an order plus its order_items in one logical flow.
 *
 * Prices MUST come from a fresh Supabase fetch of current product prices —
 * this function never trusts client-side cart prices. The total_amount is
 * recalculated here from price_at_purchase x quantity so the stored total
 * always matches the database-backed line prices.
 *
 * If the order_items insert fails, the error is rethrown with `orderCreated`
 * set to true so the caller can be honest that the order was not completed.
 *
 * @param {string} userId
 * @param {{
 *   shippingAddress: string,
 *   lines: Array<{ product_id: string, quantity: number, price_at_purchase: number }>,
 * }} input
 * @returns {Promise<object>} the created order
 */
export async function createOrder(userId, { shippingAddress, lines }) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const total = lines.reduce(
    (sum, line) => sum + Number(line.price_at_purchase) * Number(line.quantity),
    0,
  )

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      total_amount: Math.round(total * 100) / 100,
      shipping_address: shippingAddress,
    })
    .select('id, created_at, status, total_amount, shipping_address')
    .single()
  if (orderError) throw orderError

  if (lines.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        price_at_purchase: Number(line.price_at_purchase),
      })),
    )
    if (itemsError) {
      const err = new Error(itemsError.message)
      err.code = itemsError.code
      err.orderCreated = true
      throw err
    }
  }

  return order
}

/**
 * Cancel a pending order. RLS only permits the owner to flip a pending order
 * to cancelled, so non-pending orders resolve to `data: null` here and are
 * reported as "can no longer be cancelled".
 * @param {string} userId
 * @param {string} orderId
 * @returns {Promise<object>} the cancelled order
 */
export async function cancelOrder(userId, orderId) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id, status')
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const err = new Error('Only pending orders can be cancelled.')
    err.code = 'not-cancellable'
    throw err
  }
  return data
}

/**
 * Convert a raw Supabase error into a friendly, user-facing message.
 * @param {{ code?: string, message?: string, orderCreated?: boolean } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getOrderErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  if (error.orderCreated) {
    return 'We recorded the order but could not save its items. Please contact support so we can fix this — your cart was not cleared.'
  }

  const code = String(error.code || '')
  if (code === 'PGRST116') {
    return 'This order no longer exists.'
  }
  if (code === 'not-cancellable') {
    return 'Only pending orders can be cancelled.'
  }
  if (code === '42501') {
    return 'You do not have permission to perform that action.'
  }
  if (code === '23503') {
    return 'A product in this order is no longer available.'
  }

  const raw = String(error.message || '')
  if (/network|failed to fetch|fetch failed|load failed/i.test(raw)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }

  return fallback
}

// ---------------------------------------------------------------------------
// Admin operations. The "Admins can manage all orders" RLS policy (is_admin())
// is the gatekeeper — these functions never bypass it; non-admins simply see
// their own rows or get rejected by the policy.
// ---------------------------------------------------------------------------

/**
 * Fetch ALL orders (admin view). Status filtering is done client-side by the
 * admin page from this single listing. Only visible through the admin RLS
 * policy — non-admins just see their own rows.
 * @returns {Promise<Array>}
 */
export async function fetchAllOrders() {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('orders')
    .select(ADMIN_ORDER_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single order by id WITHOUT the owner filter (admin view of any
 * customer's order). Only works through the "Admins can manage all orders"
 * RLS policy.
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
export async function fetchAdminOrderById(orderId) {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Update an order's status (admin only — enforced by RLS).
 * @param {{ orderId: string, status: string }} input
 * @returns {Promise<object>} the updated order (id, status)
 */
export async function updateOrderStatus({ orderId, status }) {
  if (!supabase) throw new Error('Supabase client not initialized')
  if (!ORDER_STATUSES.includes(status)) {
    const err = new Error('Invalid order status.')
    err.code = 'invalid-status'
    throw err
  }
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id, status')
    .single()
  if (error) throw error
  return data
}

/** Short, human-friendly order reference (first 8 chars of the uuid). */
export function shortOrderId(orderId) {
  if (!orderId) return ''
  return `#${String(orderId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
