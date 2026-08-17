import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, 401, "Missing or invalid Authorization header");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return fail(res, 401, "Invalid or expired token");
  }
}

// Optional auth: attaches req.user if a valid token is present, but does
// not block the request otherwise. The dashboard MVP mostly reads public
// simulated data, so most routes stay open; this is available for any
// route that wants to personalize without hard-requiring login.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET);
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
