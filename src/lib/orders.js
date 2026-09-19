// ---------------------------------------------------------------------------
// Orders data layer.
//
// Line prices are decided by the server from the current catalogue — whatever
// the cart thinks a product costs is never used as the purchase price. The
// server also validates quantities against current stock, but nothing here
// claims stock is reserved: it is not.
// ---------------------------------------------------------------------------
import { api, isNetworkError } from './api.js'

/** All valid order statuses (matches the schema's enum). */
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'completed']

/**
 * Sensible workflow transitions per status. This map is a UX guard that stops
 * nonsensical jumps (e.g. pending -> completed); the server accepts any valid
 * status from an admin. Cancelled/completed are terminal.
 */
export const NEXT_ORDER_STATUSES = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
}

/**
 * Fetch the signed-in user's orders, newest first.
 * @returns {Promise<Array>}
 */
export async function fetchMyOrders() {
  return (await api('/orders')) ?? []
}

/**
 * Fetch a single order belonging to the signed-in user, with its items.
 * @param {string} orderId
 * @returns {Promise<object|null>} null when not found / not owned
 */
export async function fetchOrderById(orderId) {
  try {
    return await api(`/orders/${orderId}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

/**
 * Create an order and its line items.
 * Only product ids and quantities are sent — the server looks up the current
 * price for each line and computes the total from those prices.
 * @param {{
 *   shippingAddress: string,
 *   lines: Array<{ product_id: string, quantity: number }>,
 * }} input
 * @returns {Promise<object>} the created order
 */
export async function createOrder({ shippingAddress, lines }) {
  return api('/orders', {
    method: 'POST',
    body: {
      shipping_address: shippingAddress,
      lines: lines.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
      })),
    },
  })
}

/**
 * Cancel one of the signed-in user's pending orders.
 * @param {string} orderId
 * @returns {Promise<object>} the cancelled order
 */
export async function cancelOrder(orderId) {
  return api(`/orders/${orderId}/cancel`, { method: 'PATCH' })
}

/**
 * Mark a pending order as paid.
 *
 * This is a DEMO payment: no card is collected, no payment provider is
 * contacted and no money moves. It exists so the order lifecycle
 * (pending -> paid -> shipped) can be walked end to end.
 * @param {string} orderId
 * @returns {Promise<object>} the paid order
 */
export async function payOrder(orderId) {
  return api(`/orders/${orderId}/pay`, { method: 'POST' })
}

/**
 * Convert an API error into a friendly, user-facing message.
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback
 * @returns {string}
 */
export function getOrderErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''
  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }

  // The server already phrased these for the customer ("Only 3 of X are in
  // stock."), so passing them through beats a vaguer generic message.
  const passThrough = [
    'not-cancellable',
    'not-payable',
    'insufficient-stock',
    'product-missing',
    'invalid-quantity',
    'empty-cart',
    'invalid-status',
    'validation',
  ]
  if (passThrough.includes(error.code)) {
    return error.message || fallback
  }

  if (error.code === 'not-found') {
    return 'This order no longer exists.'
  }
  if (error.code === 'forbidden' || error.code === 'auth-required') {
    return 'You do not have permission to perform that action.'
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Admin operations. The server checks the admin role on every one of these —
// a non-admin gets a 403, never a partial result.
// ---------------------------------------------------------------------------

/**
 * Fetch ALL orders (admin view). Status filtering is done client-side by the
 * admin page from this single listing.
 * @returns {Promise<Array>}
 */
export async function fetchAllOrders() {
  return (await api('/orders/admin')) ?? []
}

/**
 * Fetch any customer's order by id (admin view).
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
export async function fetchAdminOrderById(orderId) {
  try {
    return await api(`/orders/admin/${orderId}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

/**
 * Update an order's status (admin only).
 * @param {{ orderId: string, status: string }} input
 * @returns {Promise<object>} the updated order
 */
export async function updateOrderStatus({ orderId, status }) {
  if (!ORDER_STATUSES.includes(status)) {
    const err = new Error('Invalid order status.')
    err.code = 'invalid-status'
    throw err
  }
  return api(`/orders/admin/${orderId}/status`, { method: 'PATCH', body: { status } })
}

/** Short, human-friendly order reference (first 8 characters of the id). */
export function shortOrderId(orderId) {
  if (!orderId) return ''
  return `#${String(orderId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
}
