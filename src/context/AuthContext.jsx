import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api.js'

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
  updatePassword: async () => {},
})

/**
 * Wrap an auth call so callers get `{ data, error }` instead of a throw.
 * The Login / Register / Settings pages read the error object and map it to a
 * message with getAuthErrorMessage().
 */
async function toResult(promise) {
  try {
    return { data: await promise, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export function AuthProvider({ children }) {
  // The API returns one object that is both the account and its details, so
  // `user` and `profile` are the same document — kept as two names because
  // the pages read both.
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the stored token on first mount.
  useEffect(() => {
    let active = true

    if (!getToken()) {
      setLoading(false)
      return undefined
    }

    api('/auth/me')
      .then((data) => {
        if (active) setProfile(data.profile)
      })
      .catch(() => {
        // api() already cleared an invalid token; nothing to restore.
        if (active) setProfile(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  /** Re-read the signed-in profile from the server. */
  const refreshProfile = useCallback(async () => {
    if (!getToken()) return null
    const { profile: fresh } = await api('/auth/me')
    setProfile(fresh)
    return fresh
  }, [])

  const signUp = useCallback(
    (email, password, fullName, phone) =>
      toResult(
        api('/auth/register', {
          method: 'POST',
          body: { email, password, full_name: fullName, phone },
        }).then((data) => {
          setToken(data.token)
          setProfile(data.profile)
          // `session` mirrors the shape the Register page already checks for.
          return { user: data.profile, session: { user: data.profile } }
        }),
      ),
    [],
  )

  const signIn = useCallback(
    (email, password) =>
      toResult(
        api('/auth/login', { method: 'POST', body: { email, password } }).then((data) => {
          setToken(data.token)
          setProfile(data.profile)
          return { user: data.profile, session: { user: data.profile } }
        }),
      ),
    [],
  )

  const signOut = useCallback(async () => {
    // Tokens are stateless, so signing out is purely local: drop the token and
    // the app immediately stops being able to reach protected endpoints.
    clearToken()
    setProfile(null)
    return { error: null }
  }, [])

  /**
   * Update the signed-in user's own profile. The server only accepts
   * full_name, phone and avatar_url — role and email can never change here.
   * @param {object} patch
   * @returns {Promise<object>} the updated profile
   */
  const updateProfile = useCallback(async (patch) => {
    const { profile: updated } = await api('/auth/me', { method: 'PATCH', body: patch })
    setProfile(updated)
    return updated
  }, [])

  /**
   * Set a new password for the signed-in user.
   * The server verifies `currentPassword` itself, so a valid token alone is
   * never enough to change the password.
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{ error: object|null }>}
   */
  const updatePassword = useCallback(
    (currentPassword, newPassword) =>
      toResult(
        api('/auth/password', {
          method: 'PATCH',
          body: { current_password: currentPassword, password: newPassword },
        }),
      ),
    [],
  )

  const value = useMemo(
    () => ({
      session: profile ? { user: profile } : null,
      user: profile,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      updatePassword,
    }),
    [
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
