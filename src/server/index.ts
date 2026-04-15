/**
 * Server Entry Point
 * src/server/index.ts
 * 
 * Initializes and starts the Express server
 */

import dotenv from 'dotenv';
import createApp from './app';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize and start the server
 */
async function startServer(): Promise<void> {
  try {
    const app = createApp();

    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server started in ${NODE_ENV} mode`);
      logger.info(`📍 Listening on http://${HOST}:${PORT}`);
      logger.info(`🏥 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`📡 API routes available at http://${HOST}:${PORT}/api`);
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer();
