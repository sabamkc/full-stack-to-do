import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { DecodedIdToken } from 'firebase-admin/auth';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      userId?: string;
    }
  }
}

/**
 * Middleware to verify Firebase authentication token
 * Extracts token from Authorization header and validates it
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication token is missing or malformed.',
        code: 'AUTH_TOKEN_INVALID'
      });
      return;
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Attach user info to request
    req.user = decodedToken;
    req.userId = decodedToken.uid;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message);

    // Handle specific Firebase auth errors
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: 'Authentication token has expired. Please sign in again.',
        code: 'AUTH_TOKEN_EXPIRED'
      });
      return;
    }

    if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({
        success: false,
        error: 'Authentication token has been revoked. Please sign in again.',
        code: 'AUTH_TOKEN_REVOKED'
      });
      return;
    }

    if (error.code === 'auth/argument-error') {
      res.status(401).json({
        success: false,
        error: 'Invalid authentication token format.',
        code: 'AUTH_TOKEN_INVALID'
      });
      return;
    }

    // Generic authentication failure
    res.status(401).json({
      success: false,
      error: 'Authentication failed. Invalid or expired token.',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but continues even if token is invalid
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (token) {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
      req.userId = decodedToken.uid;
    }
    
    next();
  } catch (error) {
    // Token validation failed, but continue anyway
    console.warn('Optional auth failed, continuing without authentication');
    next();
  }
};