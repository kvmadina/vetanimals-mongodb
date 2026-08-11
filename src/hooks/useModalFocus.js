import { useEffect, useRef } from 'react'

/**
 * Focus management for modals and drawers.
 *
 * When `open` becomes true, focus moves to the first focusable element inside
 * the container (falling back to the container itself); when it closes, focus
 * is restored to the element that had it before the modal opened. This keeps
 * keyboard users inside the dialog while it is open and returns them where
 * they were afterwards.
 *
 * Usage:
 *   const ref = useModalFocus(open)
 *   return <div ref={ref} ...>
 *
 * @param {boolean} open
 * @returns {import('react').RefObject<HTMLElement>}
 */
export function useModalFocus(open) {
  const containerRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement
    const container = containerRef.current
    if (!container) return

    const focusable = container.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    // Defer so the dialog is painted before focus lands (avoids scroll jumps).
    const frame = requestAnimationFrame(() => {
      if (focusable) {
        focusable.focus()
      } else {
        // Containers (divs/asides) aren't focusable by default — make it the
        // focus target so keyboard focus lands somewhere inside the dialog.
        if (!container.hasAttribute('tabindex')) container.tabIndex = -1
        container.focus()
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  return containerRef
}
