import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useFavorites } from '../context/FavoritesContext.jsx'
import { AlertIcon, HeartIcon, LogoutIcon, PawIcon, ShoppingCartIcon } from './Icons.jsx'

export default function AppHeader() {
  const { user, profile, signOut } = useAuth()
  const { count } = useCart()
  const { favoriteIds, vetFavoriteIds, clinicFavoriteIds } = useFavorites()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  const favoriteCount =
    favoriteIds.size + vetFavoriteIds.size + clinicFavoriteIds.size

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'friend'
  const initial = (
    profile?.full_name?.trim()?.[0] ||
    user?.email?.[0] ||
    'V'
  ).toUpperCase()

  const handleSignOut = async () => {
    setSigningOut(true)
    setError('')
    try {
      await signOut()
    } catch (err) {
      console.error('[AppHeader] Sign-out error:', err)
      setError('Could not sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const navLinkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
            <PawIcon className="h-5 w-5" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-slate-900 min-[400px]:block">
            VetAnimals
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="hidden sm:block">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
          </div>
          <NavLink to="/shop" className={navLinkClass}>
            Shop
          </NavLink>
          <NavLink to="/vets" className={navLinkClass}>
            Find a vet
          </NavLink>
          <NavLink to="/clinics" className={navLinkClass}>
            Clinics
          </NavLink>
          {user && (
            <>
              <NavLink to="/appointments" className={navLinkClass}>
                Appointments
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>
              {(profile?.role === 'admin' || profile?.role === 'veterinarian') && (
                <NavLink to="/vet" className={navLinkClass}>
                  Vet desk
                </NavLink>
              )}
              {profile?.role === 'admin' && (
                <NavLink to="/admin/orders" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/pets" className={navLinkClass}>
                My pets
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                Settings
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <Link
              to="/favorites"
              aria-label={`Favorites with ${favoriteCount} ${favoriteCount === 1 ? 'item' : 'items'}`}
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-red-200 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              <HeartIcon
                className={`h-4 w-4 ${favoriteCount > 0 ? 'fill-current text-red-500' : ''}`}
              />
              {favoriteCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {favoriteCount > 99 ? '99+' : favoriteCount}
                </span>
              )}
            </Link>
          )}
          <Link
            to="/cart"
            aria-label={`Cart with ${count} ${count === 1 ? 'item' : 'items'}`}
            className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] font-bold text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                  {initial}
                </span>
                <div className="leading-tight">
                  <p className="max-w-[10rem] truncate text-sm font-semibold text-slate-900">
                    {firstName}
                  </p>
                  <p className="text-xs capitalize text-slate-400">
                    {profile?.role || 'member'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                    aria-hidden="true"
                  />
                ) : (
                  <LogoutIcon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary hidden sm:inline-flex"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          <span className="inline-flex items-center gap-2">
            <AlertIcon className="h-4 w-4" />
            {error}
          </span>
        </div>
      )}
    </header>
  )
}
