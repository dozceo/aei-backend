"use strict";
/**
 * Server Entry Point
 * src/server/index.ts
 *
 * Initializes and starts the Express server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
// Load environment variables
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
/**
 * Initialize and start the server
 */
async function startServer() {
    try {
        const app = (0, app_1.default)();
        const server = app.listen(PORT, HOST, () => {
            logger_1.logger.info(`🚀 Server started in ${NODE_ENV} mode`);
            logger_1.logger.info(`📍 Listening on http://${HOST}:${PORT}`);
            logger_1.logger.info(`🏥 Health check: http://${HOST}:${PORT}/health`);
            logger_1.logger.info(`📡 API routes available at http://${HOST}:${PORT}/api`);
        });
        // Graceful shutdown on SIGTERM
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        // Graceful shutdown on SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger_1.logger.info('Server closed');
                process.exit(0);
            });
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', { promise, reason });
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Start server
startServer();
//# sourceMappingURL=index.js.map