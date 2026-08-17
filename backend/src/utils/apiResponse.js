export function ok(res, data, meta = undefined, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created(res, data) {
  return ok(res, data, undefined, 201);
}

export function fail(res, status, message, details = undefined) {
  return res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
