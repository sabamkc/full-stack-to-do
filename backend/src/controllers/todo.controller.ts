import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import * as todoService from '../services/todo.service';
import { UnauthorizedError, NotFoundError } from '../middleware/error.middleware';
import logger from '../config/logger';
import { CreateTodoInput, UpdateTodoInput, GetTodosQuery } from '../schemas/todo.schema';

/**
 * @route   POST /api/v1/todos
 * @desc    Create a new todo
 * @access  Protected
 */
export const createTodo = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const todoData: CreateTodoInput = req.body;

  const todo = await todoService.createTodo(userId, todoData);

  logger.info(`Todo created: ${todo.id} by user: ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Todo created successfully',
    data: {
      todo: {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        position: todo.position,
        tags: todo.tags,
        starred: todo.starred,
        reminderAt: todo.reminder_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    },
  });
});

/**
 * @route   GET /api/v1/todos
 * @desc    Get all todos for current user with filters and pagination
 * @access  Protected
 */
export const getTodos = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const filters: GetTodosQuery = req.query as any;

  const result = await todoService.getTodosByUserId(userId, filters);

  res.json({
    success: true,
    data: {
      todos: result.todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        position: todo.position,
        tags: todo.tags,
        starred: todo.starred,
        reminderAt: todo.reminder_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      })),
      pagination: result.pagination,
    },
  });
});

/**
 * @route   GET /api/v1/todos/:id
 * @desc    Get a single todo by ID
 * @access  Protected
 */
export const getTodoById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const { id } = req.params;

  const todo = await todoService.getTodoById(id, userId);

  if (!todo) {
    throw new NotFoundError('Todo not found or you do not have permission to view it');
  }

  res.json({
    success: true,
    data: {
      todo: {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        position: todo.position,
        tags: todo.tags,
        starred: todo.starred,
        reminderAt: todo.reminder_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    },
  });
});

/**
 * @route   PATCH /api/v1/todos/:id
 * @desc    Update a todo
 * @access  Protected
 */
export const updateTodo = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const { id } = req.params;
  const updates: UpdateTodoInput = req.body;

  const todo = await todoService.updateTodo(id, userId, updates);

  logger.info(`Todo updated: ${id} by user: ${userId}`);

  res.json({
    success: true,
    message: 'Todo updated successfully',
    data: {
      todo: {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.due_date,
        completedAt: todo.completed_at,
        position: todo.position,
        tags: todo.tags,
        starred: todo.starred,
        reminderAt: todo.reminder_at,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      },
    },
  });
});

/**
 * @route   DELETE /api/v1/todos/:id
 * @desc    Soft delete a todo
 * @access  Protected
 */
export const deleteTodo = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const { id } = req.params;

  await todoService.softDeleteTodo(id, userId);

  logger.info(`Todo deleted: ${id} by user: ${userId}`);

  res.json({
    success: true,
    message: 'Todo deleted successfully',
  });
});

/**
 * @route   GET /api/v1/todos/stats
 * @desc    Get todo statistics for current user
 * @access  Protected
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  const stats = await todoService.getStats(userId);

  res.json({
    success: true,
    data: {
      stats,
    },
  });
});
