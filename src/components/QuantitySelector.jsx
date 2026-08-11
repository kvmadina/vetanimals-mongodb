import { MinusIcon, PlusIcon } from './Icons.jsx'

/**
 * Quantity stepper, clamped between `min` and `max`.
 * @param {{ value: number, onChange: (next: number) => void, min?: number, max?: number, disabled?: boolean, size?: 'sm'|'md'|'lg' }}
 */
export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
}) {
  const clamp = (n) => Math.min(max, Math.max(min, n))
  const decDisabled = disabled || value <= min
  const incDisabled = disabled || value >= max
  const sizing =
    size === 'lg'
      ? 'h-12 min-w-10 text-base'
      : size === 'sm'
        ? 'h-8 min-w-7 text-sm'
        : 'h-10 min-w-9 text-sm'

  const buttonClass =
    'inline-flex h-full items-center justify-center px-2.5 text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600/30'

  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xs ${sizing} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={decDisabled}
        aria-label="Decrease quantity"
        className={buttonClass}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="min-w-7 px-1 text-center font-semibold text-slate-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={incDisabled}
        aria-label="Increase quantity"
        className={buttonClass}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
