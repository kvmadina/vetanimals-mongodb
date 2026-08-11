import { useEffect } from 'react'
import { useModalFocus } from '../hooks/useModalFocus.js'
import ProductImage from './ProductImage.jsx'
import { XIcon } from './Icons.jsx'

/**
 * Fullscreen image viewer. Mounted only while open.
 * @param {{ src?: string|null, alt: string, onClose: () => void }}
 */
export default function ImageLightbox({ src, alt, onClose }) {
  const dialogRef = useModalFocus(true)

  useEffect(() => {
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
  }, [onClose])

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-4 top-4 rounded-lg bg-white/10 p-2.5 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <XIcon className="h-6 w-6" />
      </button>
      <div className="max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <ProductImage src={src} alt={alt} className="max-h-[85vh] w-full object-contain" />
      </div>
    </div>
  )
}
