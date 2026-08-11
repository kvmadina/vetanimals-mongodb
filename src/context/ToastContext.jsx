import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AlertIcon, CheckCircleIcon, XIcon } from '../components/Icons.jsx'

const ToastContext = createContext({
  showToast: () => {},
})

let toastId = 0

/**
 * Minimal toast notifications. `showToast(message, { tone, actionLabel, onAction })`
 * auto-dismisses after 3 seconds (longer when an action is present).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (message, { tone = 'success', actionLabel, onAction } = {}) => {
      const id = ++toastId
      setToasts((prev) => [...prev.slice(-3), { id, message, tone, actionLabel, onAction }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), actionLabel ? 5000 : 3000),
      )
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.tone === 'error'
                ? 'border-red-200 bg-white text-red-700'
                : 'border-emerald-200 bg-white text-slate-800'
            }`}
          >
            {toast.tone === 'error' ? (
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismiss(toast.id)
                }}
                className="shrink-0 font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-0.5 text-slate-400 transition hover:text-slate-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
