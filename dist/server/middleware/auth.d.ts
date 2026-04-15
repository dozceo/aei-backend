/**
 * Authentication Middleware
 * src/server/middleware/auth.ts
 *
 * Verifies Firebase JWT tokens and attaches user context to requests
 */
import { Request, Response, NextFunction } from 'express';
import type { UserContext } from '../../types/auth-context';
declare global {
    namespace Express {
        interface Request {
            user?: UserContext;
        }
    }
}
/**
 * Express middleware to verify Firebase authentication token
 * Extracts token from Authorization header and validates with Firebase
 *
 * @throws 401 Unauthorized if no token or invalid token
 */
export declare function verifyAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional auth middleware - doesn't fail if no token present
 */
export declare function verifyAuthOptional(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Authorization middleware factory
 * Checks if user has required role
 */
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Admin-only authorization middleware
 */
export declare const verifyAdmin: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map