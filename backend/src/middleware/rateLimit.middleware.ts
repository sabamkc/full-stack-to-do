import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger';

/**
 * Rate limit handler - logs when rate limit is exceeded
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: req.userId || 'anonymous',
    path: req.path,
    method: req.method,
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Skip rate limiting for certain conditions
 * Can be customized to skip trusted IPs, health checks, etc.
 */
const skipRateLimit = (req: Request): boolean => {
  // Skip rate limiting for health check endpoint
  if (req.path === '/health') {
    return true;
  }

  // Skip for trusted IPs (e.g., monitoring services)
  const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
  if (req.ip && trustedIPs.includes(req.ip)) {
    return true;
  }

  return false;
};

/**
 * General rate limiter - 100 requests per minute
 * Applied to authenticated users (based on user ID)
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per user
  message: 'Too many requests from this user, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use default key generator (handles IPv6 correctly)
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Strict rate limiter for unauthenticated requests - 20 requests per minute
 * Applied to IP addresses (for anonymous users)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator (handles IPv6 correctly)
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Auth rate limiter - stricter limits for login/register endpoints
 * Prevents brute force attacks on authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Create/Update rate limiter - moderate limits for write operations
 * Prevents spam and abuse of resource creation
 */
export const createRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 create/update operations per minute
  message: 'Too many create/update requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Search/Query rate limiter - limits expensive query operations
 * Prevents database overload from search operations
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 search requests per minute
  message: 'Too many search requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator
  handler: rateLimitHandler,
  skip: skipRateLimit,
});

/**
 * Flexible rate limiter factory
 * Create custom rate limiters with specific configurations
 */
export const createCustomRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Rate limit exceeded.',
    standardHeaders: true,
    legacyHeaders: false,
    // Use default key generator
    handler: rateLimitHandler,
    skip: skipRateLimit,
  });
};