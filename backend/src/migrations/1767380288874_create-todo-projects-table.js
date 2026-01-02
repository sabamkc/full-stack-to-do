exports.up = (pgm) => {
  pgm.createTable('todo_projects', {
    todo_id: {
      type: 'uuid',
      notNull: true,
      references: 'todos',
      onDelete: 'CASCADE',
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Create composite primary key
  pgm.addConstraint('todo_projects', 'todo_projects_pkey', {
    primaryKey: ['todo_id', 'project_id'],
  });

  // Create index on project_id for reverse lookups
  pgm.createIndex('todo_projects', 'project_id');
};

exports.down = (pgm) => {
  pgm.dropTable('todo_projects');
};