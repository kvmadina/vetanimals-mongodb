import { useState } from 'react'

/**
 * Person avatar with an initial-letter fallback when no URL is set or the
 * image fails to load. `alt` is intentionally empty — the person's name is
 * always present as adjacent text.
 * @param {{ src?: string|null, name: string, className?: string }}
 */
export default function Avatar({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false)
  const initial = (name?.trim()?.[0] || 'V').toUpperCase()

  if (!src || failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 ${className}`}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  )
}
