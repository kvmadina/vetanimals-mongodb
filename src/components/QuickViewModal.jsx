import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useModalFocus } from '../hooks/useModalFocus.js'
import { formatPrice } from '../lib/shop.js'
import ProductImage from './ProductImage.jsx'
import ProductBadge from './ProductBadge.jsx'
import QuantitySelector from './QuantitySelector.jsx'
import { ArrowRightIcon, HeartIcon, ShoppingCartIcon, XIcon } from './Icons.jsx'

/**
 * Quick View modal — reuses the already-loaded product object (no extra fetch).
 * @param {{
 *   product: object,
 *   isFavorite: boolean,
 *   onToggleFavorite: () => void,
 *   onAddToCart: (quantity: number) => void,
 *   onClose: () => void,
 * }}
 */
export default function QuickViewModal({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onClose,
}) {
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const dialogRef = useModalFocus(true)

  const outOfStock = Number(product.stock) <= 0

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleAddToCart = () => {
    if (outOfStock || adding) return
    setAdding(true)
    onAddToCart(quantity)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setAdding(false)
    }, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        className="animate-fade-in relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 p-2 text-slate-500 shadow-xs transition hover:bg-white hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="grid overflow-y-auto sm:grid-cols-2">
          {/* Image */}
          <div className="relative bg-slate-50">
            <ProductImage
              src={product.image_url}
              alt={product.name}
              className="h-56 w-full object-cover sm:h-full"
            />
            <ProductBadge product={product} className="absolute left-3 top-3" />
          </div>

          {/* Info */}
          <div className="flex flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-1.5">
              {product.species && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
                  {product.species}
                </span>
              )}
              {product.categories?.name && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {product.categories.name}
                </span>
              )}
            </div>

            <h2
              id="quick-view-title"
              className="mt-3 text-xl font-bold tracking-tight text-slate-900"
            >
              {product.name}
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={Math.max(1, Number(product.stock))}
                disabled={outOfStock}
              />
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock || adding}
                className="btn-primary h-10 flex-1 px-3"
              >
                {added ? (
                  'Added ✓'
                ) : (
                  <>
                    <ShoppingCartIcon className="h-4 w-4" />
                    {outOfStock ? 'Out of stock' : 'Add to cart'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={isFavorite}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                  isFavorite
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-red-500'
                }`}
              >
                <HeartIcon className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <Link
              to={`/shop/${product.id}`}
              onClick={onClose}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              View full details
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
