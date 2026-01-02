exports.up = (pgm) => {
  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    firebase_uid: {
      type: 'varchar(128)',
      notNull: true,
      unique: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    display_name: {
      type: 'varchar(255)',
      notNull: false,
    },
    photo_url: {
      type: 'text',
      notNull: false,
    },
    email_verified: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    last_login_at: {
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
  pgm.createIndex('users', 'firebase_uid');
  pgm.createIndex('users', 'email', {
    where: 'deleted_at IS NULL',
  });
  pgm.createIndex('users', 'is_active', {
    where: 'is_active = true',
  });

  // Add email validation constraint
  pgm.addConstraint('users', 'users_email_check', {
    check: "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'",
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};