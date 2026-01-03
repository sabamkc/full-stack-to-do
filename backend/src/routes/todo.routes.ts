import { Router } from 'express';
import { 
  createTodo, 
  getTodos, 
  getTodoById, 
  updateTodo, 
  deleteTodo, 
  getStats 
} from '../controllers/todo.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { 
  createTodoSchema, 
  updateTodoSchema, 
  getTodosQuerySchema,
  todoIdParamSchema 
} from '../schemas/todo.schema';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/v1/todos/stats
 * @desc    Get todo statistics for current user
 * @access  Protected
 * @note    Must be defined before /:id route to avoid conflict
 */
router.get(
  '/stats',
  getStats
);

/**
 * @route   POST /api/v1/todos
 * @desc    Create a new todo
 * @access  Protected
 */
router.post(
  '/',
  validate(createTodoSchema),
  createTodo
);

/**
 * @route   GET /api/v1/todos
 * @desc    Get all todos with filters and pagination
 * @access  Protected
 */
router.get(
  '/',
  validate(getTodosQuerySchema, 'query'),
  getTodos
);

/**
 * @route   GET /api/v1/todos/:id
 * @desc    Get a single todo by ID
 * @access  Protected
 */
router.get(
  '/:id',
  validate(todoIdParamSchema, 'params'),
  getTodoById
);

/**
 * @route   PATCH /api/v1/todos/:id
 * @desc    Update a todo
 * @access  Protected
 */
router.patch(
  '/:id',
  validate(todoIdParamSchema, 'params'),
  validate(updateTodoSchema),
  updateTodo
);

/**
 * @route   DELETE /api/v1/todos/:id
 * @desc    Soft delete a todo
 * @access  Protected
 */
router.delete(
  '/:id',
  validate(todoIdParamSchema, 'params'),
  deleteTodo
);

export default router;
