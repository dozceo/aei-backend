/**
 * Global Error Handler Middleware
 * src/server/middleware/error-handler.ts
 *
 * Catches and formats all errors from route handlers
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Custom error class for API errors
 */
export declare class ApiError extends Error {
    statusCode: number;
    code?: string;
    details?: any;
    constructor(statusCode: number, message: string, code?: string, details?: any);
}
/**
 * Global error handler middleware
 * Formats errors and sends JSON responses
 */
export declare function errorHandler(error: Error | ApiError, req: Request, res: Response, _next: NextFunction): void;
/**
 * Async route wrapper to catch Promise rejections
 */
export declare function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error-handler.d.ts.map