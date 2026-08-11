import { Link } from 'react-router-dom'
import {
  CalendarIcon,
  CheckIcon,
  HeartIcon,
  PawIcon,
  ShieldIcon,
} from './Icons.jsx'

const FEATURES = [
  {
    title: 'Pet health records',
    body: 'Vaccinations, weight and visit history — all in one place.',
  },
  {
    title: 'Easy clinic bookings',
    body: 'Schedule and manage appointments with trusted clinics.',
  },
  {
    title: 'Trusted veterinarians',
    body: 'Connect with licensed professionals who genuinely care.',
  },
]

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-emerald-950 p-10 text-white lg:flex xl:p-14">
        <PawIcon
          className="pointer-events-none absolute -right-12 -top-12 h-80 w-80 rotate-12 text-emerald-400 opacity-[0.05]"
          aria-hidden="true"
        />
        <PawIcon
          className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 -rotate-12 text-emerald-400 opacity-[0.05]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-800 shadow-lg">
            <PawIcon className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold tracking-tight">VetAnimals</span>
        </Link>

        <div className="relative my-auto max-w-md py-16">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Modern pet care, all in one place.
          </h2>
          <p className="mt-4 text-emerald-100/80">
            Keep your pets healthy with digital records, easy appointments and a
            team of trusted veterinarians.
          </p>

          <ul className="mt-10 space-y-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-emerald-100/70">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-emerald-50">
            Trusted &amp; private by design
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-emerald-100/70">
            <li className="flex gap-2.5">
              <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              Every record is locked to your account — only you can see your
              pets, appointments and orders.
            </li>
            <li className="flex gap-2.5">
              <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              Book visits with licensed veterinarians and track them in one
              place.
            </li>
            <li className="flex gap-2.5">
              <HeartIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              From food to checkups — everything for every family member.
            </li>
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <PawIcon className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              VetAnimals
            </span>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure sign-in powered by Supabase Auth
          </p>
        </div>
      </main>
    </div>
  )
}
