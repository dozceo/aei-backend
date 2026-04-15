/**
 * Shared authentication and user context types
 * Merges different implementations for compatibility
 */

/**
 * User context attached to Express requests after authentication
 * Supports both uid/userId and role/roles for compatibility across the codebase
 */
export interface UserContext {
  // Firebase auth fields
  uid?: string;
  email?: string;
  role?: string;
  
  // RBAC fields
  userId?: string;
  roles?: string[];
  classId?: string | null;
  
  // Allow any other properties
  [key: string]: any;
}
