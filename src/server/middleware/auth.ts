/**
 * Authentication Middleware
 * src/server/middleware/auth.ts
 * 
 * Verifies Firebase JWT tokens and attaches user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import type { UserContext } from '../../types/auth-context';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

const auth = admin.auth();

/**
 * Express middleware to verify Firebase authentication token
 * Extracts token from Authorization header and validates with Firebase
 * 
 * @throws 401 Unauthorized if no token or invalid token
 */
export async function verifyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user context to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: ((decodedToken as any).role as any) || 'STUDENT',
      ...decodedToken,
    } as UserContext;

    logger.debug(`Auth verified for user: ${req.user.uid}`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${(error as Error).message}`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token present
 */
export async function verifyAuthOptional(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role: (decodedToken.role as any) || 'STUDENT',
        ...decodedToken,
      };
    }
    next();
  } catch (error) {
    logger.warn(`Optional auth failed: ${(error as Error).message}`);
    next(); // Continue anyway
  }
}

/**
 * Authorization middleware factory
 * Checks if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This operation requires one of: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only authorization middleware
 */
export const verifyAdmin = requireRole('ADMIN');
