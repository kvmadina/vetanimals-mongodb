import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  NEXT_ORDER_STATUSES,
  ORDER_STATUSES,
  fetchAllOrders,
  getOrderErrorMessage,
  shortOrderId,
  updateOrderStatus,
} from '../lib/orders.js'
import { formatPrice } from '../lib/shop.js'
import { useToast } from '../context/ToastContext.jsx'
import AppHeader from '../components/AppHeader.jsx'
import OrderStatusBadge from '../components/OrderStatusBadge.jsx'
import { AlertIcon, ArrowLeftIcon, BagIcon, ShieldIcon } from '../components/Icons.jsx'

const STATUS_LABELS = {
  all: 'All',
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function RowSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-1/3 rounded bg-slate-100" />
        <div className="h-8 w-24 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default function AdminOrders() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState(null) // null = loading
  const [filter, setFilter] = useState('all')
  const [loadError, setLoadError] = useState('')
  const [updating, setUpdating] = useState(null) // { orderId, status } while in flight
  const [actionError, setActionError] = useState('')

  const loadOrders = useCallback(async () => {
    setLoadError('')
    try {
      const data = await fetchAllOrders()
      setOrders(data)
    } catch (err) {
      console.error('[AdminOrders] Failed to load orders:', err)
      setLoadError(getOrderErrorMessage(err, 'We could not load the orders.'))
      setOrders([])
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const counts = useMemo(() => {
    const map = { all: orders?.length ?? 0 }
    for (const status of ORDER_STATUSES) {
      map[status] = (orders ?? []).filter((order) => order.status === status).length
    }
    return map
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders ?? []
    return (orders ?? []).filter((order) => order.status === filter)
  }, [orders, filter])

  const handleSetStatus = async (order, status) => {
    if (updating) return
    setUpdating({ orderId: order.id, status })
    setActionError('')

    // Optimistic update, rolled back if Supabase rejects the change.
    const previous = orders
    setOrders((prev) =>
      prev.map((row) => (row.id === order.id ? { ...row, status } : row)),
    )
    try {
      await updateOrderStatus({ orderId: order.id, status })
      showToast(`Order ${shortOrderId(order.id)} marked ${STATUS_LABELS[status].toLowerCase()}`)
    } catch (err) {
      console.error('[AdminOrders] Status update failed:', err)
      setOrders(previous)
      setActionError(getOrderErrorMessage(err, 'Could not update this order. Please try again.'))
    } finally {
      setUpdating(null)
    }
  }

  const isUpdating = (orderId, status) =>
    updating?.orderId === orderId && updating?.status === status

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Admin
            </p>
            <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              <ShieldIcon className="h-7 w-7 text-emerald-700" />
              Order management
            </h1>
            <p className="mt-2 text-slate-500">
              View and update every order on the platform.
            </p>
          </div>
          {orders !== null && (
            <p className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-xs">
              {counts.all} {counts.all === 1 ? 'order' : 'orders'} total
            </p>
          )}
        </div>

        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Status filter tabs */}
        {orders !== null && (
        <div
          className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter orders by status"
        >
          {['all', ...ORDER_STATUSES].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                filter === key
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {STATUS_LABELS[key]}
              <span
                className={`ml-1.5 text-xs ${filter === key ? 'text-emerald-200' : 'text-slate-400'}`}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
        )}

        {/* Loading */}
        {orders === null && (
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((key) => (
              <RowSkeleton key={key} />
            ))}
          </div>
        )}

        {/* Load error */}
        {orders !== null && loadError && orders.length === 0 && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load the orders
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={loadOrders} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Inline refresh error with existing rows */}
        {orders !== null && loadError && orders.length > 0 && (
          <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Empty (no orders at all, or none match the filter) */}
        {orders !== null && !loadError && visibleOrders.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BagIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              {filter === 'all' ? 'No orders yet' : `No ${STATUS_LABELS[filter].toLowerCase()} orders`}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {filter === 'all'
                ? 'Orders placed by customers will appear here.'
                : 'No orders currently have this status.'}
            </p>
          </div>
        )}

        {/* Orders */}
        {visibleOrders.length > 0 && (
          <div className="mt-6 space-y-4">
            {visibleOrders.map((order) => {
              const customer = order.profiles
              const itemCount = (order.order_items ?? []).reduce(
                (sum, item) => sum + item.quantity,
                0,
              )
              const nextStatuses = NEXT_ORDER_STATUSES[order.status] || []
              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-base font-bold text-slate-900 transition hover:text-emerald-700"
                      >
                        Order {shortOrderId(order.id)}
                      </Link>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {customer?.full_name || 'Unknown customer'}
                        {customer?.email ? ` · ${customer.email}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900">
                        {formatPrice(order.total_amount)}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                        Ship to: {order.shipping_address.replace(/\n/g, ', ')}
                      </p>
                    </div>

                    {nextStatuses.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {nextStatuses.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleSetStatus(order, status)}
                            disabled={updating !== null}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              status === 'cancelled'
                                ? 'border border-red-200 text-red-600 hover:bg-red-50'
                                : 'bg-emerald-700 text-white hover:bg-emerald-800'
                            }`}
                          >
                            {isUpdating(order.id, status) ? (
                              <span
                                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
                                aria-hidden="true"
                              />
                            ) : (
                              `Mark ${STATUS_LABELS[status].toLowerCase()}`
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Final status — no further changes.</p>
                    )}
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
