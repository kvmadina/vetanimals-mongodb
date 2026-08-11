import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  cancelOrder,
  fetchAdminOrderById,
  fetchOrderById,
  getOrderErrorMessage,
  shortOrderId,
} from '../lib/orders.js'
import { formatPrice } from '../lib/shop.js'
import AppHeader from '../components/AppHeader.jsx'
import OrderStatusBadge from '../components/OrderStatusBadge.jsx'
import ProductImage from '../components/ProductImage.jsx'
import PageLoader from '../components/PageLoader.jsx'
import {
  AlertIcon,
  ArrowLeftIcon,
  MapPinIcon,
  TruckIcon,
} from '../components/Icons.jsx'

export default function OrderDetails() {
  const { orderId } = useParams()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const isAdmin = profile?.role === 'admin'

  const [order, setOrder] = useState(null) // null = loading
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const loadOrder = useCallback(async () => {
    setLoadError('')
    setNotFound(false)
    try {
      // Admins can open any customer's order (admin RLS policy); owners are
      // scoped to their own orders.
      const data = isAdmin
        ? await fetchAdminOrderById(orderId)
        : await fetchOrderById(user.id, orderId)
      if (!data) {
        setNotFound(true)
        setOrder(null)
      } else {
        setOrder(data)
      }
    } catch (err) {
      console.error('[OrderDetails] Failed to load order:', err)
      setLoadError(getOrderErrorMessage(err, 'We could not load this order.'))
      setOrder(null)
    }
  }, [user, orderId, isAdmin])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleCancel = async () => {
    if (cancelling) return
    setCancelling(true)
    setCancelError('')
    try {
      await cancelOrder(user.id, order.id)
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev))
      showToast('Order cancelled')
    } catch (err) {
      console.error('[OrderDetails] Cancel failed:', err)
      setCancelError(getOrderErrorMessage(err, 'Could not cancel this order. Please try again.'))
    } finally {
      setCancelling(false)
      setConfirming(false)
    }
  }

  const isOwner = order ? order.user_id === user.id : false

  if (order === null && !loadError && !notFound) {
    return <PageLoader label="Loading order…" />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to my orders
        </Link>

        {/* Not found */}
        {notFound && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Order not found
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              This order doesn&apos;t exist or isn&apos;t linked to your account.
            </p>
            <Link to="/orders" className="btn-primary mt-6">
              Back to my orders
            </Link>
          </div>
        )}

        {/* Load error */}
        {!notFound && order === null && loadError && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h1 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load this order
            </h1>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={loadOrder} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {order && (
          <>
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Order {shortOrderId(order.id)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Order details
                </h1>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Placed{' '}
                {new Date(order.created_at).toLocaleString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {cancelError && (
              <div role="alert" className="form-banner--error mt-6">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Items */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <TruckIcon className="h-5 w-5 text-emerald-700" />
                  Items
                </h2>
                <ul className="mt-5 divide-y divide-slate-100">
                  {(order.order_items ?? []).map((item) => {
                    const product = item.products
                    const lineTotal = Number(item.price_at_purchase) * item.quantity
                    return (
                      <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                        <Link
                          to={`/shop/${item.product_id}`}
                          className="shrink-0 overflow-hidden rounded-lg bg-slate-100"
                        >
                          <ProductImage
                            src={product?.image_url}
                            alt={product?.name || 'Product'}
                            className="h-16 w-16 object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/shop/${item.product_id}`}
                            className="line-clamp-1 text-sm font-semibold text-slate-900 transition hover:text-emerald-700"
                          >
                            {product?.name || 'Product unavailable'}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.quantity} × {formatPrice(item.price_at_purchase)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatPrice(lineTotal)}
                        </p>
                      </li>
                    )
                  })}
                </ul>

                <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd className="font-medium text-slate-900">
                      {formatPrice(
                        (order.order_items ?? []).reduce(
                          (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
                          0,
                        ),
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base">
                    <dt className="font-semibold text-slate-900">Total</dt>
                    <dd className="font-bold text-slate-900">{formatPrice(order.total_amount)}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  Item prices shown are the prices at the time of purchase. No
                  payment has been taken for this order.
                </p>
              </section>

              {/* Shipping + status */}
              <aside className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <MapPinIcon className="h-5 w-5 text-emerald-700" />
                    Shipping address
                  </h2>
                  <address className="mt-4 whitespace-pre-line text-sm not-italic leading-relaxed text-slate-600">
                    {order.shipping_address}
                  </address>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">Order status</h2>
                  <div className="mt-4">
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    {order.status === 'pending'
                      ? isOwner
                        ? 'Your order is waiting to be processed. You can cancel it while it is pending.'
                        : 'This order is pending and waiting to be processed.'
                      : order.status === 'cancelled'
                        ? 'This order was cancelled.'
                        : isOwner
                          ? 'Your order is being processed.'
                          : 'This order is being processed.'}
                  </p>

                  {order.status === 'pending' && isOwner &&
                    (confirming ? (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {cancelling ? 'Cancelling…' : 'Yes, cancel order'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(false)}
                          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelError('')
                          setConfirming(true)
                        }}
                        className="btn-secondary mt-4 w-full"
                      >
                        Cancel order
                      </button>
                    ))}

                  {order.status === 'pending' && isAdmin && !isOwner && (
                    <Link to="/admin/orders" className="btn-secondary mt-4 w-full">
                      Manage in admin panel
                    </Link>
                  )}
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
