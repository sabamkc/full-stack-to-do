import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger, { stream } from '../config/logger';

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req: Request) => {
  return req.userId || 'anonymous';
});

/**
 * Custom Morgan token for request body (sanitized)
 */
morgan.token('body', (req: Request) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return '-';
  }
  
  // Sanitize sensitive fields
  const sanitizedBody = { ...req.body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitizedBody[field]) {
      sanitizedBody[field] = '[REDACTED]';
    }
  });
  
  return JSON.stringify(sanitizedBody);
});

/**
 * Morgan format for development
 * Logs: method, url, status, response-time, user-id
 */
const devFormat = ':method :url :status :response-time ms - :user-id';

/**
 * Morgan format for production
 * Logs: timestamp, method, url, status, response-time, content-length, user-id, ip
 */
const prodFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * Morgan middleware - logs all HTTP requests
 */
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  { stream }
);

/**
 * Custom request logging middleware with additional context
 * Logs request details with Winston for structured logging
 */
export const detailedRequestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Client Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
};

/**
 * Request ID middleware - adds unique ID to each request for tracing
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach to request for use in logs
  (req as any).requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-Id', requestId);
  
  next();
};

/**
 * Error logging middleware
 * Logs errors with full context before passing to error handler
 */
export const errorLogger = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred during request', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    userId: req.userId || 'anonymous',
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: (req as any).requestId,
    body: req.body,
  });

  // Pass error to error handler
  next(err);
};