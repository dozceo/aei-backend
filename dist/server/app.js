"use strict";
/**
 * Main Express application setup
 * src/server/app.ts
 *
 * Configures middleware, authentication, and route registration
 * for the Sankalp Learning Platform API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
// Route imports
const notifications_1 = __importDefault(require("./routes/notifications"));
const interventions_1 = __importDefault(require("./routes/interventions"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const billing_1 = __importDefault(require("./routes/billing"));
function getAllowedOrigins() {
    const configuredOrigins = process.env.CORS_ORIGIN;
    if (!configuredOrigins) {
        return ['http://localhost:3000', 'http://localhost:3001'];
    }
    return configuredOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}
/**
 * Initialize Express application with full middleware configuration
 */
function createApp() {
    const app = (0, express_1.default)();
    // ═══════════════════════════════════════════════════════════════
    // Core Middleware
    // ═══════════════════════════════════════════════════════════════
    // Security middleware
    app.use((0, helmet_1.default)());
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: getAllowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    // Body parsing middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
    // Compression middleware
    app.use((0, compression_1.default)());
    // ═══════════════════════════════════════════════════════════════
    // Logging & Monitoring
    // ═══════════════════════════════════════════════════════════════
    app.use(request_logger_1.requestLogger);
    // Health check endpoint (no auth required)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || '1.0.0',
        });
    });
    // ═══════════════════════════════════════════════════════════════
    // API Routes
    // ═══════════════════════════════════════════════════════════════
    // Health check and version endpoint (public)
    app.get('/api/version', (req, res) => {
        res.json({
            apiVersion: process.env.API_VERSION || '1.0.0',
            nodeVersion: process.version,
            timestamp: new Date().toISOString(),
        });
    });
    // Mount API routes - these include their own auth middleware
    app.use('/api', billing_1.default);
    app.use('/api', notifications_1.default);
    app.use('/api', interventions_1.default);
    app.use('/api', tracking_1.default);
    // ═══════════════════════════════════════════════════════════════
    // 404 & Error Handling
    // ═══════════════════════════════════════════════════════════════
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.path} not found`,
            path: req.path,
            method: req.method,
        });
    });
    // Global error handler (must be last)
    app.use(error_handler_1.errorHandler);
    return app;
}
/**
 * Standalone entry point for server startup
 * Usage: node -r ts-node/register src/server/index.ts
 */
if (require.main === module) {
    const app = createApp();
    const PORT = parseInt(process.env.PORT || '8080', 10);
    const HOST = process.env.HOST || 'localhost';
    const server = app.listen(PORT, HOST, () => {
        console.log(`🚀 Server running at http://${HOST}:${PORT}`);
        console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
        console.log(`📡 API Version: http://${HOST}:${PORT}/api/version`);
    });
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received: shutting down gracefully');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
    process.on('SIGINT', () => {
        console.log('SIGINT received: shutting down gracefully');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
}
exports.default = createApp;
//# sourceMappingURL=app.js.map