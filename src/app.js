import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

import authRoutes from "./routes/auth.routes.js";
import matchRoutes from "./routes/match.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import gigRoutes from "./routes/gig.routes.js";

import { authLimiter, matchLimiter, globalLimiter } from "./middlewares/rateLimiter.js";
import logger from "./utils/logger.js";

const app = express();

// ── 1. Security Headers ────────────────────────────────────────────────────────
// Adds 14 protective HTTP headers automatically:
// X-XSS-Protection, X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet());

// ── 2. CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

// ── 3. Global Rate Limiter ─────────────────────────────────────────────────────
app.use(globalLimiter);

// ── 4. Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ── 5. NoSQL Injection Protection ────────────────────────────────────────────
// Strips MongoDB operators ($gt, $regex etc.) from req.body and req.params
// Prevents: { "email": { "$gt": "" } } login bypass attacks
app.use(mongoSanitize());

// ── 6. Routes (with specific limiters on sensitive routes) ────────────────────
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/match", matchLimiter, matchRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/gig", gigRoutes);

// ── 7. Global Error Handler — ALWAYS LAST ─────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // log all 500 errors to the error.log file
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`, err);
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
  });
});

export { app };