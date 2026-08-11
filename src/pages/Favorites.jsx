import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchProductsByIds, getShopErrorMessage } from '../lib/shop.js'
import { fetchClinicsByIds, fetchVetsByIds, getVetsErrorMessage } from '../lib/vets.js'
import AppHeader from '../components/AppHeader.jsx'
import ClinicCard from '../components/ClinicCard.jsx'
import ProductCard from '../components/ProductCard.jsx'
import QuickViewModal from '../components/QuickViewModal.jsx'
import VetCard from '../components/VetCard.jsx'
import {
  AlertIcon,
  BagIcon,
  BuildingIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'vets', label: 'Veterinarians' },
  { key: 'clinics', label: 'Clinics' },
]

const EMPTY_STATES = {
  products: {
    icon: BagIcon,
    title: 'No favorited products yet',
    body: 'Tap the heart on any product to save it here for later.',
    cta: 'Browse the shop',
    to: '/shop',
  },
  vets: {
    icon: StethoscopeIcon,
    title: 'No favorited veterinarians yet',
    body: 'Save the veterinarians you trust to keep them one tap away.',
    cta: 'Find a vet',
    to: '/vets',
  },
  clinics: {
    icon: BuildingIcon,
    title: 'No favorited clinics yet',
    body: 'Keep your favourite clinics handy for appointments and care.',
    cta: 'Browse clinics',
    to: '/clinics',
  },
}

function CardSkeleton({ variant = 'card' }) {
  if (variant === 'vet') {
    return (
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white">
        <div className="flex items-start gap-4 p-5">
          <div className="h-14 w-14 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3.5 w-1/3 rounded bg-slate-100" />
          </div>
        </div>
        <div className="p-4">
          <div className="h-9 rounded-lg bg-slate-100" />
        </div>
      </div>
    )
  }
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        <div className="h-9 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

export default function Favorites() {
  const {
    favoriteIds,
    vetFavoriteIds,
    clinicFavoriteIds,
    favoritesLoading,
    isFavorite,
    toggleFavorite,
    isVetFavorite,
    toggleVetFavorite,
    isClinicFavorite,
    toggleClinicFavorite,
  } = useFavorites()
  const { addItem } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState('products')
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [actionError, setActionError] = useState('')

  // Per-tab data + status: 'loading' | 'refreshing' | 'ready' | 'error'
  const [tabData, setTabData] = useState({
    products: { rows: [], status: 'loading', error: '' },
    vets: { rows: [], status: 'loading', error: '' },
    clinics: { rows: [], status: 'loading', error: '' },
  })

  const loadTab = useCallback(
    async (which) => {
      setTabData((prev) => {
        const existing = prev[which]
        return {
          ...prev,
          [which]: {
            ...existing,
            status: existing.rows.length ? 'refreshing' : 'loading',
            error: '',
          },
        }
      })
      try {
        let rows = []
        if (which === 'products') {
          const ids = [...favoriteIds]
          rows = ids.length ? await fetchProductsByIds(ids) : []
        } else if (which === 'vets') {
          const ids = [...vetFavoriteIds]
          rows = ids.length ? await fetchVetsByIds(ids) : []
        } else {
          const ids = [...clinicFavoriteIds]
          rows = ids.length ? await fetchClinicsByIds(ids) : []
        }
        setTabData((prev) => ({ ...prev, [which]: { rows, status: 'ready', error: '' } }))
      } catch (err) {
        console.error(`[Favorites] Failed to load ${which}:`, err)
        const message =
          which === 'products'
            ? getShopErrorMessage(err, "We couldn't load your favorite products.")
            : getVetsErrorMessage(err, "We couldn't load your favorites.")
        setTabData((prev) => ({
          ...prev,
          [which]: { ...prev[which], status: 'error', error: message },
        }))
      }
    },
    [favoriteIds, vetFavoriteIds, clinicFavoriteIds],
  )

  // Load the active tab whenever it changes or the favorite ids change
  useEffect(() => {
    loadTab(tab)
  }, [tab, loadTab])

  const handleToggleProduct = (product) => {
    setActionError('')
    const wasFavorite = isFavorite(product.id)
    toggleFavorite(product.id)
      .then(() => {
        if (wasFavorite) {
          setTabData((prev) => ({
            ...prev,
            products: {
              ...prev.products,
              rows: prev.products.rows.filter((row) => row.id !== product.id),
            },
          }))
        }
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Favorites] Product favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleToggleVet = (vet) => {
    setActionError('')
    const wasFavorite = isVetFavorite(vet.id)
    toggleVetFavorite(vet.id)
      .then(() => {
        if (wasFavorite) {
          setTabData((prev) => ({
            ...prev,
            vets: { ...prev.vets, rows: prev.vets.rows.filter((row) => row.id !== vet.id) },
          }))
        }
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Favorites] Vet favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleToggleClinic = (clinic) => {
    setActionError('')
    const wasFavorite = isClinicFavorite(clinic.id)
    toggleClinicFavorite(clinic.id)
      .then(() => {
        if (wasFavorite) {
          setTabData((prev) => ({
            ...prev,
            clinics: {
              ...prev.clinics,
              rows: prev.clinics.rows.filter((row) => row.id !== clinic.id),
            },
          }))
        }
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Favorites] Clinic favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleAddToCart = (product) => {
    addItem(product)
    showToast(`${product.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
  }

  const counts = {
    products: favoriteIds.size,
    vets: vetFavoriteIds.size,
    clinics: clinicFavoriteIds.size,
  }

  const active = tabData[tab]

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Favorites
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Saved for later
          </h1>
          <p className="mt-2 text-slate-500">
            Products, veterinarians and clinics you&apos;ve saved — synced with
            your account.
          </p>
        </div>

        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Tabs */}
        <div
          className="mt-8 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
          role="tablist"
          aria-label="Favorite groups"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                tab === t.key
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 text-xs ${tab === t.key ? 'text-emerald-200' : 'text-slate-400'}`}
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Loading (first load of the active tab, or while the context
            is still fetching the user's favorite ids after a refresh) */}
        {(active.status === 'loading' ||
          (active.rows.length === 0 && favoritesLoading)) && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <CardSkeleton key={key} variant={tab === 'vets' ? 'vet' : 'card'} />
            ))}
          </div>
        )}

        {/* Error with no rows */}
        {active.status === 'error' && active.rows.length === 0 && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-red-800">
              We couldn&apos;t load your favorites
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{active.error}</p>
            <button type="button" onClick={() => loadTab(tab)} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {active.status === 'ready' &&
          active.rows.length === 0 &&
          !favoritesLoading && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {(() => {
                  const Icon = EMPTY_STATES[tab].icon
                  return <Icon className="h-8 w-8" />
                })()}
              </span>
              <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                {EMPTY_STATES[tab].title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                {EMPTY_STATES[tab].body}
              </p>
              <Link to={EMPTY_STATES[tab].to} className="btn-primary mt-7">
                {EMPTY_STATES[tab].cta}
              </Link>
            </div>
          )}

        {/* Error banner with rows (kept visible) */}
        {active.status === 'error' && active.rows.length > 0 && (
          <div role="status" className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{active.error}</span>
          </div>
        )}

        {/* Content */}
        {active.rows.length > 0 && (
          <div className="mt-6">
            {tab === 'products' && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {active.rows.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={isFavorite(product.id)}
                    onToggleFavorite={handleToggleProduct}
                    onAddToCart={handleAddToCart}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            )}
            {tab === 'vets' && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {active.rows.map((vet) => (
                  <VetCard
                    key={vet.id}
                    vet={vet}
                    isFavorite={isVetFavorite(vet.id)}
                    onToggleFavorite={handleToggleVet}
                  />
                ))}
              </div>
            )}
            {tab === 'clinics' && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {active.rows.map((clinic) => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    isFavorite={isClinicFavorite(clinic.id)}
                    onToggleFavorite={handleToggleClinic}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick view (products) */}
        {quickViewProduct && (
          <QuickViewModal
            product={quickViewProduct}
            isFavorite={isFavorite(quickViewProduct.id)}
            onToggleFavorite={() => handleToggleProduct(quickViewProduct)}
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
      </main>
    </div>
  )
}
