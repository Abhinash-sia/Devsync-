import rateLimit from "express-rate-limit";

// ─── AUTH LIMITER — tight restriction ─────────────────────────────────────────
// Prevents brute-force attacks on login/register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 requests per IP per 15 minutes
  standardHeaders: true,     // send RateLimit headers in response
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  // skip successful requests — only count failed ones
  skipSuccessfulRequests: true,
});

// ─── MATCH LIMITER — looser restriction ───────────────────────────────────────
// Prevents spam swiping
export const matchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,                  // max 100 swipes per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "You're swiping too fast. Please slow down.",
  },
});

// ─── GLOBAL API LIMITER — general protection ──────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 500,                  // max 500 requests per IP per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please try again later.",
  },
});