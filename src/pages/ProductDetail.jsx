import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  addRecentProductId,
  fetchProductById,
  fetchProductsByIds,
  fetchRelatedProducts,
  formatPrice,
  getRecentProductIds,
  getShopErrorMessage,
} from '../lib/shop.js'
import AppHeader from '../components/AppHeader.jsx'
import ImageLightbox from '../components/ImageLightbox.jsx'
import ProductCard from '../components/ProductCard.jsx'
import QuickViewModal from '../components/QuickViewModal.jsx'
import ProductImage from '../components/ProductImage.jsx'
import QuantitySelector from '../components/QuantitySelector.jsx'
import ReviewsSection from '../components/ReviewsSection.jsx'
import StockBadge from '../components/StockBadge.jsx'
import {
  AlertIcon,
  CheckIcon,
  ChevronRightIcon,
  ExpandIcon,
  HeartIcon,
  PawIcon,
  RotateIcon,
  ShareIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  TruckIcon,
} from '../components/Icons.jsx'

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium capitalize text-slate-900">{children}</dd>
    </div>
  )
}

export default function ProductDetail() {
  const { productId } = useParams()
  const { user } = useAuth()
  const { addItem, isInCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready' | 'missing'
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [actionError, setActionError] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState(null)

  const [related, setRelated] = useState([])
  const [relatedStatus, setRelatedStatus] = useState('idle') // 'idle' | 'loading' | 'ready' | 'empty'
  const [recent, setRecent] = useState([])

  const loadProduct = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchProductById(productId)
      if (!data) {
        setStatus('missing')
        return
      }
      setProduct(data)
      setQuantity(1)
      setStatus('ready')
      addRecentProductId(productId)
    } catch (err) {
      console.error('[ProductDetail] Failed to load product:', err)
      setError(getShopErrorMessage(err, "We couldn't load this product. Please try again."))
      setStatus('error')
    }
  }, [productId])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Related products — same category or species, excluding this product
  useEffect(() => {
    if (status !== 'ready' || !product) return
    let active = true
    setRelatedStatus('loading')
    fetchRelatedProducts(product, 4)
      .then((data) => {
        if (!active) return
        setRelated(data)
        setRelatedStatus(data.length > 0 ? 'ready' : 'empty')
      })
      .catch((err) => {
        console.error('[ProductDetail] Related products error:', err)
        if (active) setRelatedStatus('empty')
      })
    return () => {
      active = false
    }
  }, [status, product])

  // Recently viewed (client-side browsing history, fetched from Supabase by id)
  useEffect(() => {
    if (status !== 'ready') return
    const ids = getRecentProductIds().filter((id) => id !== productId)
    if (ids.length === 0) return
    let active = true
    fetchProductsByIds(ids.slice(0, 4))
      .then((data) => {
        if (active) setRecent(data)
      })
      .catch((err) => {
        console.error('[ProductDetail] Recently viewed error:', err)
      })
    return () => {
      active = false
    }
  }, [status, productId])

  const handleToggleFavorite = () => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          notice: 'Sign in to save products to your favorites.',
        },
      })
      return
    }
    const wasFavorite = isFavorite(product.id)
    toggleFavorite(product.id)
      .then(() => {
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[ProductDetail] Favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleAddToCart = () => {
    if (Number(product.stock) <= 0 || adding) return
    setAdding(true)
    setActionError('')
    addItem(product, quantity)
    setAdded(true)
    showToast(`${product.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
    setTimeout(() => {
      setAdded(false)
      setAdding(false)
    }, 1600)
  }

  const handleBuyNow = () => {
    if (Number(product.stock) <= 0 || adding) return
    addItem(product, quantity)
    navigate('/cart')
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name || 'VetAnimals', url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard')
    } catch (err) {
      if (err?.name === 'AbortError') return
      showToast('Could not share the link', { tone: 'error' })
    }
  }

  const favorite = product ? isFavorite(product.id) : false
  const outOfStock = product ? Number(product.stock) <= 0 : true
  const lowStock = product ? !outOfStock && Number(product.stock) <= 5 : false

  const handleCardAddToCart = (relatedProduct) => {
    addItem(relatedProduct)
    showToast(`${relatedProduct.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
  }

  const handleCardToggleFavorite = (relatedProduct) => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          notice: 'Sign in to save products to your favorites.',
        },
      })
      return
    }
    toggleFavorite(relatedProduct.id).catch((err) => {
      console.error('[ProductDetail] Favorite error:', err)
      setActionError('Could not update favorites. Please try again.')
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:pb-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/shop" className="font-medium text-slate-500 transition hover:text-emerald-700">
            Shop
          </Link>
          {product?.categories?.name && (
            <>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-slate-400">{product.categories.name}</span>
            </>
          )}
        </nav>

        {/* Loading */}
        {status === 'loading' && (
          <div className="mt-6 grid animate-pulse gap-10 lg:grid-cols-2">
            <div className="aspect-square rounded-2xl bg-slate-200" />
            <div className="space-y-4 pt-2">
              <div className="h-6 w-1/3 rounded bg-slate-200" />
              <div className="h-8 w-3/4 rounded bg-slate-200" />
              <div className="h-6 w-1/2 rounded bg-slate-200" />
              <div className="h-20 rounded bg-slate-100" />
              <div className="h-12 rounded-lg bg-slate-100" />
              <div className="h-24 rounded bg-slate-100" />
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load this product
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadProduct} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Not found */}
        {status === 'missing' && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <PawIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
              Product not found
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              This product may have been removed or is no longer available.
            </p>
            <Link to="/shop" className="btn-primary mt-7">
              Back to shop
            </Link>
          </div>
        )}

        {/* Product */}
        {status === 'ready' && product && (
          <>
            <div className="mt-6 grid gap-10 lg:grid-cols-2">
              {/* Gallery */}
              <div>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={`View larger image of ${product.name}`}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                >
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-600 shadow-sm backdrop-blur transition group-hover:bg-white group-hover:text-slate-900">
                    <ExpandIcon className="h-4 w-4" />
                  </span>
                </button>

                {/* Thumbnails (single image is available in the current schema) */}
                {product.image_url && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label={`Open image of ${product.name}`}
                      className="overflow-hidden rounded-lg border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                    >
                      <ProductImage
                        src={product.image_url}
                        alt=""
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-400">
                  Click the image to zoom.
                </p>
              </div>

              {/* Info */}
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  {product.species && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                      {product.species}
                    </span>
                  )}
                  {product.categories?.name && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {product.categories.name}
                    </span>
                  )}
                  <StockBadge stock={product.stock} />
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {product.name}
                </h1>

                <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-700">
                  {formatPrice(product.price)}
                </p>

                {lowStock && (
                  <div
                    role="status"
                    className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
                  >
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Only {product.stock} left in stock — order soon before it sells out.
                    </span>
                  </div>
                )}

                {product.description && (
                  <p className="mt-5 leading-relaxed text-slate-600">
                    {product.description}
                  </p>
                )}

                {/* Trust row */}
                <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <TruckIcon className="h-5 w-5 text-emerald-700" />
                    <p className="text-xs font-medium text-slate-600">Delivery 3–5 days</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <ShieldCheckIcon className="h-5 w-5 text-emerald-700" />
                    <p className="text-xs font-medium text-slate-600">Secure checkout</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <RotateIcon className="h-5 w-5 text-emerald-700" />
                    <p className="text-xs font-medium text-slate-600">30-day returns</p>
                  </div>
                </div>

                {actionError && (
                  <div role="alert" className="form-banner--error mt-5">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Purchase row */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={Math.max(1, Number(product.stock))}
                    disabled={outOfStock}
                    size="lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock || adding}
                    className="btn-primary h-12 flex-1 px-6 text-base sm:flex-none"
                  >
                    {added ? (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        Added
                      </>
                    ) : (
                      <>
                        <ShoppingCartIcon className="h-5 w-5" />
                        {outOfStock ? 'Out of stock' : 'Add to cart'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={!product}
                    aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                    aria-pressed={favorite}
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                      favorite
                        ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-500'
                    }`}
                  >
                    <HeartIcon
                      className={`h-5 w-5 ${favorite ? 'animate-heart-pop fill-current' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share this product"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-xs transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                </div>

                {!outOfStock && (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="btn-secondary mt-3 h-12 w-full text-base"
                  >
                    Buy now
                  </button>
                )}

                {isInCart(product.id) && (
                  <p className="mt-4 text-sm text-slate-500">
                    This product is already in your{' '}
                    <Link to="/cart" className="font-semibold text-emerald-700 hover:text-emerald-800">
                      cart
                    </Link>
                    . Adding more will increase the quantity.
                  </p>
                )}
              </div>
            </div>

            {/* Information sections */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <InfoCard icon={PawIcon} title="Description">
                  <p>{product.description || 'No description available yet.'}</p>
                </InfoCard>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <h2 className="text-base font-bold tracking-tight text-slate-900">
                      Product details
                    </h2>
                  </div>
                  <dl className="mt-4 divide-y divide-slate-100">
                    <DetailRow label="Category">
                      {product.categories?.name || '—'}
                    </DetailRow>
                    <DetailRow label="Species">{product.species || '—'}</DetailRow>
                    <DetailRow label="Price">{formatPrice(product.price)}</DetailRow>
                    <DetailRow label="Availability">
                      <span
                        className={
                          outOfStock
                            ? 'text-red-600'
                            : lowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                        }
                      >
                        {outOfStock ? 'Out of stock' : lowStock ? `${product.stock} left` : 'In stock'}
                      </span>
                    </DetailRow>
                    <DetailRow label="First listed">
                      {product.created_at
                        ? new Date(product.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })
                        : '—'}
                    </DetailRow>
                    <DetailRow label="Item no.">{product.id.slice(0, 8).toUpperCase()}</DetailRow>
                  </dl>
                </div>

                {product.species && (
                  <InfoCard icon={HeartIcon} title="Suitable for">
                    <p>
                      Designed for <span className="font-semibold capitalize text-slate-900">{product.species}</span>s
                      {product.categories?.name ? (
                        <>
                          {' '}
                          and made for everyday {product.categories.name.toLowerCase()} needs.
                        </>
                      ) : (
                        '.'
                      )}
                    </p>
                  </InfoCard>
                )}
              </div>

              <div className="space-y-6">
                <InfoCard icon={TruckIcon} title="Shipping">
                  <ul className="space-y-2">
                    <li>Orders ship within 1–2 business days.</li>
                    <li>Standard delivery takes 3–5 business days.</li>
                    <li>Tracking details are emailed once your order ships.</li>
                  </ul>
                </InfoCard>

                <InfoCard icon={RotateIcon} title="Returns">
                  <p>
                    Not quite right? Request a return within 30 days of delivery for a
                    full refund, as long as the item is unopened and in its original
                    packaging.
                  </p>
                </InfoCard>

                <InfoCard icon={ShieldCheckIcon} title="Availability">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Current stock</span>
                    <StockBadge stock={product.stock} />
                  </div>
                </InfoCard>
              </div>
            </div>

            {/* Reviews — honest empty state (no reviews table in schema) */}
            <div className="mt-10">
              <ReviewsSection productId={product.id} />
            </div>

            {/* Related products */}
            {relatedStatus === 'ready' && related.length > 0 && (
              <section className="mt-14" aria-labelledby="related-heading">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 id="related-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      You may also like
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Hand-picked from the same category and species.
                    </p>
                  </div>
                  <Link
                    to="/shop"
                    className="hidden text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 sm:inline"
                  >
                    Browse all
                  </Link>
                </div>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {related.map((relatedProduct) => (
                    <ProductCard
                      key={relatedProduct.id}
                      product={relatedProduct}
                      isFavorite={isFavorite(relatedProduct.id)}
                      onToggleFavorite={handleCardToggleFavorite}
                      onAddToCart={handleCardAddToCart}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Recently viewed */}
            {recent.length > 0 && (
              <section className="mt-14" aria-labelledby="recent-heading">
                <h2 id="recent-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Recently viewed
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {recent.map((recentProduct) => (
                    <ProductCard
                      key={recentProduct.id}
                      product={recentProduct}
                      isFavorite={isFavorite(recentProduct.id)}
                      onToggleFavorite={handleCardToggleFavorite}
                      onAddToCart={handleCardAddToCart}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Sticky mobile purchase bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-7xl items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="text-base font-bold text-emerald-700">{formatPrice(product.price)}</p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <QuantitySelector
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    max={Math.max(1, Number(product.stock))}
                    disabled={outOfStock}
                    size="sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock || adding}
                    className="btn-primary h-10 px-4"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    {outOfStock ? 'Out of stock' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Quick view for related / recently viewed products */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isFavorite={isFavorite(quickViewProduct.id)}
          onToggleFavorite={() => handleCardToggleFavorite(quickViewProduct)}
          onAddToCart={(qty) => {
            addItem(quickViewProduct, qty)
            showToast(`${quickViewProduct.name} added to cart`, {
              actionLabel: 'View cart',
              onAction: () => navigate('/cart'),
            })
          }}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      {/* Image lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          src={product?.image_url}
          alt={product?.name || 'Product image'}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
