import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/apiResponse.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof ApiError ? err.status : err.status || 500;
  const message = status >= 500 ? "Internal server error" : err.message || "Request failed";

  if (status >= 500) {
    logger.error("Unhandled error:", err);
  } else {
    logger.warn("Request error:", err.message);
  }

  // Never expose internal stack traces to the frontend.
  res.status(status).json({
    success: false,
    error: {
      message,
      ...(err instanceof ApiError && err.details ? { details: err.details } : {}),
    },
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
