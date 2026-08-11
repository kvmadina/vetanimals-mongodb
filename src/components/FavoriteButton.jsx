import { HeartIcon } from './Icons.jsx'

/**
 * Reusable favorite toggle button.
 * @param {{
 *   isFavorite: boolean,
 *   onToggle: () => void,
 *   label?: string,
 *   size?: 'sm'|'md',
 *   className?: string,
 * }}
 */
export default function FavoriteButton({
  isFavorite,
  onToggle,
  label = 'favorites',
  size = 'md',
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFavorite ? `Remove from ${label}` : `Add to ${label}`}
      aria-pressed={isFavorite}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-emerald-600/40 ${
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
      } ${
        isFavorite
          ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
          : 'border-slate-200 bg-white text-slate-400 shadow-xs hover:border-red-200 hover:text-red-500'
      } ${className}`}
    >
      <HeartIcon
        className={`h-4 w-4 ${isFavorite ? 'animate-heart-pop fill-current' : ''}`}
      />
    </button>
  )
}
