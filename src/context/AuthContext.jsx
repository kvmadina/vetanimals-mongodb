import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch profile details from the public.profiles table.
  // `authUser` is the full Supabase user (needs `.id` and `.user_metadata`).
  const fetchProfile = useCallback(async (authUser) => {
    if (!supabase || !authUser?.id) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        // 42P01 means the table does not exist yet (during initial dev)
        if (error.code !== '42P01') {
          console.error('[AuthContext] Error fetching profile:', error.message)
        }
        return null
      }

      // The signup trigger does not copy `phone` from auth metadata into
      // public.profiles — backfill it here when present. RLS allows users to
      // update their own row and the integrity trigger only blocks role/email
      // changes, so this is safe.
      const metaPhone = authUser.user_metadata?.phone
      if (data && !data.phone && metaPhone) {
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ phone: metaPhone })
          .eq('id', authUser.id)
          .select()
          .maybeSingle()
        if (!updateError && updated) {
          return updated
        }
      }

      return data
    } catch (err) {
      console.error('[AuthContext] Unexpected error fetching profile:', err)
      return null
    }
  }, [])

  // Handle auth state changes: initial session + live subscription
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    // 1. Get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (!active) return
      setSession(initial)
      setUser(initial?.user ?? null)
      setProfile(initial?.user ? await fetchProfile(initial.user) : null)
      setLoading(false)
    })

    // 2. Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } =    supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setProfile(nextSession?.user ? await fetchProfile(nextSession.user) : null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  // Re-fetch the profile for the current session (used after updates / on page mount)
  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user) return null
    const fresh = await fetchProfile(session.user)
    setProfile(fresh)
    return fresh
  }, [session, fetchProfile])

  // Sign Up — passes profile details via user metadata so the existing
  // `handle_new_user()` database trigger creates the public.profiles row.
  const signUp = useCallback(async (email, password, fullName, phone) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    })
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signInWithPassword({
      email,
      password,
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signOut()
  }, [])

  /**
   * Update the signed-in user's public.profiles row.
   * RLS allows users to update their own row; the integrity trigger blocks
   * role/email changes, so those fields can never be touched from here.
   * @param {object} patch
   * @returns {Promise<object|null>} the updated profile row
   */
  const updateProfile = useCallback(
    async (patch) => {
      if (!supabase || !user?.id) throw new Error('Sign in required')
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select()
        .maybeSingle()
      if (error) throw error
      if (data) setProfile(data)
      return data
    },
    [user?.id],
  )

  /**
   * Send a password-recovery email.
   * @param {string} email
   * @returns {Promise<{ error: object|null }>}
   */
  const resetPassword = useCallback(async (email) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }, [])

  /**
   * Set a new password for the current session (used by the recovery page,
   * where the recovery link has already established a temporary session).
   * @param {string} newPassword
   * @returns {Promise<{ error: object|null }>}
   */
  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.updateUser({ password: newPassword })
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      resetPassword,
      updatePassword,
    }),
    [
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      resetPassword,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
