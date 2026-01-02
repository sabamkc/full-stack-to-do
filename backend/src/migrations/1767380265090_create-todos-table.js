exports.up = (pgm) => {
  // Create enum types
  pgm.createType('todo_priority', ['low', 'medium', 'high', 'critical']);
  pgm.createType('todo_status', ['pending', 'in_progress', 'completed', 'archived']);

  pgm.createTable('todos', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'varchar(500)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: false,
    },
    priority: {
      type: 'todo_priority',
      notNull: true,
      default: 'medium',
    },
    status: {
      type: 'todo_status',
      notNull: true,
      default: 'pending',
    },
    due_date: {
      type: 'timestamptz',
      notNull: false,
    },
    completed_at: {
      type: 'timestamptz',
      notNull: false,
    },
    position: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    tags: {
      type: 'text[]',
      notNull: true,
      default: pgm.func("ARRAY[]::text[]"),
    },
    is_starred: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    reminder_at: {
      type: 'timestamptz',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    deleted_at: {
      type: 'timestamptz',
      notNull: false,
    },
  });

  // Create indexes
  pgm.createIndex('todos', 'user_id', {
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('todos', 'status', {
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('todos', 'due_date', {
    where: "deleted_at IS NULL AND status != 'completed'",
  });
  pgm.createIndex('todos', ['priority', 'created_at']);
  pgm.createIndex('todos', ['user_id', 'status'], {
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('todos', 'tags', {
    method: 'gin',
  });

  // Add constraints
  pgm.addConstraint('todos', 'todo_title_length', {
    check: "LENGTH(TRIM(title)) >= 1",
  });
  pgm.addConstraint('todos', 'todo_completed_logic', {
    check: "(status = 'completed' AND completed_at IS NOT NULL) OR (status != 'completed' AND completed_at IS NULL)",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('todos');
  pgm.dropType('todo_status');
  pgm.dropType('todo_priority');
};