// ---------------------------------------------------------------------------
// Central error handling.
//
// The rule from the lesson: a request the client got wrong is a 400, a server
// that broke is a 500 — never the other way round. The frontend's
// getXErrorMessage() helpers read the `code` field to pick a friendly message.
// ---------------------------------------------------------------------------

/** Error with an HTTP status and a stable code the frontend can branch on. */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const notFound = (message = 'Not found.') => new ApiError(404, message, 'not-found')
export const forbidden = (message = 'You do not have permission to perform that action.') =>
  new ApiError(403, message, 'forbidden')
export const badRequest = (message, code = 'bad-request') => new ApiError(400, message, code)
export const unauthorized = (message = 'Sign in required.') =>
  new ApiError(401, message, 'auth-required')

/** Wraps an async route handler so a rejected promise reaches this handler. */
export const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

/** 404 for unknown paths — must be mounted after all routes. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Unknown endpoint: ${req.method} ${req.originalUrl}`, code: 'not-found' })
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(error, req, res, _next) {
  // Schema rules rejected the document — the client sent something invalid.
  if (error.name === 'ValidationError') {
    const problems = Object.values(error.errors).map((item) => item.message)
    return res.status(400).json({
      error: problems[0] || 'Some of the values are not valid.',
      code: 'validation',
      problems,
    })
  }

  // A malformed id ("abc" where an ObjectId was expected) is a client mistake.
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'One of the ids is not valid.', code: 'invalid-id' })
  }

  // Unique index violation.
  if (error.code === 11000) {
    return res.status(409).json({ error: 'That record already exists.', code: 'duplicate' })
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message, code: error.code })
  }

  // Anything left is our fault. Log the detail, send the client nothing
  // internal — there is no reason to describe the server to whoever breaks it.
  console.error('[server] Unhandled error:', error)
  res.status(500).json({ error: 'Server error.', code: 'server-error' })
}
