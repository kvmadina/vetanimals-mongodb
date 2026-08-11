import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { cancelOrder, fetchMyOrders, getOrderErrorMessage, shortOrderId } from '../lib/orders.js'
import { formatPrice } from '../lib/shop.js'
import AppHeader from '../components/AppHeader.jsx'
import OrderStatusBadge from '../components/OrderStatusBadge.jsx'
import { AlertIcon, BagIcon, ChevronRightIcon } from '../components/Icons.jsx'

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 h-3 w-2/3 rounded bg-slate-100" />
    </div>
  )
}

export default function MyOrders() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [orders, setOrders] = useState(null) // null = loading
  const [loadError, setLoadError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState('')

  const loadOrders = useCallback(async () => {
    setLoadError('')
    try {
      const data = await fetchMyOrders(user.id)
      setOrders(data)
    } catch (err) {
      console.error('[MyOrders] Failed to load orders:', err)
      setLoadError(getOrderErrorMessage(err, 'We could not load your orders.'))
      setOrders([])
    }
  }, [user])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleCancel = async (order) => {
    if (cancellingId) return
    setCancellingId(order.id)
    setCancelError('')
    try {
      await cancelOrder(user.id, order.id)
      setOrders((prev) =>
        prev.map((row) => (row.id === order.id ? { ...row, status: 'cancelled' } : row)),
      )
      showToast('Order cancelled')
    } catch (err) {
      console.error('[MyOrders] Cancel failed:', err)
      setCancelError(getOrderErrorMessage(err, 'Could not cancel this order. Please try again.'))
    } finally {
      setCancellingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Orders
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My orders
          </h1>
          <p className="mt-2 text-slate-500">
            Track your orders and review past purchases.
          </p>
        </div>

        {cancelError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}

        {/* Loading */}
        {orders === null && (
          <div className="mt-8 space-y-4">
            {[0, 1, 2].map((key) => (
              <OrderSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Error */}
        {orders !== null && loadError && orders.length === 0 && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load your orders
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={loadOrders} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {orders !== null && !loadError && orders.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BagIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              No orders yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              When you place an order it will appear here with its status and
              details.
            </p>
            <Link to="/shop" className="btn-primary mt-7">
              Browse the shop
            </Link>
          </div>
        )}

        {/* Inline refresh error with existing rows */}
        {orders !== null && loadError && orders.length > 0 && (
          <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* List */}
        {orders !== null && orders.length > 0 && (
          <div className="mt-8 space-y-4">
            {orders.map((order) => {
              const itemTotal = (order.order_items ?? []).reduce(
                (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
                0,
              )
              const itemCount = (order.order_items ?? []).reduce(
                (sum, item) => sum + item.quantity,
                0,
              )
              const isPending = order.status === 'pending'
              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-base font-bold text-slate-900 transition hover:text-emerald-700"
                      >
                        Order {shortOrderId(order.id)}
                      </Link>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {new Date(order.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex items-baseline gap-3">
                      <p className="text-base font-bold text-slate-900">
                        {formatPrice(order.total_amount)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {itemTotal > 0 &&
                          `items ${formatPrice(itemTotal)} · taxes & shipping not included`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          {confirmingId === order.id ? (
                            <>
                              <span className="text-xs font-medium text-slate-500">
                                Cancel this order?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCancel(order)}
                                disabled={cancellingId === order.id}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                              >
                                {cancellingId === order.id ? 'Cancelling…' : 'Yes, cancel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelError('')
                                setConfirmingId(order.id)
                              }}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Cancel order
                            </button>
                          )}
                        </div>
                      )}
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                      >
                        View details
                        <ChevronRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
