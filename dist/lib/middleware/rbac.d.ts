import { Request, Response, NextFunction } from 'express';
import type { UserContext } from '../../types/auth-context';
/**
 * Represents an authentication error (401 Unauthorized).
 * Thrown when a user's identity cannot be verified.
 */
export declare class AuthenticationError extends Error {
    readonly status = 401;
    constructor(message?: string);
}
/**
 * Represents an authorization error (403 Forbidden).
 * Thrown when a user is authenticated but lacks permission to access a resource.
 */
export declare class AuthorizationError extends Error {
    readonly status = 403;
    constructor(message?: string);
}
/**
 * Represents a resource not found error (404 Not Found).
 * Thrown when a requested resource, such as a user profile, does not exist.
 */
export declare class NotFoundError extends Error {
    readonly status = 404;
    constructor(message?: string);
}
/**
 * Fetches user data from Firebase Auth and Firestore to build a UserContext.
 * Caches the result for 5 minutes to improve performance.
 * @param {string} userId - The Firebase UID of the user.
 * @returns {Promise<UserContext>} The user's context object.
 * @throws {NotFoundError} If the user document is not found in Firestore.
 * @throws {Error} If the user is not found in Firebase Auth.
 */
export declare function buildUserContext(userId: string): Promise<UserContext>;
/**
 * Express middleware to verify a Firebase ID token from the Authorization header.
 * If valid, it fetches the user's data, builds a UserContext, and attaches it to `req.user`.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 * @throws {AuthenticationError} If the token is missing, malformed, or invalid.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware factory to ensure the authenticated user has at least one of the allowed roles.
 * Must be used after `requireAuth`.
 * @param {string[]} allowedRoles - An array of role strings that are permitted access.
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user does not have any of the required roles.
 * @throws {AuthenticationError} If `req.user` is not present.
 */
export declare function requireRole(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware factory to check if the authenticated user is the owner of the data or has an 'admin' role.
 * It checks the user ID from the route parameters against the authenticated user's ID.
 * Must be used after `requireAuth`.
 * @param {string} paramName - The name of the route parameter that contains the owner's user ID (e.g., 'userId').
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user is not the owner and not an admin.
 * @throws {AuthenticationError} If `req.user` is not present.
 */
export declare function requireOwnData(paramName: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware factory to verify that the authenticated user is a teacher of a specific student.
 * This is determined by matching the teacher's `classId` with the student's `classId`.
 * Assumes a 'teacher' role exists and user documents have a `classId` field.
 * Must be used after `requireAuth`.
 * @param {string} studentIdParamName - The name of the route parameter containing the student's ID.
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user is not a teacher or not the teacher of the specified student.
 * @throws {AuthenticationError} If `req.user` is not present.
 * @throws {NotFoundError} If the student is not found.
 */
export declare function requireTeacherOf(studentIdParamName: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware factory to verify that the authenticated user is a parent of a specific student.
 * Assumes the parent's user document in Firestore contains a `childIds` array of student UIDs.
 * Must be used after `requireAuth`.
 * @param {string} studentIdParamName - The name of the route parameter containing the student's ID.
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user is not a parent or not the parent of the specified student.
 * @throws {AuthenticationError} If `req.user` is not present.
 * @throws {NotFoundError} If the parent's own user document is not found.
 */
export declare function requireParentOf(studentIdParamName: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rbac.d.ts.map