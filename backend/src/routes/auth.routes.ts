import { Router } from 'express';
import { register, login, logout, getCurrentUser, updateProfile } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validate(registerSchema),
  register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with Firebase token
 * @access  Public
 */
router.post(
  '/login',
  validate(loginSchema),
  login
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get(
  '/me',
  authenticateUser,
  getCurrentUser
);

/**
 * @route   PATCH /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Protected
 */
router.patch(
  '/me',
  authenticateUser,
  validate(updateProfileSchema),
  updateProfile
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (placeholder)
 * @access  Protected
 */
router.post(
  '/logout',
  authenticateUser,
  logout
);

export default router;
