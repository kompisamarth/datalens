/**
 * Centralized Express Error Handling Middleware.
 * Returns uniform JSON error response and prevents sensitive stack leak in production.
 */
export function errorHandler(err, req, res, next) {
  // If headers have already been sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected server error occurred.';
  let details = err.details || null;

  // Handle Multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed size of 5 MB.';
    } else {
      errorCode = `UPLOAD_ERROR_${err.code}`;
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle custom file filter error
  if (err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
    errorCode = 'INVALID_FILE_TYPE';
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed for one or more fields.';
    details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = `Invalid resource identifier format: ${err.value}`;
  }

  // Handle JSON Syntax Error (malformed request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'MALFORMED_JSON';
    message = 'Request body contains invalid JSON syntax.';
  }

  // Log error details for debugging (except routine 404/401/400)
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(!isProduction && statusCode >= 500 && { stack: err.stack })
    }
  });
}
