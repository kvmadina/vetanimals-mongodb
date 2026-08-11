import { PawIcon } from './Icons.jsx'

export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg">
        <span className="absolute -inset-1 rounded-2xl bg-emerald-600/10" aria-hidden="true" />
        <PawIcon className="relative h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
