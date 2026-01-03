import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { asyncHandler } from '../middleware/error.middleware';
import * as userService from '../services/user.service';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/error.middleware';
import logger from '../config/logger';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (creates Firebase user + database record)
 * @access  Public
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  // Validate input (already done by validation middleware, but good for type inference)
  const { email, password, displayName } = registerSchema.parse(req.body);

  // Create user in Firebase Authentication
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new ConflictError('Email already registered');
    }
    logger.error('Firebase user creation failed:', error);
    throw error;
  }

  // Create user in PostgreSQL database
  try {
    const dbUser = await userService.createUser(
      firebaseUser.uid,
      email,
      displayName
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.display_name,
          photoURL: dbUser.photo_url,
          createdAt: dbUser.created_at,
        },
      },
    });
  } catch (error) {
    // If database creation fails, clean up Firebase user
    try {
      await admin.auth().deleteUser(firebaseUser.uid);
    } catch (cleanupError) {
      logger.error('Failed to clean up Firebase user after database error:', cleanupError);
    }
    throw error;
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user (verifies token and updates last login)
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, idToken } = loginSchema.parse(req.body);

  // Verify Firebase ID token
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new UnauthorizedError('Invalid authentication token');
  }

  // Verify email matches token
  if (decodedToken.email !== email) {
    throw new UnauthorizedError('Email does not match token');
  }

  // Find user in database
  const dbUser = await userService.findUserByFirebaseUid(decodedToken.uid);
  
  if (!dbUser) {
    throw new NotFoundError('User not found in database');
  }

  // Update last login timestamp
  await userService.updateLastLogin(decodedToken.uid);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.display_name,
        photoURL: dbUser.photo_url,
        lastLogin: new Date().toISOString(),
      },
    },
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Protected (requires authentication middleware)
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  // req.userId is set by authentication middleware
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const user = await userService.findUserByFirebaseUid(userId);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        photoURL: user.photo_url,
        emailVerified: user.email_verified,
        lastLogin: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    },
  });
});

/**
 * @route   PATCH /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Protected (requires authentication middleware)
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const updates = updateProfileSchema.parse(req.body);

  // Update user in database
  const updatedUser = await userService.updateUser(userId, updates);

  // Also update Firebase Auth profile if displayName or photoURL changed
  if (updates.displayName !== undefined || updates.photoURL !== undefined) {
    const updateData: { displayName?: string; photoURL?: string | null } = {};
    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName;
    }
    if (updates.photoURL !== undefined) {
      updateData.photoURL = updates.photoURL;
    }
    
    try {
      await admin.auth().updateUser(userId, updateData);
    } catch (error) {
      logger.error('Failed to update Firebase user profile:', error);
      // Continue anyway - database is source of truth
    }
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.display_name,
        photoURL: updatedUser.photo_url,
        updatedAt: updatedUser.updated_at,
      },
    },
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (placeholder for future session management)
 * @access  Protected (requires authentication middleware)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  // In Firebase, token invalidation happens client-side
  // This endpoint can be used for:
  // 1. Logging logout events
  // 2. Future session management (e.g., invalidating refresh tokens)
  // 3. Clearing server-side session data

  logger.info(`User logged out: ${userId}`);

  res.json({
    success: true,
    message: 'Logout successful',
  });
});