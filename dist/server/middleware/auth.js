"use strict";
/**
 * Authentication Middleware
 * src/server/middleware/auth.ts
 *
 * Verifies Firebase JWT tokens and attaches user context to requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = void 0;
exports.verifyAuth = verifyAuth;
exports.verifyAuthOptional = verifyAuthOptional;
exports.requireRole = requireRole;
const firebase_1 = require("../../lib/firebase");
const logger_1 = require("../utils/logger");
function getRoleCandidates(decodedToken) {
    const candidates = [];
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
function matchesRole(actualRoles, expectedRole) {
    return actualRoles.some((actualRole) => actualRole.toLowerCase() === expectedRole.toLowerCase());
}
/**
 * Express middleware to verify Firebase authentication token
 * Extracts token from Authorization header and validates with Firebase
 *
 * @throws 401 Unauthorized if no token or invalid token
 */
async function verifyAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
            return;
        }
        const token = authHeader.substring(7);
        const decodedToken = await firebase_1.auth.verifyIdToken(token);
        const roleCandidates = getRoleCandidates(decodedToken);
        const primaryRole = roleCandidates[0];
        // Attach user context to request
        req.user = {
            uid: decodedToken.uid,
            userId: decodedToken.uid,
            email: decodedToken.email || '',
            role: primaryRole,
            roles: roleCandidates,
            ...decodedToken,
        };
        logger_1.logger.debug(`Auth verified for user: ${req.user.uid}`);
        next();
    }
    catch (error) {
        logger_1.logger.warn(`Authentication failed: ${error.message}`);
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired authentication token',
        });
    }
}
/**
 * Optional auth middleware - doesn't fail if no token present
 */
async function verifyAuthOptional(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decodedToken = await firebase_1.auth.verifyIdToken(token);
            const roleCandidates = getRoleCandidates(decodedToken);
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
    }
    catch (error) {
        logger_1.logger.warn(`Optional auth failed: ${error.message}`);
        next(); // Continue anyway
    }
}
/**
 * Authorization middleware factory
 * Checks if user has required role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const actualRoles = [req.user.role, ...(req.user.roles || [])].filter((value) => typeof value === 'string' && value.length > 0);
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
exports.verifyAdmin = requireRole('ADMIN', 'admin');
//# sourceMappingURL=auth.js.map