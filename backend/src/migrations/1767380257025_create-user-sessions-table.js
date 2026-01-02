exports.up = (pgm) => {
  pgm.createTable('user_sessions', {
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
    session_token: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    ip_address: {
      type: 'inet',
      notNull: false,
    },
    user_agent: {
      type: 'text',
      notNull: false,
    },
    device_info: {
      type: 'jsonb',
      notNull: false,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    last_activity_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    revoked_at: {
      type: 'timestamptz',
      notNull: false,
    },
  });

  // Create indexes
  pgm.createIndex('user_sessions', 'user_id');
  pgm.createIndex('user_sessions', 'session_token', {
    where: 'revoked_at IS NULL',
  });
  pgm.createIndex('user_sessions', 'expires_at', {
    where: 'revoked_at IS NULL',
  });

  // Add constraint for expires_at
  pgm.addConstraint('user_sessions', 'session_expires_check', {
    check: 'expires_at > created_at',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('user_sessions');
};