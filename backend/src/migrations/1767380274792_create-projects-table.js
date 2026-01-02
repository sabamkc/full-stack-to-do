exports.up = (pgm) => {
  pgm.createTable('projects', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
      notNull: false,
    },
    color: {
      type: 'varchar(7)',
      notNull: false,
    },
    icon: {
      type: 'varchar(50)',
      notNull: false,
    },
    position: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    is_archived: {
      type: 'boolean',
      notNull: true,
      default: false,
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
  pgm.createIndex('projects', 'user_id', {
    where: 'deleted_at IS NULL',
  });

  // Add constraints
  pgm.addConstraint('projects', 'project_name_length', {
    check: "LENGTH(TRIM(name)) >= 1",
  });
  pgm.addConstraint('projects', 'project_color_format', {
    check: "color IS NULL OR color ~* '^#[0-9A-F]{6}$'",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('projects');
};