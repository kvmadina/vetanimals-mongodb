// ---------------------------------------------------------------------------
// Maps API auth errors to clean, user-friendly messages.
// Used by the Login, Register and Settings pages so users never see a raw
// server string.
// ---------------------------------------------------------------------------
import { isNetworkError } from './api.js'

const MESSAGE_BY_CODE = {
  invalid_credentials: 'The email or password you entered is incorrect. Please try again.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Your password is too short. Use at least 6 characters.',
  same_password: 'New password must be different from your current password.',
  invalid_current_password: 'Your current password is incorrect.',
  'auth-required': 'Your session has expired. Please sign in again.',
}

/**
 * Convert an auth error into a friendly message for the UI.
 *
 * @param {{ code?: string, message?: string } | null} error
 * @param {string} fallback Message shown when the error cannot be mapped.
 * @returns {string} Empty string when `error` is falsy, otherwise a message.
 */
export function getAuthErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  if (isNetworkError(error)) {
    return 'Unable to reach the server. Please check your internet connection and try again.'
  }

  if (error.code && MESSAGE_BY_CODE[error.code]) {
    return MESSAGE_BY_CODE[error.code]
  }

  // Schema validation names the exact field that failed ("Enter a valid email
  // address."), which is more useful than any generic sentence.
  if (error.code === 'validation') {
    return error.message || fallback
  }

  return fallback
}
