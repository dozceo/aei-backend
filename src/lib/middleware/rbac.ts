import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import NodeCache from 'node-cache';
import type { UserContext } from '../../types/auth-context';

// TODO: Initialize the Firebase Admin SDK in your main application entry point (e.g., index.ts or server.ts)
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://<your-project-id>.firebaseio.com'
// });

// --- Custom Error Classes ---

/**
 * Represents an authentication error (401 Unauthorized).
 * Thrown when a user's identity cannot be verified.
 */
export class AuthenticationError extends Error {
  public readonly status = 401;
  constructor(message = 'Authentication required. Please provide a valid token.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Represents an authorization error (403 Forbidden).
 * Thrown when a user is authenticated but lacks permission to access a resource.
 */
export class AuthorizationError extends Error {
  public readonly status = 403;
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Represents a resource not found error (404 Not Found).
 * Thrown when a requested resource, such as a user profile, does not exist.
 */
export class NotFoundError extends Error {
  public readonly status = 404;
  constructor(message = 'The requested resource was not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// --- User Context and Type Augmentation ---

// UserContext is imported from ../../types/auth-context and augmented in auth.ts

// --- Caching ---

// Cache user context for 5 minutes to reduce Firestore lookups
const userCache = new NodeCache({ stdTTL: 300 });

// --- Core Logic and Middleware ---

/**
 * Fetches user data from Firebase Auth and Firestore to build a UserContext.
 * Caches the result for 5 minutes to improve performance.
 * @param {string} userId - The Firebase UID of the user.
 * @returns {Promise<UserContext>} The user's context object.
 * @throws {NotFoundError} If the user document is not found in Firestore.
 * @throws {Error} If the user is not found in Firebase Auth.
 */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const cachedUser = userCache.get<UserContext>(userId);
  if (cachedUser) {
    return cachedUser;
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(userId),
    db.collection('users').doc(userId).get(),
  ]);

  if (!userDoc.exists) {
    throw new NotFoundError(`User with ID ${userId} not found in the database.`);
  }

  const userData = userDoc.data() as { roles?: string[]; classId?: string };

  const userContext: UserContext = {
    userId: userRecord.uid,
    email: userRecord.email || '',
    roles: userData.roles || [],
    classId: userData.classId || null,
  };

  userCache.set(userId, userContext);
  return userContext;
}

/**
 * Express middleware to verify a Firebase ID token from the Authorization header.
 * If valid, it fetches the user's data, builds a UserContext, and attaches it to `req.user`.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 * @throws {AuthenticationError} If the token is missing, malformed, or invalid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header with Bearer token is required.');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.user = await buildUserContext(decodedToken.uid);
    next();
  } catch (error) {
    // Invalidate cache if user is disabled or not found during token verification
    if (error instanceof Error && (error.message.includes('auth/user-disabled') || error.message.includes('auth/user-not-found'))) {
        const tokenPayload = (error as any).decodedToken;
        if (tokenPayload && tokenPayload.uid) {
            userCache.del(tokenPayload.uid);
        }
    }
    next(new AuthenticationError('Invalid or expired token.'));
  }
}

/**
 * Middleware factory to ensure the authenticated user has at least one of the allowed roles.
 * Must be used after `requireAuth`.
 * @param {string[]} allowedRoles - An array of role strings that are permitted access.
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user does not have any of the required roles.
 * @throws {AuthenticationError} If `req.user` is not present.
 */
export function requireRole(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('User context not found. Ensure requireAuth middleware is used first.'));
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new AuthorizationError(`Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`));
    }

    next();
  };
}

/**
 * Middleware factory to check if the authenticated user is the owner of the data or has an 'admin' role.
 * It checks the user ID from the route parameters against the authenticated user's ID.
 * Must be used after `requireAuth`.
 * @param {string} paramName - The name of the route parameter that contains the owner's user ID (e.g., 'userId').
 * @returns {Function} An Express middleware function.
 * @throws {AuthorizationError} If the user is not the owner and not an admin.
 * @throws {AuthenticationError} If `req.user` is not present.
 */
export function requireOwnData(paramName: string): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('User context not found. Ensure requireAuth middleware is used first.'));
    }

    // Admins have universal access
    if (req.user.roles.includes('admin')) {
      return next();
    }

    const ownerId = req.params[paramName];
    if (req.user.userId === ownerId) {
      return next();
    }

    next(new AuthorizationError('Access denied. You can only access your own data.'));
  };
}

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
export function requireTeacherOf(studentIdParamName: string): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User context not found. Ensure requireAuth middleware is used first.');
      }

      if (!req.user.roles.includes('teacher') || !req.user.classId) {
        throw new AuthorizationError('Access denied. You must be a teacher with an assigned class.');
      }

      const studentId = req.params[studentIdParamName];
      if (!studentId) {
        throw new AuthorizationError('Student ID parameter is missing from the request.');
      }
      
      // We can use buildUserContext to leverage caching for the student's data
      const studentContext = await buildUserContext(studentId);

      if (studentContext.classId === req.user.classId) {
        return next();
      }

      throw new AuthorizationError('Access denied. You are not the teacher of this student.');
    } catch (error) {
      next(error);
    }
  };
}

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
export function requireParentOf(studentIdParamName: string): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User context not found. Ensure requireAuth middleware is used first.');
      }

      if (!req.user.roles.includes('parent')) {
        throw new AuthorizationError('Access denied. You must have a parent role.');
      }

      const studentId = req.params[studentIdParamName];
      if (!studentId) {
        throw new AuthorizationError('Student ID parameter is missing from the request.');
      }

      const db = admin.firestore();
      const parentDoc = await db.collection('users').doc(req.user.userId).get();

      if (!parentDoc.exists) {
        // This case is unlikely if requireAuth succeeded, but good for robustness
        throw new NotFoundError('Parent user document not found.');
      }

      const parentData = parentDoc.data() as { childIds?: string[] };
      const childIds = parentData.childIds || [];

      if (childIds.includes(studentId)) {
        return next();
      }

      throw new AuthorizationError('Access denied. You are not registered as the parent of this student.');
    } catch (error) {
      next(error);
    }
  };
}

