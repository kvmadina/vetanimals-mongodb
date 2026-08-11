import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useModalFocus } from '../hooks/useModalFocus.js'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../lib/shop.js'
import ProductImage from './ProductImage.jsx'
import QuantitySelector from './QuantitySelector.jsx'
import { BagIcon, TrashIcon, XIcon } from './Icons.jsx'

export default function MiniCartDrawer() {
  const {
    items,
    count,
    subtotal,
    updateQuantity,
    removeItem,
    isCartOpen,
    closeCart,
  } = useCart()
  const panelRef = useModalFocus(isCartOpen)

  // Close on Escape + lock body scroll while open
  useEffect(() => {
    if (!isCartOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') closeCart()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isCartOpen, closeCart])

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Cart">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Your cart{' '}
            {count > 0 && (
              <span className="ml-1 text-sm font-semibold text-slate-400">
                ({count} {count === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BagIcon className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-500">Add some treats for your pets.</p>
            <Link to="/shop" onClick={closeCart} className="btn-primary mt-6">
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {items.map((item) => {
                const qty = Math.min(item.quantity, item.stock)
                return (
                  <li key={item.id} className="flex gap-3 py-4">
                    <Link
                      to={`/shop/${item.id}`}
                      onClick={closeCart}
                      className="shrink-0 overflow-hidden rounded-lg bg-slate-100"
                    >
                      <ProductImage
                        src={item.image_url}
                        alt={item.name}
                        className="h-16 w-16 object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/shop/${item.id}`}
                          onClick={closeCart}
                          className="line-clamp-1 text-sm font-medium text-slate-900 transition hover:text-emerald-700"
                        >
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <QuantitySelector
                          value={qty}
                          onChange={(next) => updateQuantity(item.id, next)}
                          min={1}
                          max={Math.max(1, item.stock)}
                          size="sm"
                        />
                        <p className="text-sm font-bold text-slate-900">
                          {formatPrice(Number(item.price) * qty)}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <footer className="border-t border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="text-lg font-bold tracking-tight text-slate-900">
                  {formatPrice(subtotal)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeCart}
                  className="btn-secondary"
                >
                  Continue shopping
                </button>
                <Link to="/cart" onClick={closeCart} className="btn-primary">
                  View cart
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
