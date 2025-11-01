import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: true,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 100 : 5, // Higher limit in development
  message: {
    error: true,
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Too many authentication attempts",
  },
});
