"use strict";
/**
 * Global Error Handler Middleware
 * src/server/middleware/error-handler.ts
 *
 * Catches and formats all errors from route handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_1 = require("../utils/logger");
/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
/**
 * Global error handler middleware
 * Formats errors and sends JSON responses
 */
function errorHandler(error, req, res, _next) {
    // Log error
    logger_1.logger.error(`Error handling ${req.method} ${req.path}:`, error);
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
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=error-handler.js.map