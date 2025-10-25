import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Store for tracking login attempts per IP
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Clean up old entries every 5 minutes (only in non-test environments)
let cleanupInterval: any | null = null;
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts.entries()) {
      if (now - data.lastAttempt > 15 * 60 * 1000) { // 15 minutes
        loginAttempts.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

// Cleanup function for tests
export const cleanupRateLimiting = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  loginAttempts.clear();
};

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment unless explicitly enabled
  skip: (_req: Request) => {
    return process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMITING !== 'true';
  }
});

// Stricter rate limiting for login attempts
export const loginRateLimit = (req: Request, res: Response, next: Function) => {
  // Skip in test environment unless explicitly enabled
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMITING !== 'true') {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Allow 5 failed attempts per window

  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return next();
  }

  // Reset if outside window
  if (now - attempts.lastAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return next();
  }

  // Check if exceeded limit
  if (attempts.count >= maxAttempts) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.'
      }
    });
  }

  // Increment attempt count
  attempts.count++;
  attempts.lastAttempt = now;
  next();
};

// Reset login attempts on successful login
export const resetLoginAttempts = (req: Request) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  loginAttempts.delete(ip);
};

// Test-specific rate limiting that can be enabled
export const testRateLimit = rateLimit({
  windowMs: 1000, // 1 second window for testing
  max: 10, // Allow 10 requests per second
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply in test environment when enabled
  skip: (_req: Request) => {
    return process.env.NODE_ENV !== 'test' || process.env.ENABLE_RATE_LIMITING !== 'true';
  }
});

export default {
  generalRateLimit,
  loginRateLimit,
  resetLoginAttempts,
  testRateLimit,
  cleanupRateLimiting
};
