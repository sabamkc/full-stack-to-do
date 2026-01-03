import { z } from 'zod';

/**
 * Todo priority enum values
 */
export const todoPriorityValues = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Todo status enum values
 */
export const todoStatusValues = ['pending', 'in_progress', 'completed', 'archived'] as const;

/**
 * Create todo request validation
 */
export const createTodoSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must not exceed 500 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional()
    .nullable(),
  status: z.enum(todoStatusValues)
    .default('pending'),
  priority: z.enum(todoPriorityValues)
    .default('medium'),
  dueDate: z.string()
    .datetime({ message: 'Due date must be a valid ISO datetime' })
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  starred: z.boolean()
    .default(false),
  reminderAt: z.string()
    .datetime({ message: 'Reminder must be a valid ISO datetime' })
    .optional()
    .nullable(),
});

/**
 * Update todo request validation
 */
export const updateTodoSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must not exceed 500 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional()
    .nullable(),
  status: z.enum(todoStatusValues)
    .optional(),
  priority: z.enum(todoPriorityValues)
    .optional(),
  dueDate: z.string()
    .datetime({ message: 'Due date must be a valid ISO datetime' })
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  starred: z.boolean()
    .optional(),
  reminderAt: z.string()
    .datetime({ message: 'Reminder must be a valid ISO datetime' })
    .optional()
    .nullable(),
  position: z.number()
    .int()
    .positive()
    .optional(),
});

/**
 * Get todos query parameters validation
 */
export const getTodosQuerySchema = z.object({
  // Filtering
  status: z.enum(todoStatusValues)
    .optional(),
  priority: z.enum(todoPriorityValues)
    .optional(),
  starred: z.enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),
  search: z.string()
    .max(200, 'Search query too long')
    .optional(),
  dueDateFrom: z.string()
    .datetime({ message: 'Due date from must be a valid ISO datetime' })
    .optional(),
  dueDateTo: z.string()
    .datetime({ message: 'Due date to must be a valid ISO datetime' })
    .optional(),
  tags: z.string()
    .transform(val => val.split(',').map(tag => tag.trim()).filter(Boolean))
    .optional(),
  
  // Pagination
  page: z.string()
    .optional()
    .default('1')
    .pipe(
      z.string()
        .regex(/^\d+$/, 'Page must be a positive integer')
        .transform(Number)
        .refine(val => val > 0, 'Page must be greater than 0')
    ),
  limit: z.string()
    .optional()
    .default('20')
    .pipe(
      z.string()
        .regex(/^\d+$/, 'Limit must be a positive integer')
        .transform(Number)
        .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    ),
  
  // Sorting
  sortBy: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'status', 'position', 'title'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc'),
});

/**
 * Todo ID parameter validation
 */
export const todoIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid todo ID format' }),
});

// Export types for TypeScript
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type GetTodosQuery = z.infer<typeof getTodosQuerySchema>;
export type TodoIdParam = z.infer<typeof todoIdParamSchema>;
