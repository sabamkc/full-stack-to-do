import pool from '../config/database';
import { User } from '../types/index';
import { DatabaseError, NotFoundError, ConflictError } from '../middleware/error.middleware';

/**
 * Create a new user in the database
 */
export const createUser = async (
  firebaseUid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<User> => {
  try {
    const query = `
      INSERT INTO users (firebase_uid, email, display_name, photo_url, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, 
        firebase_uid, 
        email, 
        display_name, 
        photo_url, 
        email_verified, 
        is_active, 
        last_login_at, 
        created_at, 
        updated_at
    `;

    const values = [firebaseUid, email, displayName, photoURL || null, false, true];
    const result = await pool.query(query, values);

    return result.rows[0] as User;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      if (error.constraint === 'users_firebase_uid_key') {
        throw new ConflictError('User with this Firebase UID already exists');
      }
      if (error.constraint === 'users_email_key') {
        throw new ConflictError('User with this email already exists');
      }
    }
    throw new DatabaseError(`Failed to create user: ${error.message}`);
  }
};

/**
 * Find user by Firebase UID
 */
export const findUserByFirebaseUid = async (firebaseUid: string): Promise<User | null> => {
  try {
    const query = `
      SELECT 
        id, 
        firebase_uid, 
        email, 
        display_name, 
        photo_url, 
        email_verified, 
        is_active, 
        last_login_at, 
        created_at, 
        updated_at
      FROM users
      WHERE firebase_uid = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [firebaseUid]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error: any) {
    throw new DatabaseError(`Failed to find user: ${error.message}`);
  }
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const query = `
      SELECT 
        id, 
        firebase_uid, 
        email, 
        display_name, 
        photo_url, 
        email_verified, 
        is_active, 
        last_login_at, 
        created_at, 
        updated_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error: any) {
    throw new DatabaseError(`Failed to find user: ${error.message}`);
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  firebaseUid: string,
  updates: { displayName?: string; photoURL?: string | null; emailVerified?: boolean }
): Promise<User> => {
  try {
    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.displayName !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      values.push(updates.displayName);
    }

    if (updates.photoURL !== undefined) {
      updateFields.push(`photo_url = $${paramCount++}`);
      values.push(updates.photoURL);
    }

    if (updates.emailVerified !== undefined) {
      updateFields.push(`email_verified = $${paramCount++}`);
      values.push(updates.emailVerified);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add firebase_uid to values for WHERE clause
    values.push(firebaseUid);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE firebase_uid = $${paramCount} AND deleted_at IS NULL
      RETURNING 
        id, 
        firebase_uid, 
        email, 
        display_name, 
        photo_url, 
        email_verified, 
        is_active, 
        last_login_at, 
        created_at, 
        updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return result.rows[0] as User;
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update user: ${error.message}`);
  }
};

/**
 * Update last login timestamp
 */
export const updateLastLogin = async (firebaseUid: string): Promise<void> => {
  try {
    const query = `
      UPDATE users
      SET last_login_at = NOW()
      WHERE firebase_uid = $1 AND deleted_at IS NULL
    `;

    await pool.query(query, [firebaseUid]);
  } catch (error: any) {
    throw new DatabaseError(`Failed to update last login: ${error.message}`);
  }
};

/**
 * Soft delete user
 */
export const softDeleteUser = async (firebaseUid: string): Promise<void> => {
  try {
    const query = `
      UPDATE users
      SET deleted_at = NOW(), is_active = false
      WHERE firebase_uid = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [firebaseUid]);

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found or already deleted');
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to delete user: ${error.message}`);
  }
};