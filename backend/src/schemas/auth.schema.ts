import { z } from 'zod';
import { emailSchema, passwordSchema } from '../middleware/validate.middleware';

/**
 * Register request validation
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must not exceed 100 characters')
    .trim(),
});

/**
 * Login request validation
 */
export const loginSchema = z.object({
  email: emailSchema,
  idToken: z.string().min(1, 'ID token is required'),
});

/**
 * Update profile request validation
 */
export const updateProfileSchema = z.object({
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must not exceed 100 characters')
    .trim()
    .optional(),
  photoURL: z.string()
    .url('Photo URL must be a valid URL')
    .max(500, 'Photo URL must not exceed 500 characters')
    .optional(),
});

// Export types for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;