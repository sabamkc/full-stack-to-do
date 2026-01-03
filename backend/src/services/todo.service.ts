import pool from '../config/database';
import { Todo } from '../types/index';
import { DatabaseError, NotFoundError } from '../middleware/error.middleware';
import { CreateTodoInput, UpdateTodoInput, GetTodosQuery } from '../schemas/todo.schema';

/**
 * Interface for paginated todo results
 */
export interface PaginatedTodos {
  todos: Todo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Interface for todo statistics
 */
export interface TodoStats {
  total: number;
  byStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    archived: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  completedToday: number;
  dueSoon: number; // Due in next 7 days
  overdue: number;
  starred: number;
}

/**
 * Create a new todo
 */
export const createTodo = async (
  userId: string,
  todoData: CreateTodoInput
): Promise<Todo> => {
  try {
    const query = `
      INSERT INTO todos (
        user_id,
        title,
        description,
        status,
        priority,
        due_date,
        tags,
        starred,
        reminder_at,
        position
      )
      SELECT 
        (SELECT id FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL),
        $2, $3, $4, $5, $6, $7, $8, $9,
        COALESCE((SELECT MAX(position) FROM todos WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)), 0) + 1
      RETURNING
        id,
        user_id,
        title,
        description,
        status,
        priority,
        due_date,
        completed_at,
        position,
        tags,
        starred,
        reminder_at,
        created_at,
        updated_at
    `;

    const values = [
      userId,
      todoData.title,
      todoData.description || null,
      todoData.status || 'pending',
      todoData.priority || 'medium',
      todoData.dueDate || null,
      todoData.tags || [],
      todoData.starred || false,
      todoData.reminderAt || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0] as Todo;
  } catch (error: any) {
    throw new DatabaseError(`Failed to create todo: ${error.message}`);
  }
};

/**
 * Get todo by ID with ownership verification
 */
export const getTodoById = async (
  todoId: string,
  userId: string
): Promise<Todo | null> => {
  try {
    const query = `
      SELECT 
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        t.position,
        t.tags,
        t.starred,
        t.reminder_at,
        t.created_at,
        t.updated_at
      FROM todos t
      INNER JOIN users u ON t.user_id = u.id
      WHERE t.id = $1 
        AND u.firebase_uid = $2 
        AND t.deleted_at IS NULL
        AND u.deleted_at IS NULL
    `;

    const result = await pool.query(query, [todoId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Todo;
  } catch (error: any) {
    throw new DatabaseError(`Failed to fetch todo: ${error.message}`);
  }
};

/**
 * Get todos by user ID with filters and pagination
 */
export const getTodosByUserId = async (
  userId: string,
  filters: GetTodosQuery
): Promise<PaginatedTodos> => {
  try {
    // Build WHERE clause dynamically
    const conditions: string[] = [
      'u.firebase_uid = $1',
      't.deleted_at IS NULL',
      'u.deleted_at IS NULL'
    ];
    const values: any[] = [userId];
    let paramCount = 2;

    // Status filter
    if (filters.status) {
      conditions.push(`t.status = $${paramCount++}`);
      values.push(filters.status);
    }

    // Priority filter
    if (filters.priority) {
      conditions.push(`t.priority = $${paramCount++}`);
      values.push(filters.priority);
    }

    // Starred filter
    if (filters.starred !== undefined) {
      conditions.push(`t.starred = $${paramCount++}`);
      values.push(filters.starred);
    }

    // Search in title and description
    if (filters.search) {
      conditions.push(`(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Due date range
    if (filters.dueDateFrom) {
      conditions.push(`t.due_date >= $${paramCount++}`);
      values.push(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      conditions.push(`t.due_date <= $${paramCount++}`);
      values.push(filters.dueDateTo);
    }

    // Tags filter (contains any of the specified tags)
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`t.tags && $${paramCount++}::text[]`);
      values.push(filters.tags);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM todos t
      INNER JOIN users u ON t.user_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Calculate pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Build ORDER BY clause
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy = `t.${sortBy} ${sortOrder.toUpperCase()}`;

    // Fetch paginated data
    const dataQuery = `
      SELECT 
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        t.position,
        t.tags,
        t.starred,
        t.reminder_at,
        t.created_at,
        t.updated_at
      FROM todos t
      INNER JOIN users u ON t.user_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    return {
      todos: dataResult.rows as Todo[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error: any) {
    throw new DatabaseError(`Failed to fetch todos: ${error.message}`);
  }
};

/**
 * Update todo with ownership verification
 */
export const updateTodo = async (
  todoId: string,
  userId: string,
  updates: UpdateTodoInput
): Promise<Todo> => {
  try {
    // First verify ownership
    const todo = await getTodoById(todoId, userId);
    if (!todo) {
      throw new NotFoundError('Todo not found or you do not have permission to update it');
    }

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(updates.status);
      
      // Auto-manage completed_at based on status
      if (updates.status === 'completed') {
        updateFields.push(`completed_at = NOW()`);
      } else {
        updateFields.push(`completed_at = NULL`);
      }
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }

    if (updates.dueDate !== undefined) {
      updateFields.push(`due_date = $${paramCount++}`);
      values.push(updates.dueDate);
    }

    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramCount++}`);
      values.push(updates.tags);
    }

    if (updates.starred !== undefined) {
      updateFields.push(`starred = $${paramCount++}`);
      values.push(updates.starred);
    }

    if (updates.reminderAt !== undefined) {
      updateFields.push(`reminder_at = $${paramCount++}`);
      values.push(updates.reminderAt);
    }

    if (updates.position !== undefined) {
      updateFields.push(`position = $${paramCount++}`);
      values.push(updates.position);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add todoId and userId to values
    values.push(todoId, userId);

    const query = `
      UPDATE todos t
      SET ${updateFields.join(', ')}
      FROM users u
      WHERE t.id = $${paramCount++}
        AND t.user_id = u.id
        AND u.firebase_uid = $${paramCount++}
        AND t.deleted_at IS NULL
        AND u.deleted_at IS NULL
      RETURNING 
        t.id,
        t.user_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        t.position,
        t.tags,
        t.starred,
        t.reminder_at,
        t.created_at,
        t.updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Todo not found after update');
    }

    return result.rows[0] as Todo;
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update todo: ${error.message}`);
  }
};

/**
 * Soft delete todo with ownership verification
 */
export const softDeleteTodo = async (
  todoId: string,
  userId: string
): Promise<void> => {
  try {
    const query = `
      UPDATE todos t
      SET deleted_at = NOW()
      FROM users u
      WHERE t.id = $1
        AND t.user_id = u.id
        AND u.firebase_uid = $2
        AND t.deleted_at IS NULL
        AND u.deleted_at IS NULL
      RETURNING t.id
    `;

    const result = await pool.query(query, [todoId, userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Todo not found or you do not have permission to delete it');
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to delete todo: ${error.message}`);
  }
};

/**
 * Hard delete todo (permanently remove from database)
 * Use with caution - this is irreversible
 */
export const hardDeleteTodo = async (
  todoId: string,
  userId: string
): Promise<void> => {
  try {
    const query = `
      DELETE FROM todos t
      USING users u
      WHERE t.id = $1
        AND t.user_id = u.id
        AND u.firebase_uid = $2
      RETURNING t.id
    `;

    const result = await pool.query(query, [todoId, userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Todo not found or you do not have permission to delete it');
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to permanently delete todo: ${error.message}`);
  }
};

/**
 * Get statistics for user's todos
 */
export const getStats = async (userId: string): Promise<TodoStats> => {
  try {
    const query = `
      WITH todo_counts AS (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'archived') as archived,
          COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
          COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
          COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
          COUNT(*) FILTER (WHERE priority = 'critical') as critical_priority,
          COUNT(*) FILTER (WHERE DATE(completed_at) = CURRENT_DATE) as completed_today,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL 
            AND due_date >= CURRENT_DATE 
            AND due_date <= CURRENT_DATE + INTERVAL '7 days'
            AND status != 'completed') as due_soon,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL 
            AND due_date < CURRENT_DATE 
            AND status != 'completed'
            AND status != 'archived') as overdue,
          COUNT(*) FILTER (WHERE starred = true) as starred
        FROM todos t
        INNER JOIN users u ON t.user_id = u.id
        WHERE u.firebase_uid = $1
          AND t.deleted_at IS NULL
          AND u.deleted_at IS NULL
      )
      SELECT * FROM todo_counts
    `;

    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      total: parseInt(row.total, 10),
      byStatus: {
        pending: parseInt(row.pending, 10),
        in_progress: parseInt(row.in_progress, 10),
        completed: parseInt(row.completed, 10),
        archived: parseInt(row.archived, 10),
      },
      byPriority: {
        low: parseInt(row.low_priority, 10),
        medium: parseInt(row.medium_priority, 10),
        high: parseInt(row.high_priority, 10),
        critical: parseInt(row.critical_priority, 10),
      },
      completedToday: parseInt(row.completed_today, 10),
      dueSoon: parseInt(row.due_soon, 10),
      overdue: parseInt(row.overdue, 10),
      starred: parseInt(row.starred, 10),
    };
  } catch (error: any) {
    throw new DatabaseError(`Failed to fetch todo statistics: ${error.message}`);
  }
};
