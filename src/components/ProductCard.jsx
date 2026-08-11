import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../lib/shop.js'
import ProductBadge from './ProductBadge.jsx'
import ProductImage from './ProductImage.jsx'
import QuantitySelector from './QuantitySelector.jsx'
import StockBadge from './StockBadge.jsx'
import {
  CheckIcon,
  ExpandIcon,
  HeartIcon,
  ShoppingCartIcon,
} from './Icons.jsx'

/**
 * Premium product card for the shop grid or list.
 * @param {{
 *   product: object,
 *   isFavorite: boolean,
 *   onToggleFavorite: (product: object) => void,
 *   onAddToCart: (product: object) => void,
 *   onQuickView: (product: object) => void,
 *   variant?: 'grid'|'list',
 * }}
 */
export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onQuickView,
  variant = 'grid',
}) {
  const { items, updateQuantity } = useCart()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const outOfStock = Number(product.stock) <= 0
  const cartItem = items.find((item) => item.id === product.id)
  const detailUrl = `/shop/${product.id}`

  const handleAddToCart = () => {
    if (outOfStock || adding) return
    setAdding(true)
    onAddToCart(product)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setAdding(false)
    }, 1400)
  }

  const imageBlock = (
    <div className="relative overflow-hidden bg-slate-100">
      <Link to={detailUrl} aria-label={product.name} className="block">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className={`w-full object-cover transition duration-300 group-hover:scale-[1.06] ${
            variant === 'list' ? 'aspect-square' : 'aspect-[4/3]'
          }`}
        />
      </Link>

      <ProductBadge product={product} className="absolute left-3 top-3" />

      {/* Favorite — always visible over the image */}
      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => onToggleFavorite(product)}
          aria-label={
            isFavorite
              ? `Remove ${product.name} from favorites`
              : `Add ${product.name} to favorites`
          }
          aria-pressed={isFavorite}
          className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-emerald-600/40 ${
            isFavorite
              ? 'border-red-200 bg-red-50 text-red-500'
              : 'border-white/60 bg-white/90 text-slate-400 hover:text-red-500'
          }`}
        >
          <HeartIcon
            className={`h-4 w-4 ${isFavorite ? 'animate-heart-pop fill-current' : ''}`}
          />
        </button>
      </div>

      {/* Quick view — hover overlay (desktop) */}
      {!outOfStock && (
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute inset-x-3 bottom-3 hidden translate-y-1 items-center justify-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-md backdrop-blur transition duration-200 hover:bg-white group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 sm:flex"
        >
          <ExpandIcon className="h-3.5 w-3.5" />
          Quick view
        </button>
      )}
    </div>
  )

  const metaChips = (
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
  )

  const priceRow = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-lg font-bold tracking-tight text-slate-900">
        {formatPrice(product.price)}
      </p>
      <StockBadge stock={product.stock} />
    </div>
  )

  const actionRow = (
    <div className="flex items-center gap-2">
      {cartItem ? (
        <>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckIcon className="h-3.5 w-3.5" />
            In cart
          </span>
          <QuantitySelector
            value={Math.min(cartItem.quantity, cartItem.stock)}
            onChange={(next) => updateQuantity(product.id, next)}
            min={1}
            max={Math.max(1, cartItem.stock)}
            size="sm"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={outOfStock || adding}
          className="btn-primary h-9 flex-1 px-3 py-0"
        >
          {added ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Added
            </>
          ) : (
            <>
              <ShoppingCartIcon className="h-4 w-4" />
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => onQuickView(product)}
        aria-label={`Quick view ${product.name}`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs transition hover:border-emerald-300 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
      >
        <ExpandIcon className="h-4 w-4" />
      </button>
    </div>
  )

  if (variant === 'list') {
    return (
      <article className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition duration-200 hover:border-slate-300 hover:shadow-md sm:gap-6 sm:p-5">
        <div className="w-32 shrink-0 sm:w-48">{imageBlock}</div>

        <div className="flex min-w-0 flex-1 flex-col py-1">
          {metaChips}
          <Link
            to={detailUrl}
            className="mt-2.5 line-clamp-1 text-base font-semibold leading-snug text-slate-900 transition hover:text-emerald-700 sm:line-clamp-2 sm:text-lg"
          >
            {product.name}
          </Link>
          {product.description && (
            <p className="mt-1.5 hidden text-sm leading-relaxed text-slate-500 sm:line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="min-w-0">{priceRow}</div>
            <div className="w-full sm:w-auto sm:min-w-64">{actionRow}</div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {imageBlock}

      <div className="flex flex-1 flex-col p-4">
        {metaChips}

        <Link
          to={detailUrl}
          className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition hover:text-emerald-700"
        >
          {product.name}
        </Link>

        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {product.description}
          </p>
        )}

        <div className="mt-3">{priceRow}</div>

        <div className="mt-auto border-t border-slate-100 pt-3.5">{actionRow}</div>
      </div>
    </article>
  )
}
