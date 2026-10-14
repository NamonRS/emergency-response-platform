import rateLimit from 'express-rate-limit';
import { HttpError } from '../utils/httpError.js';

// Counts only failed attempts (status >= 400). In-memory store: restarting the server resets it.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new HttpError(429, 'RATE_LIMITED', 'Too many failed login attempts. Please try again in 15 minutes.')),
});