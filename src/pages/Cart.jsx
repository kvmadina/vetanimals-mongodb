import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../lib/shop.js'
import AppHeader from '../components/AppHeader.jsx'
import ProductImage from '../components/ProductImage.jsx'
import QuantitySelector from '../components/QuantitySelector.jsx'
import {
  ArrowLeftIcon,
  BagIcon,
  TrashIcon,
} from '../components/Icons.jsx'

export default function Cart() {
  const { items, count, subtotal, updateQuantity, removeItem, clearCart, closeCart } =
    useCart()
  const [confirmingClear, setConfirmingClear] = useState(false)

  // If the mini cart drawer is open when landing here (e.g. after "Buy now"
  // or the toast's "View cart" action), close it so it doesn't overlay the page.
  useEffect(() => {
    closeCart()
  }, [closeCart])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Cart
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your cart
            {items.length > 0 && (
              <span className="ml-3 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BagIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              Your cart is empty
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Browse vet-approved food, care essentials and supplies for your
              pets.
            </p>
            <Link to="/shop" className="btn-primary mt-7">
              Browse the shop
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Items */}
            <section className="space-y-4">
              {items.map((item) => {
                const clampedQty = Math.min(item.quantity, item.stock)
                return (
                  <article
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
                  >
                    <Link
                      to={`/shop/${item.id}`}
                      className="shrink-0 overflow-hidden rounded-xl bg-slate-100"
                    >
                      <ProductImage
                        src={item.image_url}
                        alt={item.name}
                        className="h-24 w-24 object-cover sm:h-28 sm:w-28"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/shop/${item.id}`}
                            className="line-clamp-2 text-sm font-semibold text-slate-900 transition hover:text-emerald-700"
                          >
                            {item.name}
                          </Link>
                          {item.species && (
                            <p className="mt-0.5 text-xs capitalize text-slate-400">
                              {item.species}
                            </p>
                          )}
                          <p className="mt-1.5 text-sm font-medium text-slate-700">
                            {formatPrice(item.price)}{' '}
                            <span className="text-slate-400">each</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                        <QuantitySelector
                          value={clampedQty}
                          onChange={(next) => updateQuantity(item.id, next)}
                          min={1}
                          max={Math.max(1, item.stock)}
                          size="sm"
                        />
                        <p className="text-base font-bold text-slate-900">
                          {formatPrice(Number(item.price) * clampedQty)}
                        </p>
                      </div>

                    </div>
                  </article>
                )
              })}

              {/* Clear cart */}
              <div className="flex justify-end">
                {confirmingClear ? (
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
                    <p className="text-sm font-medium text-red-700">
                      Remove all items from your cart?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart()
                        setConfirmingClear(false)
                      }}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Clear cart
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Clear cart
                  </button>
                )}
              </div>
            </section>

            {/* Summary */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Subtotal ({count} {count === 1 ? 'item' : 'items'})</dt>
                  <dd className="font-medium text-slate-900">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base">
                  <dt className="font-semibold text-slate-900">Total</dt>
                  <dd className="font-bold text-slate-900">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-center text-xs text-slate-400">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <Link to="/shop" className="btn-secondary mt-6 w-full">
                <ArrowLeftIcon className="h-4 w-4" />
                Continue shopping
              </Link>
              <Link to="/checkout" className="btn-primary mt-3 w-full">
                Proceed to checkout
              </Link>
              <p className="mt-4 text-center text-xs text-slate-400">
                Prices are re-checked against the shop when you place your
                order. Sign-in is required at checkout.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
