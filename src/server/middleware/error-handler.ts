/**
 * Global Error Handler Middleware
 * src/server/middleware/error-handler.ts
 * 
 * Catches and formats all errors from route handlers
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 * Formats errors and sends JSON responses
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error(`Error handling ${req.method} ${req.path}:`, error);

  // Handle ApiError instances
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default 500 error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async route wrapper to catch Promise rejections
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
