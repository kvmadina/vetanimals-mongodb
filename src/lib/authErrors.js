// ---------------------------------------------------------------------------
// Maps raw Supabase auth errors to clean, user-friendly messages.
// Used by the Login and Register pages so users never see raw SDK strings.
// ---------------------------------------------------------------------------

const MESSAGE_BY_CODE = {
  invalid_credentials: 'The email or password you entered is incorrect. Please try again.',
  email_not_confirmed: 'Please confirm your email address first. Check your inbox for the confirmation link.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  email_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Your password is too weak. Use at least 6 characters with a mix of letters and numbers.',
  over_email_send_rate_limit: 'Too many emails were sent recently. Please wait a moment and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  invalid_api_key: 'Authentication is temporarily unavailable. Please try again shortly.',
  user_not_found: 'No account found with this email address.',
  unexpected_failure: 'Something went wrong while processing your request. Please try again.',
  // Password recovery
  recovery_disabled: 'Password recovery is not enabled for this project.',
  link_expired: 'This recovery link has expired. Request a new one and try again.',
  bad_code_verifier: 'This recovery link is invalid or has already been used. Request a new one and try again.',
  email_provider_disabled: 'Email delivery is not configured for this project yet.',
  same_password: 'New password must be different from your current password.',
}

// Fallback matchers for older SDK messages that carry no structured error code.
const MESSAGE_PATTERNS = [
  { pattern: /invalid login credentials/i, message: MESSAGE_BY_CODE.invalid_credentials },
  { pattern: /email not confirmed/i, message: MESSAGE_BY_CODE.email_not_confirmed },
  { pattern: /user already registered|already been registered|email already/i, message: MESSAGE_BY_CODE.user_already_exists },
  { pattern: /password should be at least/i, message: MESSAGE_BY_CODE.weak_password },
  { pattern: /rate limit|too many (requests|emails)/i, message: 'Too many requests. Please wait a moment and try again.' },
  { pattern: /network|failed to fetch|fetch failed|load failed/i, message: 'Unable to reach the server. Please check your internet connection and try again.' },
  { pattern: /user not found/i, message: MESSAGE_BY_CODE.user_not_found },
]

/**
 * Convert a Supabase auth error into a friendly message for the UI.
 *
 * @param {{ code?: string|number, message?: string } | null} error
 * @param {string} fallback Message shown when the error cannot be mapped.
 * @returns {string} Empty string when `error` is falsy, otherwise a friendly message.
 */
export function getAuthErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return ''

  const code = error.code || error.status
  if (code && MESSAGE_BY_CODE[code]) {
    return MESSAGE_BY_CODE[code]
  }

  const raw = String(error.message || '')
  for (const { pattern, message } of MESSAGE_PATTERNS) {
    if (pattern.test(raw)) {
      return message
    }
  }

  return fallback
}
