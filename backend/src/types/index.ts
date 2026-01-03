/**
 * Database entity types
 */

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  email_verified: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  refresh_token: string | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: Date | null;
  completed_at: Date | null;
  position: number;
  tags: string[];
  starred: boolean;
  reminder_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TodoProject {
  todo_id: number;
  project_id: number;
  assigned_at: Date;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * Request/Response types
 */

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}
