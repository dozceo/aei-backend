/**
 * Shared authentication and user context types
 * Merges different implementations for compatibility
 */
/**
 * User context attached to Express requests after authentication
 * Supports both uid/userId and role/roles for compatibility across the codebase
 */
export interface UserContext {
    uid?: string;
    email?: string;
    role?: string;
    userId?: string;
    roles?: string[];
    classId?: string | null;
    authTime?: number;
    exp?: number;
    iat?: number;
    [key: string]: any;
}
//# sourceMappingURL=auth-context.d.ts.map