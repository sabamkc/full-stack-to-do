import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validation target - what part of the request to validate
 */
export type ValidateTarget = 'body' | 'params' | 'query';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of request to validate (body, params, or query)
 * 
 * @example
 * router.post('/todos', validate(createTodoSchema, 'body'), createTodo);
 */
export const validate = (
  schema: ZodSchema,
  target: ValidateTarget = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get data from specified target
      const data = req[target];

      // Validate and parse data
      const validated = await schema.parseAsync(data);

      // Replace request data with validated and sanitized data
      req[target] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into user-friendly messages
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: errors,
        });
        return;
      }

      // Pass unexpected errors to error handler
      next(error);
    }
  };
};

/**
 * Validate multiple targets at once
 * Useful when you need to validate body AND params, for example
 * 
 * @example
 * router.patch('/todos/:id', validateAll({
 *   params: idParamSchema,
 *   body: updateTodoSchema
 * }), updateTodo);
 */
export const validateAll = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allErrors: any[] = [];

      // Validate each target that has a schema
      for (const [target, schema] of Object.entries(schemas)) {
        if (schema) {
          try {
            const data = req[target as ValidateTarget];
            const validated = await schema.parseAsync(data);
            req[target as ValidateTarget] = validated;
          } catch (error) {
            if (error instanceof ZodError) {
              error.issues.forEach(err => {
                allErrors.push({
                  target,
                  field: err.path.join('.'),
                  message: err.message,
                  code: err.code,
                });
              });
            } else {
              throw error;
            }
          }
        }
      }

      // If there are validation errors, return them all
      if (allErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: allErrors,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Common validation schemas for reuse
 */
import { z } from 'zod';

/**
 * UUID parameter validation
 * Use for validating ID parameters in routes like /todos/:id
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a valid UUID.' }),
});

/**
 * Pagination query parameters
 * Use for list endpoints that support pagination
 */
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).refine(
  data => data.page && data.page > 0,
  { message: 'Page must be greater than 0', path: ['page'] }
).refine(
  data => data.limit && data.limit > 0 && data.limit <= 100,
  { message: 'Limit must be between 1 and 100', path: ['limit'] }
);

/**
 * Search query validation
 * Use for search endpoints
 */
export const searchSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(200, 'Search query too long'),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
});

/**
 * Date range query validation
 * Use for filtering by date ranges
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format. Use ISO 8601.' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format. Use ISO 8601.' }).optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

/**
 * Email validation
 * Reusable email schema
 */
export const emailSchema = z.string()
  .email({ message: 'Invalid email address' })
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters');

/**
 * Password validation
 * Enforces strong password requirements
 */
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');