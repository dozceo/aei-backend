/**
 * Authentication Middleware
 * src/server/middleware/auth.ts
 * 
 * Verifies Firebase JWT tokens and attaches user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAuth } from '../../lib/firebase';
import { logger } from '../utils/logger';
import type { UserContext } from '../../types/auth-context';

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

function getRoleCandidates(decodedToken: Record<string, unknown>): string[] {
  const candidates: string[] = [];

  const roleValue = decodedToken.role;
  if (typeof roleValue === 'string' && roleValue.length > 0) {
    candidates.push(roleValue);
  }

  const rolesValue = decodedToken.roles;
  if (Array.isArray(rolesValue)) {
    rolesValue.forEach((entry) => {
      if (typeof entry === 'string' && entry.length > 0) {
        candidates.push(entry);
      }
    });
  }

  if (candidates.length === 0) {
    candidates.push('STUDENT');
  }

  return Array.from(new Set(candidates));
}

function matchesRole(actualRoles: string[], expectedRole: string): boolean {
  return actualRoles.some((actualRole) => actualRole.toLowerCase() === expectedRole.toLowerCase());
}

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

    const token = authHeader.substring(7);
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const roleCandidates = getRoleCandidates(decodedToken as unknown as Record<string, unknown>);
    const primaryRole = roleCandidates[0];

    // Attach user context to request
    req.user = {
      uid: decodedToken.uid,
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      role: primaryRole,
      roles: roleCandidates,
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
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      const roleCandidates = getRoleCandidates(decodedToken as unknown as Record<string, unknown>);
      req.user = {
        uid: decodedToken.uid,
        userId: decodedToken.uid,
        email: decodedToken.email || '',
        role: roleCandidates[0],
        roles: roleCandidates,
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

    const actualRoles = [req.user.role, ...(req.user.roles || [])].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    const hasRole = roles.some((requiredRole) => matchesRole(actualRoles, requiredRole));

    if (!hasRole) {
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
export const verifyAdmin = requireRole('ADMIN', 'admin');
