import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'vetanimals:cart'

const CartContext = createContext({
  items: [],
  count: 0,
  subtotal: 0,
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  isInCart: () => false,
  isCartOpen: false,
  openCart: () => {},
  closeCart: () => {},
})

/** Load the cart from localStorage, tolerating corrupt/legacy data. */
function loadCart() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0,
    )
  } catch {
    return []
  }
}

/**
 * Cart state for the whole app (guest carts included). Persists to
 * localStorage; quantities are always clamped to available stock.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage unavailable (private mode etc.) — cart still works in memory.
    }
  }, [items])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  const addItem = useCallback(
    (product, quantity = 1) => {
      const stock = Number(product.stock) || 0
      if (stock <= 0) return false
      const qty = Math.max(1, Math.min(quantity, stock))
      setItems((prev) => {
        const existing = prev.find((item) => item.id === product.id)
        if (existing) {
          return prev.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + qty, stock) }
              : item,
          )
        }
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image_url: product.image_url || null,
            stock,
            species: product.species || null,
            quantity: qty,
          },
        ]
      })
      // Open the mini cart drawer as immediate feedback
      setIsCartOpen(true)
      return true
    },
    [],
  )

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
          : item,
      ),
    )
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const isInCart = useCallback(
    (productId) => items.some((item) => item.id === productId),
    [items],
  )

  const { count, subtotal } = useMemo(() => {
    let totalCount = 0
    let totalPrice = 0
    for (const item of items) {
      totalCount += item.quantity
      totalPrice += Number(item.price) * item.quantity
    }
    return {
      count: totalCount,
      subtotal: Math.round(totalPrice * 100) / 100,
    }
  }, [items])

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      isInCart,
      isCartOpen,
      openCart,
      closeCart,
    }),
    [
      items,
      count,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      isInCart,
      isCartOpen,
      openCart,
      closeCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
