import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { fetchProductsByIds, formatPrice, getShopErrorMessage } from '../lib/shop.js'
import { createOrder, getOrderErrorMessage, payOrder, shortOrderId } from '../lib/orders.js'
import AppHeader from '../components/AppHeader.jsx'
import ProductImage from '../components/ProductImage.jsx'
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BagIcon,
  CheckCircleIcon,
  LockIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '../components/Icons.jsx'

/**
 * Re-validate every cart line against the CURRENT catalogue:
 * - product still exists and is active
 * - requested quantity is within current stock
 * - prices are the current shop prices (never the client's snapshot)
 * Returns the verified lines (with server prices) plus any blocking issues.
 *
 * This is a UX check so the summary is honest before submitting. The server
 * re-prices every line again when the order is created — it never trusts what
 * this function computed.
 */
async function runVerification(items) {
  const freshList = await fetchProductsByIds(items.map((item) => item.id))
  const freshById = new Map(freshList.map((p) => [p.id, p]))

  const lines = []
  const issues = []
  let pricesChanged = false

  for (const item of items) {
    const fresh = freshById.get(item.id)
    if (!fresh) {
      issues.push(`${item.name} is no longer available and was removed from this checkout.`)
      continue
    }
    const dbPrice = Number(fresh.price)
    const stock = Number(fresh.stock) || 0
    if (Math.abs(dbPrice - Number(item.price)) > 0.001) pricesChanged = true

    const quantity = Math.min(item.quantity, stock)
    if (item.quantity > stock) {
      issues.push(
        stock <= 0
          ? `${item.name} is out of stock. Please remove it from your cart.`
          : `Only ${stock} of ${item.name} ${stock === 1 ? 'is' : 'are'} in stock — please update the quantity in your cart.`,
      )
    }

    lines.push({
      id: fresh.id,
      name: fresh.name,
      image_url: fresh.image_url,
      species: fresh.species,
      price: dbPrice,
      stock,
      quantity,
    })
  }

  return { lines, issues, pricesChanged }
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="field-error">{message}</p>
}

export default function Checkout() {
  const { items, removeItem, closeCart } = useCart()

  const [shipping, setShipping] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  })
  const [errors, setErrors] = useState({})

  // Live database-backed verification of the cart
  const [verification, setVerification] = useState({
    status: 'checking', // 'checking' | 'ready' | 'error'
    lines: [],
    issues: [],
    pricesChanged: false,
    message: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  // Demo payment: no card is collected and no money moves — the server simply
  // moves the order from pending to paid so the rest of the flow can be seen.
  const handlePay = useCallback(async () => {
    if (!placedOrder || paying) return
    setPaying(true)
    setPayError('')
    try {
      const paid = await payOrder(placedOrder.id)
      setPlacedOrder(paid)
    } catch (err) {
      console.error('[Checkout] Demo payment failed:', err)
      setPayError(getOrderErrorMessage(err, 'Could not confirm the payment. Please try again.'))
    } finally {
      setPaying(false)
    }
  }, [placedOrder, paying])

  // Close the mini cart drawer when landing here (same as Cart page)
  useEffect(() => {
    closeCart()
  }, [closeCart])

  const runVerificationAndStore = useCallback(async () => {
    if (items.length === 0) return
    setVerification((prev) => ({ ...prev, status: 'checking' }))
    try {
      const result = await runVerification(items)
      setVerification({ status: 'ready', ...result })
    } catch (err) {
      console.error('[Checkout] Could not verify the cart:', err)
      setVerification((prev) => ({
        ...prev,
        status: 'error',
        message: getShopErrorMessage(err, 'We could not verify your cart with the current prices.'),
      }))
    }
  }, [items])

  // Re-verify whenever the cart changes so the summary always reflects the
  // database state.
  useEffect(() => {
    if (items.length > 0) {
      runVerificationAndStore()
    }
  }, [items, runVerificationAndStore])

  const handleChange = (e) => {
    const { name, value } = e.target
    setShipping((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const inputClass = (field) =>
    `input-field ${errors[field] ? 'input-field--error' : ''}`

  const validateShipping = () => {
    const next = {}
    if (shipping.fullName.trim().length < 2) next.fullName = 'Enter the recipient name.'
    if (shipping.address.trim().length < 5) next.address = 'Enter a street address.'
    if (shipping.city.trim().length < 2) next.city = 'Enter a city.'
    if (shipping.state.trim().length < 2) next.state = 'Enter a state or region.'
    if (!/^[a-zA-Z0-9][a-zA-Z0-9 -]{2,9}$/.test(shipping.zip.trim())) {
      next.zip = 'Enter a valid ZIP / postal code.'
    }
    return next
  }

  const total = verification.lines.reduce(
    (sum, line) => sum + Number(line.price) * line.quantity,
    0,
  )
  const itemCount = verification.lines.reduce((sum, line) => sum + line.quantity, 0)

  const canPlace =
    verification.status === 'ready' &&
    verification.lines.length > 0 &&
    verification.issues.length === 0 &&
    !submitting

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (submitting) return

    const fieldErrors = validateShipping()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    if (verification.status !== 'ready' || verification.issues.length > 0) return

    setSubmitting(true)
    setOrderError('')

    try {
      // Authoritative re-verification at submit time — catches price or stock
      // changes that happened while the form was being filled in.
      const result = await runVerification(items)
      if (result.issues.length > 0) {
        setVerification({ status: 'ready', ...result })
        setOrderError(
          'Some items changed while you were checking out. Review the updated summary and try again.',
        )
        return
      }
      setVerification({ status: 'ready', ...result })

      const shippingAddress = [
        shipping.fullName.trim(),
        shipping.address.trim(),
        `${shipping.city.trim()}, ${shipping.state.trim()} ${shipping.zip.trim()}`,
      ]
        .filter(Boolean)
        .join('\n')

      // Only ids and quantities go to the server; it looks up the price of
      // each line itself, so a tampered client price cannot change the total.
      const order = await createOrder({
        shippingAddress,
        lines: result.lines.map((line) => ({
          product_id: line.id,
          quantity: line.quantity,
        })),
      })

      // Only now — after the server confirmed the order and its lines — clear
      // the cart. removeItem per purchased id, never a blanket clear.
      for (const line of result.lines) removeItem(line.id)

      setPlacedOrder(order)
    } catch (err) {
      console.error('[Checkout] Place order failed:', err)
      setOrderError(
        getOrderErrorMessage(err, 'We could not place your order. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Success screen — shown only after the server confirmed the order + items.
  // -------------------------------------------------------------------------
  if (placedOrder) {
    const paid = placedOrder.status === 'paid'
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircleIcon className="h-9 w-9" />
            </span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {paid ? 'Payment received' : 'Order placed'}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              Your order <span className="font-semibold text-slate-700">{shortOrderId(placedOrder.id)}</span>{' '}
              has been received and is currently{' '}
              <span className="font-semibold text-slate-700">{paid ? 'paid' : 'pending'}</span>.
              {!paid && ' Confirm the demo payment below to move it forward.'}
            </p>
            <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-4 text-left">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">
                  {formatPrice(placedOrder.total_amount)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Items</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900">{itemCount}</dd>
              </div>
            </dl>

            {!paid && (
              <div className="mt-8 border-t border-slate-100 pt-8">
                <p className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-900">
                  <LockIcon className="h-4 w-4 text-emerald-700" />
                  Demo payment
                </p>
                <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-slate-400">
                  This is a demo checkout. No card details are collected and no
                  money is taken — confirming just marks the order as paid.
                </p>

                {payError && (
                  <div role="alert" className="form-banner--error mb-4 text-left">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{payError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary w-full sm:w-auto"
                >
                  {paying ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden="true"
                      />
                      Confirming…
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="h-4 w-4" />
                      Confirm payment of {formatPrice(placedOrder.total_amount)}
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={`/orders/${placedOrder.id}`} className="btn-primary">
                View order details
              </Link>
              <Link to="/shop" className="btn-secondary">
                Continue shopping
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Empty cart state
  // -------------------------------------------------------------------------
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Checkout
          </p>
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BagIcon className="h-8 w-8" />
            </span>
            <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              Your cart is empty
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Add some vet-approved essentials to your cart before checking out.
            </p>
            <Link to="/shop" className="btn-primary mt-7">
              Browse the shop
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Checkout form
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Progress */}
        <nav aria-label="Checkout progress" className="flex items-center gap-2 text-sm">
          <Link to="/cart" className="font-medium text-slate-500 transition hover:text-slate-900">
            Cart
          </Link>
          <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300" />
          <span className="font-semibold text-emerald-700">Checkout</span>
          <ArrowRightIcon className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-slate-400">Confirmation</span>
        </nav>

        <div className="mt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Checkout</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Confirm your order
          </h1>
        </div>

        {orderError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{orderError}</span>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Shipping address */}
          <form onSubmit={handlePlaceOrder} noValidate className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <TruckIcon className="h-5 w-5 text-emerald-700" />
                Shipping address
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="fullName" className="form-label">
                    Recipient name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={shipping.fullName}
                    onChange={handleChange}
                    placeholder="Full name"
                    className={inputClass('fullName')}
                  />
                  <FieldError message={errors.fullName} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="form-label">
                    Street address
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    value={shipping.address}
                    onChange={handleChange}
                    placeholder="123 Meadow Lane"
                    className={inputClass('address')}
                  />
                  <FieldError message={errors.address} />
                </div>
                <div>
                  <label htmlFor="city" className="form-label">
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    value={shipping.city}
                    onChange={handleChange}
                    placeholder="Springfield"
                    className={inputClass('city')}
                  />
                  <FieldError message={errors.city} />
                </div>
                <div>
                  <label htmlFor="state" className="form-label">
                    State / region
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    autoComplete="address-level1"
                    value={shipping.state}
                    onChange={handleChange}
                    placeholder="CA"
                    className={inputClass('state')}
                  />
                  <FieldError message={errors.state} />
                </div>
                <div>
                  <label htmlFor="zip" className="form-label">
                    ZIP / postal code
                  </label>
                  <input
                    id="zip"
                    name="zip"
                    type="text"
                    autoComplete="postal-code"
                    value={shipping.zip}
                    onChange={handleChange}
                    placeholder="90210"
                    className={inputClass('zip')}
                  />
                  <FieldError message={errors.zip} />
                </div>
              </div>
            </section>

            {/* Verification state */}
            {verification.status === 'error' && (
              <div role="alert" className="form-banner--error">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{verification.message}</span>
                <button type="button" onClick={runVerificationAndStore} className="btn-secondary ml-auto px-3 py-1.5 text-xs">
                  Try again
                </button>
              </div>
            )}

            {verification.issues.length > 0 && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Some items need your attention
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-6 text-sm text-amber-800">
                  {verification.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <Link to="/cart" className="btn-secondary mt-4">
                  Update cart
                </Link>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to cart
              </Link>
              <button
                type="submit"
                disabled={!canPlace}
                className="btn-primary w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                    Placing order…
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-4 w-4" />
                    Place order
                  </>
                )}
              </button>
            </div>
            {verification.status === 'checking' && (
              <p className="mt-2 text-right text-xs text-slate-400">
                Checking current prices and stock…
              </p>
            )}
          </form>

          {/* Order summary — always backed by current database prices */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Order summary</h2>

            {verification.status === 'checking' ? (
              <div className="mt-5 space-y-4">
                {[0, 1].map((key) => (
                  <div key={key} className="flex items-center gap-3 animate-pulse">
                    <div className="h-14 w-14 rounded-lg bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-slate-200" />
                      <div className="h-3 w-1/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {verification.pricesChanged && (
                  <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Prices updated — the total below uses the current shop prices.
                  </p>
                )}

                <ul className="mt-5 space-y-4">
                  {verification.lines.map((line) => (
                    <li key={line.id} className="flex items-center gap-3">
                      <Link
                        to={`/shop/${line.id}`}
                        className="shrink-0 overflow-hidden rounded-lg bg-slate-100"
                      >
                        <ProductImage
                          src={line.image_url}
                          alt={line.name}
                          className="h-14 w-14 object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">{line.name}</p>
                        {line.quantity > 0 ? (
                          <p className="text-xs text-slate-400">
                            {line.quantity} × {formatPrice(line.price)}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-red-600">Out of stock</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {line.quantity > 0 ? formatPrice(Number(line.price) * line.quantity) : '—'}
                      </p>
                    </li>
                  ))}
                </ul>

                <dl className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">
                      Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </dt>
                    <dd className="font-medium text-slate-900">{formatPrice(total)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base">
                    <dt className="font-semibold text-slate-900">Total</dt>
                    <dd className="font-bold text-slate-900">{formatPrice(total)}</dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-slate-400">
                  Prices and stock are re-checked against the shop at checkout.
                  Your items are taken from stock when the order is placed, and
                  returned if you cancel it.
                </p>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
