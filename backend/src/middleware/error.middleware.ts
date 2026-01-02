import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  stack?: string;
  details?: any;
}

/**
 * Global error handling middleware
 * Must be registered AFTER all routes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
  }
  // Handle Zod validation errors
  else if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = (err as any).errors;
  }
  // Handle PostgreSQL errors
  else if ((err as any).code) {
    const pgError = err as any;
    
    // Unique constraint violation
    if (pgError.code === '23505') {
      statusCode = 409;
      errorCode = 'CONFLICT';
      message = 'Resource already exists';
      details = { constraint: pgError.constraint };
    }
    // Foreign key violation
    else if (pgError.code === '23503') {
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      message = 'Referenced resource does not exist';
    }
    // Check constraint violation
    else if (pgError.code === '23514') {
      statusCode = 400;
      errorCode = 'CONSTRAINT_VIOLATION';
      message = 'Data validation failed';
      details = { constraint: pgError.constraint };
    }
    // Not null violation
    else if (pgError.code === '23502') {
      statusCode = 400;
      errorCode = 'MISSING_REQUIRED_FIELD';
      message = 'Required field is missing';
      details = { column: pgError.column };
    }
    else {
      statusCode = 500;
      errorCode = 'DATABASE_ERROR';
      message = 'Database operation failed';
    }
  }
  // Handle generic errors
  else if (err.message) {
    message = err.message;
  }

  // Log error (will be enhanced with Winston in next step)
  console.error('Error occurred:', {
    code: errorCode,
    message,
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.userId,
    stack: err.stack,
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code: errorCode,
    statusCode,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Include additional details if available
  if (details) {
    errorResponse.details = details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Must be registered AFTER all routes but BEFORE error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(
    `Route ${req.method} ${req.path} not found`
  );
  next(error);
};