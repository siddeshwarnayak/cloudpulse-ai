import { ApiError } from "../utils/apiResponse.js";

/**
 * Lightweight body validator: pass a map of field -> validator function.
 * Avoids pulling in a schema library for a small MVP surface area.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const errors = [];
    for (const [field, validator] of Object.entries(schema)) {
      const value = req.body?.[field];
      const result = validator(value);
      if (result !== true) errors.push(`${field}: ${result}`);
    }
    if (errors.length > 0) {
      return next(new ApiError(400, "Validation failed", errors));
    }
    next();
  };
}

export const isNonEmptyString = (v) => (typeof v === "string" && v.trim().length > 0) || "must be a non-empty string";
export const isEmail = (v) => (typeof v === "string" && /\S+@\S+\.\S+/.test(v)) || "must be a valid email";
export const isMinLength = (min) => (v) =>
  (typeof v === "string" && v.length >= min) || `must be at least ${min} characters`;
export const isOptionalString = (v) => v === undefined || typeof v === "string" || "must be a string";
