/**
 * Require valid authenticated user session.
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in to continue.'
      }
    });
  }
  next();
}

/**
 * Optional authentication middleware: attaches userId if present without rejecting if absent.
 */
export function optionalAuth(req, res, next) {
  // If session has userId, it will be accessible in req.session.userId
  next();
}
