"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = void 0;
exports.buildUserContext = buildUserContext;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireOwnData = requireOwnData;
exports.requireTeacherOf = requireTeacherOf;
exports.requireParentOf = requireParentOf;
const admin = __importStar(require("firebase-admin"));
const node_cache_1 = __importDefault(require("node-cache"));
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
class AuthenticationError extends Error {
    constructor(message = 'Authentication required. Please provide a valid token.') {
        super(message);
        this.status = 401;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Represents an authorization error (403 Forbidden).
 * Thrown when a user is authenticated but lacks permission to access a resource.
 */
class AuthorizationError extends Error {
    constructor(message = 'You do not have permission to perform this action.') {
        super(message);
        this.status = 403;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Represents a resource not found error (404 Not Found).
 * Thrown when a requested resource, such as a user profile, does not exist.
 */
class NotFoundError extends Error {
    constructor(message = 'The requested resource was not found.') {
        super(message);
        this.status = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
// --- User Context and Type Augmentation ---
// UserContext is imported from ../../types/auth-context and augmented in auth.ts
// --- Caching ---
// Cache user context for 5 minutes to reduce Firestore lookups
const userCache = new node_cache_1.default({ stdTTL: 300 });
// --- Core Logic and Middleware ---
/**
 * Fetches user data from Firebase Auth and Firestore to build a UserContext.
 * Caches the result for 5 minutes to improve performance.
 * @param {string} userId - The Firebase UID of the user.
 * @returns {Promise<UserContext>} The user's context object.
 * @throws {NotFoundError} If the user document is not found in Firestore.
 * @throws {Error} If the user is not found in Firebase Auth.
 */
async function buildUserContext(userId) {
    const cachedUser = userCache.get(userId);
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
    const userData = userDoc.data();
    const userContext = {
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
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('Authorization header with Bearer token is required.');
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = await buildUserContext(decodedToken.uid);
        next();
    }
    catch (error) {
        // Invalidate cache if user is disabled or not found during token verification
        if (error instanceof Error && (error.message.includes('auth/user-disabled') || error.message.includes('auth/user-not-found'))) {
            const tokenPayload = error.decodedToken;
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
function requireRole(allowedRoles) {
    return (req, res, next) => {
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
function requireOwnData(paramName) {
    return (req, res, next) => {
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
function requireTeacherOf(studentIdParamName) {
    return async (req, res, next) => {
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
        }
        catch (error) {
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
function requireParentOf(studentIdParamName) {
    return async (req, res, next) => {
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
            const parentData = parentDoc.data();
            const childIds = parentData.childIds || [];
            if (childIds.includes(studentId)) {
                return next();
            }
            throw new AuthorizationError('Access denied. You are not registered as the parent of this student.');
        }
        catch (error) {
            next(error);
        }
    };
}
//# sourceMappingURL=rbac.js.map