import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fetchProducts, getShopErrorMessage } from '../lib/shop.js'
import { fetchVeterinarians, getVetsErrorMessage } from '../lib/vets.js'
import { fetchPets } from '../lib/pets.js'
import { fetchAppointments } from '../lib/appointments.js'
import AppHeader from '../components/AppHeader.jsx'
import NearbySection from '../components/NearbySection.jsx'
import ProductCard from '../components/ProductCard.jsx'
import QuickViewModal from '../components/QuickViewModal.jsx'
import VetCard from '../components/VetCard.jsx'
import Avatar from '../components/Avatar.jsx'
import {
  AlertIcon,
  ArrowRightIcon,
  BagIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  HeartIcon,
  PawIcon,
  SearchIcon,
  ShieldIcon,
  ShoppingCartIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

const QUICK_ACTIONS = [
  { icon: PawIcon, label: 'My Pets', desc: 'Profiles & health details', to: '/pets' },
  { icon: ShoppingCartIcon, label: 'Shop', desc: 'Food, toys & essentials', to: '/shop' },
  { icon: StethoscopeIcon, label: 'Find a Veterinarian', desc: 'Trusted local vets', to: '/vets' },
  { icon: BuildingIcon, label: 'Nearby Clinics', desc: 'Directory & maps', to: '/clinics' },
  { icon: CalendarIcon, label: 'Book Appointment', desc: 'Schedule a visit', to: '/appointments/new' },
  { icon: HeartIcon, label: 'Favorites', desc: 'Saved for later', to: '/favorites' },
  { icon: BagIcon, label: 'My Orders', desc: 'Track your purchases', to: '/orders' },
]

const SPECIES = [
  { label: 'Dogs', emoji: '🐶', value: 'dog' },
  { label: 'Cats', emoji: '🐱', value: 'cat' },
  { label: 'Birds', emoji: '🦜', value: 'bird' },
  { label: 'Rabbits', emoji: '🐰', value: 'rabbit' },
  { label: 'Hamsters', emoji: '🐹', value: 'hamster' },
]

const TIPS = [
  {
    icon: ShieldIcon,
    title: 'Preparing for a vet visit',
    body: 'Bring vaccination records, a favourite treat and a familiar carrier. Staying calm helps your pet stay calm too.',
  },
  {
    icon: HeartIcon,
    title: 'Nutrition basics',
    body: 'Feed a species-appropriate diet, keep fresh water available, and follow portion guidance for your pet’s age and size.',
  },
  {
    icon: AlertIcon,
    title: 'When to see a veterinarian',
    body: 'Sudden appetite loss, lethargy, repeated vomiting, trouble breathing or persistent itching are all reasons to book a visit.',
  },
  {
    icon: ClockIcon,
    title: 'Hygiene basics',
    body: 'Regular brushing, ear and eye checks, and dental care keep small problems from becoming big ones.',
  },
  {
    icon: PawIcon,
    title: 'Safe exercise habits',
    body: 'Match activity to your pet’s age and breed, avoid the hottest part of the day, and always have water on hand.',
  },
  {
    icon: CalendarIcon,
    title: 'Vaccination reminders',
    body: 'Follow your veterinarian’s vaccination schedule and keep records up to date — checkups are the best time to review them.',
  },
]

const STEPS = [
  {
    icon: PawIcon,
    title: 'Add your pet',
    body: 'Create profiles with breed, age and health details so everything is ready when you need it.',
  },
  {
    icon: SearchIcon,
    title: 'Find products or a veterinarian',
    body: 'Browse the shop or discover local clinics and specialists who match your pet’s needs.',
  },
  {
    icon: CalendarIcon,
    title: 'Book or order',
    body: 'Schedule an appointment with a clinic or order essentials straight to your door.',
  },
  {
    icon: HeartIcon,
    title: 'Take care of your pet',
    body: 'Track visits, appointments and purchases — all your pet’s care in one place.',
  },
]

/** Rough age from a birth date for display purposes. */
function petAgeLabel(birthDate) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 1) return 'Under 1 month'
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} old`
}

// ---------------------------------------------------------------------------
// Featured products
// ---------------------------------------------------------------------------
function FeaturedProducts() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | error | ready
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState(null)

  const loadProducts = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchProducts({ sort: 'newest', limit: 8 })
      setProducts(data)
      setStatus('ready')
    } catch (err) {
      console.error('[Home] Failed to load featured products:', err)
      setError(getShopErrorMessage(err, "We couldn't load the featured products."))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleToggleFavorite = (product) => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: { from: location, notice: 'Sign in to save products to your favorites.' },
      })
      return
    }
    const wasFavorite = isFavorite(product.id)
    toggleFavorite(product.id)
      .then(() => {
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Home] Favorite error:', err)
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

  const handleQuickViewAdd = (quantity) => {
    if (!quickViewProduct) return
    addItem(quickViewProduct, quantity)
    showToast(`${quickViewProduct.name} added to cart`, {
      actionLabel: 'View cart',
      onAction: () => navigate('/cart'),
    })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Shop
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Popular pet essentials
          </h2>
          <p className="mt-3 text-slate-600">
            Vet-approved food, care essentials and supplies — straight from the
            shop.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
        >
          View all products
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {actionError && (
        <div role="alert" className="form-banner--error mt-6">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {status === 'loading' && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-9 rounded-lg bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
          <p className="mx-auto mt-3 max-w-md text-sm text-red-700">{error}</p>
          <button type="button" onClick={loadProducts} className="btn-primary mt-6">
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && products.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">New products are on their way</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Check back soon for vet-approved food and care essentials.
          </p>
        </div>
      )}

      {status === 'ready' && products.length > 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      )}

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isFavorite={isFavorite(quickViewProduct.id)}
          onToggleFavorite={() => handleToggleFavorite(quickViewProduct)}
          onAddToCart={handleQuickViewAdd}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Featured veterinarians
// ---------------------------------------------------------------------------
function FeaturedVets() {
  const { user } = useAuth()
  const { isVetFavorite, toggleVetFavorite } = useFavorites()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [vets, setVets] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const loadVets = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchVeterinarians()
      setVets(data.slice(0, 6))
      setStatus('ready')
    } catch (err) {
      console.error('[Home] Failed to load veterinarians:', err)
      setError(getVetsErrorMessage(err, "We couldn't load the veterinarians."))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    loadVets()
  }, [loadVets])

  const handleToggleFavorite = (vet) => {
    setActionError('')
    if (!user) {
      navigate('/login', {
        state: { from: location, notice: 'Sign in to save veterinarians to your favorites.' },
      })
      return
    }
    const wasFavorite = isVetFavorite(vet.id)
    toggleVetFavorite(vet.id)
      .then(() => {
        showToast(wasFavorite ? 'Removed from favorites' : 'Saved to your favorites')
      })
      .catch((err) => {
        console.error('[Home] Vet favorite error:', err)
        setActionError('Could not update favorites. Please try again.')
      })
  }

  return (
    <section className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Veterinary care
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Meet our veterinarians
            </h2>
            <p className="mt-3 text-slate-600">
              Licensed professionals across our partner clinics, ready for your
              pet&apos;s next visit.
            </p>
          </div>
          <Link
            to="/vets"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
          >
            View all veterinarians
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {actionError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {status === 'loading' && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-4 h-9 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <AlertIcon className="mx-auto h-8 w-8 text-red-500" />
            <p className="mx-auto mt-3 max-w-md text-sm text-red-700">{error}</p>
            <button type="button" onClick={loadVets} className="btn-primary mt-6">
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && vets.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">Our team is growing</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Veterinarian profiles will appear here as clinics join the platform.
            </p>
          </div>
        )}

        {status === 'ready' && vets.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vets.map((vet) => (
              <VetCard
                key={vet.id}
                vet={vet}
                isFavorite={isVetFavorite(vet.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Next appointment (authenticated only)
// ---------------------------------------------------------------------------
function NextAppointment() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState(null) // null = loading
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    fetchAppointments()
      .then((rows) => {
        if (active) setAppointments(rows)
      })
      .catch((err) => {
        console.error('[Home] Failed to load appointments:', err)
        if (active) {
          setAppointments([])
          setError('We could not load your appointments.')
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const next = useMemo(() => {
    if (!appointments) return null
    const now = new Date()
    return appointments
      .filter(
        (a) =>
          (a.status === 'pending' || a.status === 'confirmed') &&
          new Date(a.appointment_date) >= now,
      )
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0]
  }, [appointments])

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Appointments
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {next ? 'Your next appointment' : 'Your pet’s next checkup starts here'}
              {next && (
                <span
                  className={`ml-3 inline-flex items-center rounded-full px-2.5 py-1 align-middle text-xs font-semibold capitalize ${
                    next.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {next.status}
                </span>
              )}
            </h2>

            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

            {appointments !== null && !next && !error && (
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                No upcoming visits on the calendar. Book a checkup with a local
                clinic and we&apos;ll keep it organised for you.
              </p>
            )}

            {next && (
              <dl className="mt-5 grid max-w-xl gap-x-8 gap-y-3 sm:grid-cols-2">
                <div className="flex items-center gap-2.5">
                  <StethoscopeIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Veterinarian</dt>
                    <dd className="truncate text-sm font-semibold text-slate-900">
                      {next.veterinarians?.name || '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <BuildingIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Clinic</dt>
                    <dd className="truncate text-sm font-semibold text-slate-900">
                      {next.clinics?.name || '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <PawIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Pet</dt>
                    <dd className="truncate text-sm font-semibold text-slate-900">
                      {next.pets?.name || '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Date &amp; time</dt>
                    <dd className="truncate text-sm font-semibold text-slate-900">
                      {new Date(next.appointment_date).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                </div>
              </dl>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3">
            {next ? (
              <Link to="/appointments" className="btn-primary">
                View appointment
              </Link>
            ) : (
              <Link to="/appointments/new" className="btn-primary">
                <CalendarIcon className="h-4 w-4" />
                Book an appointment
              </Link>
            )}
            <Link to="/appointments" className="btn-secondary">
              All appointments
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// My pets preview (authenticated only)
// ---------------------------------------------------------------------------
function MyPetsPreview() {
  const { user } = useAuth()
  const [pets, setPets] = useState(null) // null = loading
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    fetchPets()
      .then((rows) => {
        if (active) setPets(rows)
      })
      .catch((err) => {
        console.error('[Home] Failed to load pets:', err)
        if (active) {
          setPets([])
          setError('We could not load your pets.')
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const preview = useMemo(() => (pets ? pets.slice(0, 4) : []), [pets])

  return (
    <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Family
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">My pets</h2>
        </div>
        <div className="flex gap-3">
          <Link to="/pets" className="btn-secondary">
            View all pets
          </Link>
          <Link to="/pets" className="btn-primary">
            <PawIcon className="h-4 w-4" />
            Add pet
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {pets === null && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      )}

      {pets !== null && preview.length === 0 && !error && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <PawIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">No pets on your profile yet</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Add your pet to book appointments and track their care.
            </p>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {preview.map((pet) => (
            <article
              key={pet.id}
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <Avatar src={pet.avatar_url} name={pet.name} className="h-12 w-12 text-lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{pet.name}</p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {pet.type}
                  {pet.breed ? ` · ${pet.breed}` : ''}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {petAgeLabel(pet.birth_date) || 'Age unknown'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader />

      <main className="flex-1">
        {/* ---------------------------------------------------------- HERO */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-white">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-100/70 blur-3xl"
            aria-hidden="true"
          />
          <PawIcon
            className="pointer-events-none absolute -bottom-10 -left-10 h-72 w-72 -rotate-12 text-emerald-700 opacity-[0.05]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Everything a pet owner needs
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Everything your pet needs,
                <br />
                <span className="text-emerald-700">all in one place.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                VetAnimals brings together pet products, veterinary clinics and
                veterinarians, appointments, pet management and pet-care
                guidance — so your whole pet-care routine lives in one trusted
                place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/vets" className="btn-primary px-6 py-3 text-base">
                  <StethoscopeIcon className="h-5 w-5" />
                  Find a Veterinarian
                </Link>
                <Link to="/shop" className="btn-secondary px-6 py-3 text-base">
                  <ShoppingCartIcon className="h-5 w-5" />
                  Shop for Pets
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- QUICK ACTIONS */}
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {action.label}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{action.desc}</span>
                </span>
                <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ NEARBY MAP */}
        <NearbySection />

        {/* ---------------------------------------------- FEATURED PRODUCTS */}
        <FeaturedProducts />

        {/* --------------------------------------------------- SHOP BY PET */}
        <section className="border-t border-slate-200/80 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                Shop by pet
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Shop for your pet
              </h2>
              <p className="mt-3 text-slate-600">
                Jump straight to products for your pet&apos;s species.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {SPECIES.map((species) => (
                <Link
                  key={species.value}
                  to={`/shop?species=${species.value}`}
                  className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
                >
                  <span className="text-xl" aria-hidden="true">
                    {species.emoji}
                  </span>
                  {species.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- FEATURED VETS */}
        <FeaturedVets />

        {/* ------------------------------------------ NEXT APPOINTMENT + PETS */}
        {user && (
          <div className="border-t border-slate-200/80 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
              <NextAppointment />
              <MyPetsPreview />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- PET CARE TIPS */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Learn
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Pet care tips
            </h2>
            <p className="mt-3 text-slate-600">
              Practical guidance for everyday pet parenting. Educational only —
              always ask a veterinarian for medical advice.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TIPS.map((tip) => (
              <article
                key={tip.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition duration-200 hover:border-slate-300 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <tip.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{tip.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{tip.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------- HOW IT WORKS */}
        <section className="border-t border-slate-200/80 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                Getting started
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                How VetAnimals works
              </h2>
            </div>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                  <span className="absolute right-4 top-4 text-4xl font-extrabold text-slate-200" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ----------------------------------------------------- FINAL CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center shadow-lg sm:px-16">
            <PawIcon
              className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 rotate-12 text-white opacity-[0.06]"
              aria-hidden="true"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Your pet deserves the best care.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Join VetAnimals to shop, book visits and keep every part of your
                pet&apos;s care organised.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/vets" className="btn-primary bg-white px-6 py-3 text-base text-slate-900 hover:bg-slate-100">
                  <StethoscopeIcon className="h-5 w-5" />
                  Find a Veterinarian
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/20"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-sm font-semibold text-slate-700">VetAnimals</p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} VetAnimals Pet-Owner Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
