import crypto from 'crypto';

/**
 * CSRF Protection Middleware.
 * Generates session-bound CSRF token, exposes it via readable cookie and response headers,
 * and validates token on mutating HTTP methods.
 */
export function csrfProtection(req, res, next) {
  // Ensure session exists
  if (!req.session) {
    return next();
  }

  // Ensure CSRF token exists on session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  const token = req.session.csrfToken;

  // Set cookie readable by frontend JavaScript
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  // Safe HTTP methods do not require CSRF token validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt auth bootstrap endpoints (login/register establish initial session)
  const exemptPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/logout'
  ];

  if (exemptPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Extract client-provided CSRF token from header or body
  const clientToken = req.headers['x-csrf-token'] || (req.body && req.body._csrf);

  if (!clientToken || clientToken !== token) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_INVALID',
        message: 'Invalid or missing CSRF token. Please refresh the page.'
      }
    });
  }

  next();
}
