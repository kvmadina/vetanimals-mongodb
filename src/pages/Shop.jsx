import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useModalFocus } from '../hooks/useModalFocus.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  fetchCategories,
  fetchProducts,
  getShopErrorMessage,
} from '../lib/shop.js'
import AppHeader from '../components/AppHeader.jsx'
import ProductCard from '../components/ProductCard.jsx'
import QuickViewModal from '../components/QuickViewModal.jsx'
import ShopFilterPanel from '../components/ShopFilterPanel.jsx'
import {
  AlertIcon,
  BagIcon,
  ChevronDownIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  XIcon,
} from '../components/Icons.jsx'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
]

const PRICE_LABELS = {
  'under-25': 'Under $25',
  '25-50': '$25 – $50',
  'over-50': 'Over $50',
}

const AVAILABILITY_LABELS = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
}

function ProductCardSkeleton({ variant = 'grid' }) {
  if (variant === 'list') {
    return (
      <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex gap-4">
          <div className="h-28 w-28 rounded-lg bg-slate-200 sm:h-36 sm:w-36" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-3.5 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-3.5 w-3/4 rounded bg-slate-100" />
            <div className="h-9 w-40 rounded-lg bg-slate-100" />
          </div>
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
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        <div className="h-9 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

function ActiveFilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-medium text-emerald-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear filter ${label}`}
        className="rounded-full p-0.5 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  )
}

function MobileFiltersDrawer({ open, onClose, children, count }) {
  const drawerRef = useModalFocus(open)

  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-xs flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Filters {count > 0 && <span className="text-sm font-semibold text-emerald-700">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <footer className="border-t border-slate-100 p-4">
          <button type="button" onClick={onClose} className="btn-primary w-full">
            Show results
          </button>
        </footer>
      </aside>
    </div>
  )
}

export default function Shop() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const speciesParam = searchParams.get('species')

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'error' | 'ready'
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [filtersError, setFiltersError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [availability, setAvailability] = useState('')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState('grid')

  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Debounce the search box before hitting Supabase
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Deep link from Home's "Shop by Pet": /shop?species=dog applies the
  // species filter (and resets the other filters so the shop opens cleanly).
  useEffect(() => {
    if (!speciesParam) return
    setSearchInput('')
    setQuery('')
    setCategoryId('')
    setPriceRange('')
    setAvailability('')
    setSort('newest')
    setSpeciesFilter(speciesParam)
  }, [speciesParam])

  const loadProducts = useCallback(async () => {
    // Keep the current grid visible while refetching (subtle refresh instead
    // of a jarring full skeleton flash on every keystroke/filter change).
    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'))
    setError('')
    try {
      const data = await fetchProducts({
        categoryId: categoryId || null,
        species: speciesFilter || null,
        search: query,
        sort,
        availability,
        priceRange,
      })
      setProducts(data)
      setStatus('ready')
    } catch (err) {
      console.error('[Shop] Failed to load products:', err)
      setError(getShopErrorMessage(err, "We couldn't load the shop. Please try again."))
      setStatus('error')
    }
  }, [categoryId, speciesFilter, query, sort, availability, priceRange])

  // Fetch product data whenever filters change
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Fetch category + species options once
  useEffect(() => {
    let active = true
    setFiltersError('')
    fetchCategories()
      .then((cats) => {
        if (!active) return
        setCategories(cats)
      })
      .catch((err) => {
        console.error('[Shop] Failed to load filter options:', err)
        if (active) {
          setFiltersError("Couldn't load the filter options. Refreshing the page may help.")
        }
      })
    return () => {
      active = false
    }
  }, [])

  const activeFilters = useMemo(() => {
    const list = []
    if (query) {
      list.push({
        key: 'search',
        label: `“${query}”`,
        clear: () => {
          setSearchInput('')
          setQuery('')
        },
      })
    }
    if (categoryId) {
      const category = categories.find((c) => c.id === categoryId)
      list.push({
        key: 'category',
        label: category?.name || 'Category',
        clear: () => setCategoryId(''),
      })
    }
    if (speciesFilter) {
      list.push({
        key: 'species',
        label: speciesFilter.charAt(0).toUpperCase() + speciesFilter.slice(1),
        clear: () => setSpeciesFilter(''),
      })
    }
    if (priceRange) {
      list.push({
        key: 'price',
        label: PRICE_LABELS[priceRange] || 'Price',
        clear: () => setPriceRange(''),
      })
    }
    if (availability) {
      list.push({
        key: 'availability',
        label: AVAILABILITY_LABELS[availability] || 'Availability',
        clear: () => setAvailability(''),
      })
    }
    return list
  }, [query, categoryId, speciesFilter, priceRange, availability, categories])

  const clearFilters = () => {
    setSearchInput('')
    setQuery('')
    setCategoryId('')
    setSpeciesFilter('')
    setPriceRange('')
    setAvailability('')
    setSort('newest')
  }

  const handleToggleFavorite = (product) => {
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
        showToast(
          wasFavorite ? 'Removed from favorites' : 'Saved to your favorites',
          { tone: 'success' },
        )
      })
      .catch((err) => {
        console.error('[Shop] Favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  const handleAddToCart = (product) => {
    setActionError('')
    addItem(product)
    showToast(`${product.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
  }

  const handleQuickViewAdd = (quantity) => {
    if (!quickViewProduct) return
    addItem(quickViewProduct, quantity)
    showToast(`${quickViewProduct.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
  }

  const resultCount = useMemo(
    () => (status === 'ready' || status === 'refreshing' ? products.length : null),
    [status, products.length],
  )

  const filtersCount = activeFilters.length

  const filterPanel = (
    <ShopFilterPanel
      categories={categories}
      activeCategoryId={categoryId}
      onCategoryChange={setCategoryId}
      activeSpecies={speciesFilter}
      onSpeciesChange={setSpeciesFilter}
      priceRange={priceRange}
      onPriceChange={setPriceRange}
      availability={availability}
      onAvailabilityChange={setAvailability}
    />
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Pet shop
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything your pet needs
            </h1>
            <p className="mt-2 max-w-xl text-slate-500">
              Vet-approved food, care essentials and supplies for every member of
              the family — sourced from trusted brands.
            </p>
          </div>
        </div>

        {/* Filter-options load error */}
        {filtersError && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{filtersError}</span>
            <button
              type="button"
              onClick={() => setFiltersError('')}
              aria-label="Dismiss"
              className="ml-auto rounded-md p-1 text-amber-400 transition hover:text-amber-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Action error (favorites etc.) */}
        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              aria-label="Dismiss"
              className="ml-auto rounded-md p-1 text-red-400 transition hover:text-red-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products, descriptions or species…"
                aria-label="Search products"
                className="input-field pl-10 pr-10"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setQuery('')
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters button (mobile) */}
            <button
              type="button"
              onClick={() => setIsFiltersOpen(true)}
              className="btn-secondary inline-flex items-center justify-center gap-2 lg:hidden"
            >
              <FilterIcon className="h-4 w-4" />
              Filters
              {filtersCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[11px] font-bold text-white">
                  {filtersCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="relative lg:w-56">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort products"
                className="input-field appearance-none pr-10"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-xs" role="group" aria-label="View products as">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-pressed={view === 'grid'}
                aria-label="Grid view"
                className={`rounded-md p-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                  view === 'grid'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}
                aria-label="List view"
                className={`rounded-md p-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-600/30 ${
                  view === 'list'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Result count */}
            {resultCount !== null && (
              <p className="flex items-center gap-2 text-sm text-slate-500 lg:justify-end">
                {status === 'refreshing' && (
                  <span
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
                    aria-hidden="true"
                  />
                )}
                {resultCount} {resultCount === 1 ? 'product' : 'products'}
              </p>
            )}
          </div>

          {/* Active filter chips */}
          {filtersCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Filters
              </span>
              {activeFilters.map((filter) => (
                <ActiveFilterChip key={filter.key} label={filter.label} onClear={filter.clear} />
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-8 gap-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Desktop filter sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">Filters</h2>
                {filtersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 rounded"
                  >
                    Reset
                  </button>
                )}
              </div>
              {filterPanel}
            </div>
          </aside>

          {/* Mobile filter drawer */}
          <MobileFiltersDrawer
            open={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
            count={filtersCount}
          >
            {filterPanel}
          </MobileFiltersDrawer>

          <div>
            {/* Error state */}
            {status === 'error' && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
                <h2 className="mt-4 text-lg font-semibold text-red-800">
                  We couldn&apos;t load the shop
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{error}</p>
                <button type="button" onClick={loadProducts} className="btn-primary mt-6">
                  Try again
                </button>
              </div>
            )}

            {/* Loading skeletons */}
            {status === 'loading' &&
              (view === 'list' ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((key) => (
                    <ProductCardSkeleton key={key} variant="list" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
                    <ProductCardSkeleton key={key} />
                  ))}
                </div>
              ))}

            {/* No-results / empty states */}
            {(status === 'ready' || status === 'refreshing') && products.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  {filtersCount > 0 ? <SearchIcon className="h-8 w-8" /> : <BagIcon className="h-8 w-8" />}
                </span>
                <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                  {filtersCount > 0 ? 'No products match your filters' : 'The shop is getting ready'}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  {filtersCount > 0
                    ? 'Try different keywords, or remove some filters to see more products.'
                    : 'New products are on their way. Check back soon for vet-approved food and care essentials.'}
                </p>
                {filtersCount > 0 && (
                  <button type="button" onClick={clearFilters} className="btn-primary mt-7">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Products */}
            {products.length > 0 && (status === 'ready' || status === 'refreshing') &&
              (view === 'list' ? (
                <div className={`space-y-4 transition-opacity ${status === 'refreshing' ? 'opacity-60' : ''}`}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="list"
                      isFavorite={isFavorite(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className={`grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${status === 'refreshing' ? 'opacity-60' : ''}`}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFavorite={isFavorite(product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </main>

      {/* Quick view */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isFavorite={isFavorite(quickViewProduct.id)}
          onToggleFavorite={() => handleToggleFavorite(quickViewProduct)}
          onAddToCart={handleQuickViewAdd}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  )
}
