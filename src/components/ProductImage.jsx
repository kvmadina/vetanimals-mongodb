import { useState } from 'react'
import { PawIcon } from './Icons.jsx'

/**
 * Product image with a paw-print placeholder when no URL is set or the
 * image fails to load.
 * @param {{ src?: string|null, alt: string, className?: string }}
 */
export default function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}
        role="img"
        aria-label={alt}
      >
        <PawIcon className="h-8 w-8" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
