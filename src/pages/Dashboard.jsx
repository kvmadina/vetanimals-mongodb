import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AppHeader from '../components/AppHeader.jsx'
import PageLoader from '../components/PageLoader.jsx'
import {
  AlertIcon,
  BagIcon,
  CalendarIcon,
  ChevronRightIcon,
  HeartIcon,
  LogoutIcon,
  ShieldIcon,
  StethoscopeIcon,
} from '../components/Icons.jsx'

const LIVE_LINKS = [
  {
    icon: CalendarIcon,
    title: 'Appointments',
    body: 'Track and manage your upcoming and past veterinary visits.',
    to: '/appointments',
    cta: 'Manage appointments',
  },
  {
    icon: ShieldIcon,
    title: 'Find a vet',
    body: 'Discover licensed veterinarians and clinics near you.',
    to: '/vets',
    cta: 'Browse veterinarians',
  },
  {
    icon: BagIcon,
    title: 'Products & supplies',
    body: 'Browse vet-approved products for your pets, from food to care essentials.',
    to: '/shop',
    cta: 'Browse the shop',
  },
]

export default function Dashboard() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  // If the profile hasn't loaded yet (e.g. right after a fresh login),
  // fetch it now from public.profiles.
  useEffect(() => {
    if (user && !profile && !refreshing) {
      setRefreshing(true)
      refreshProfile().finally(() => setRefreshing(false))
    }
  }, [user, profile, refreshProfile, refreshing])

  if (loading || refreshing) {
    return <PageLoader label="Loading your dashboard…" />
  }

  const fullName = profile?.full_name?.trim()
  const firstName = fullName?.split(/\s+/)[0] || user?.email?.split('@')[0] || 'there'
  const initial = (fullName?.[0] || user?.email?.[0] || 'V').toUpperCase()
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null

  const handleSignOut = async () => {
    setSigningOut(true)
    setLogoutError('')
    try {
      await signOut()
      // ProtectedRoute sees the signed-out state and redirects to /login.
    } catch (err) {
      console.error('[Dashboard] Sign-out error:', err)
      setLogoutError('Could not sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-slate-500">
            Here&apos;s a quick look at your VetAnimals workspace.
          </p>
        </div>

        {logoutError && (
          <div role="alert" className="form-banner--error mt-6">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{logoutError}</span>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Profile card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">
                  {fullName || 'Member'}
                </p>
                <p className="truncate text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium capitalize text-slate-900">
                  {profile?.role || 'user'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium text-slate-900">{memberSince || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Phone</dt>
                <dd className="truncate font-medium text-slate-900">
                  {profile?.phone || '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2">
              <Link to="/settings" className="btn-secondary w-full">
                Edit profile
              </Link>
              {(profile?.role === 'veterinarian' || profile?.role === 'admin') && (
                <Link to="/vet" className="btn-secondary w-full">
                  <StethoscopeIcon className="h-4 w-4" />
                  Vet desk
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn-secondary mt-3 w-full"
            >
              {signingOut ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                    aria-hidden="true"
                  />
                  Signing out…
                </>
              ) : (
                <>
                  <LogoutIcon className="h-4 w-4" />
                  Sign out
                </>
              )}
            </button>
          </section>

          {/* Workspace cards */}
          <section className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            {/* Live: My pets */}
            <Link
              to="/pets"
              className="group flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <HeartIcon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Ready
                </span>
              </div>
              <h2 className="mt-5 text-base font-semibold text-slate-900">My pets</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Manage your pets&apos; profiles — add, edit and keep track of every
                detail.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                Manage pets
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            {LIVE_LINKS.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Ready
                  </span>
                </div>
                <h2 className="mt-5 text-base font-semibold text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {item.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  {item.cta}
                  <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
