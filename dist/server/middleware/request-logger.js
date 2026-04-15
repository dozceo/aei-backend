"use strict";
/**
 * Request Logger Middleware
 * src/server/middleware/request-logger.ts
 *
 * Logs all HTTP requests with timing information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_1 = require("../utils/logger");
/**
 * Middleware to log all HTTP requests with response time
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const startHrTime = process.hrtime();
    // Capture original send function
    const originalSend = res.send;
    // Override send to log response
    res.send = function (data) {
        // Calculate timing
        const deltaHrTime = process.hrtime(startHrTime);
        const deltaTime = deltaHrTime[0] * 1000 + deltaHrTime[1] / 1e6; // Convert to ms
        // Log request details
        const logLevel = res.statusCode >= 500
            ? 'error'
            : res.statusCode >= 400
                ? 'warn'
                : 'info';
        const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            responseTime: `${deltaTime.toFixed(2)}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.user?.uid || 'anonymous',
        };
        if (logLevel === 'error') {
            logger_1.logger.error(`${req.method} ${req.path} - ${res.statusCode}`, logData);
        }
        else if (logLevel === 'warn') {
            logger_1.logger.warn(`${req.method} ${req.path} - ${res.statusCode}`, logData);
        }
        else {
            logger_1.logger.info(`${req.method} ${req.path} - ${res.statusCode}`, logData);
        }
        // Call original send
        return originalSend.call(this, data);
    };
    next();
}
//# sourceMappingURL=request-logger.js.map