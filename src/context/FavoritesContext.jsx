import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  addClinicFavorite,
  addFavorite,
  addVetFavorite,
  fetchFavoriteClinicIds,
  fetchFavoriteProductIds,
  fetchFavoriteVetIds,
  removeClinicFavorite,
  removeFavorite,
  removeVetFavorite,
} from '../lib/favorites.js'

const FavoritesContext = createContext({
  favoriteIds: new Set(),
  favoritesLoading: false,
  isFavorite: () => false,
  toggleFavorite: async () => {},
  isVetFavorite: () => false,
  toggleVetFavorite: async () => {},
  isClinicFavorite: () => false,
  toggleClinicFavorite: async () => {},
})

/**
 * Favorites state. Supabase (public.favorites) is the single source of truth
 * for authenticated users. Supports three target types — products,
 * veterinarians and clinics — each enforced by its own partial unique index.
 * Unauthenticated users have empty sets; toggles throw { code: 'auth-required' }.
 */
export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const [vetFavoriteIds, setVetFavoriteIds] = useState(() => new Set())
  const [clinicFavoriteIds, setClinicFavoriteIds] = useState(() => new Set())
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  // Reload all favorite types whenever the signed-in user changes
  useEffect(() => {
    const userId = user?.id
    if (!userId) {
      setFavoriteIds(new Set())
      setVetFavoriteIds(new Set())
      setClinicFavoriteIds(new Set())
      setFavoritesLoading(false)
      return
    }
    let active = true
    setFavoritesLoading(true)
    Promise.all([
      fetchFavoriteProductIds(userId),
      fetchFavoriteVetIds(userId),
      fetchFavoriteClinicIds(userId),
    ])
      .then(([productIds, vetIds, clinicIds]) => {
        if (!active) return
        setFavoriteIds(new Set(productIds))
        setVetFavoriteIds(new Set(vetIds))
        setClinicFavoriteIds(new Set(clinicIds))
      })
      .catch((err) => {
        console.error('[Favorites] Failed to load favorites:', err)
      })
      .finally(() => {
        if (active) setFavoritesLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.id])

  // -------------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------------
  const isFavorite = useCallback((productId) => favoriteIds.has(productId), [favoriteIds])

  const toggleFavorite = useCallback(
    async (productId) => {
      if (!user) throw authRequiredError()

      const wasFavorite = favoriteIds.has(productId)

      // Optimistic update, rolled back if Supabase rejects the change
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.delete(productId)
        else next.add(productId)
        return next
      })

      try {
        if (wasFavorite) {
          await removeFavorite(user.id, productId)
        } else {
          await addFavorite(user.id, productId)
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(productId)
          else next.delete(productId)
          return next
        })
        throw err
      }
    },
    [user, favoriteIds],
  )

  // -------------------------------------------------------------------------
  // Veterinarians
  // -------------------------------------------------------------------------
  const isVetFavorite = useCallback((vetId) => vetFavoriteIds.has(vetId), [vetFavoriteIds])

  const toggleVetFavorite = useCallback(
    async (vetId) => {
      if (!user) throw authRequiredError()

      const wasFavorite = vetFavoriteIds.has(vetId)
      setVetFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.delete(vetId)
        else next.add(vetId)
        return next
      })

      try {
        if (wasFavorite) {
          await removeVetFavorite(user.id, vetId)
        } else {
          await addVetFavorite(user.id, vetId)
        }
      } catch (err) {
        setVetFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(vetId)
          else next.delete(vetId)
          return next
        })
        throw err
      }
    },
    [user, vetFavoriteIds],
  )

  // -------------------------------------------------------------------------
  // Clinics
  // -------------------------------------------------------------------------
  const isClinicFavorite = useCallback(
    (clinicId) => clinicFavoriteIds.has(clinicId),
    [clinicFavoriteIds],
  )

  const toggleClinicFavorite = useCallback(
    async (clinicId) => {
      if (!user) throw authRequiredError()

      const wasFavorite = clinicFavoriteIds.has(clinicId)
      setClinicFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.delete(clinicId)
        else next.add(clinicId)
        return next
      })

      try {
        if (wasFavorite) {
          await removeClinicFavorite(user.id, clinicId)
        } else {
          await addClinicFavorite(user.id, clinicId)
        }
      } catch (err) {
        setClinicFavoriteIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(clinicId)
          else next.delete(clinicId)
          return next
        })
        throw err
      }
    },
    [user, clinicFavoriteIds],
  )

  const value = useMemo(
    () => ({
      favoriteIds,
      vetFavoriteIds,
      clinicFavoriteIds,
      favoritesLoading,
      isFavorite,
      toggleFavorite,
      isVetFavorite,
      toggleVetFavorite,
      isClinicFavorite,
      toggleClinicFavorite,
    }),
    [
      favoriteIds,
      vetFavoriteIds,
      clinicFavoriteIds,
      favoritesLoading,
      isFavorite,
      toggleFavorite,
      isVetFavorite,
      toggleVetFavorite,
      isClinicFavorite,
      toggleClinicFavorite,
    ],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  return useContext(FavoritesContext)
}

function authRequiredError() {
  const err = new Error('Sign in required')
  err.code = 'auth-required'
  return err
}
