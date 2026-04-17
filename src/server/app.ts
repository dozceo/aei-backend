/**
 * Main Express application setup
 * src/server/app.ts
 * 
 * Configures middleware, authentication, and route registration
 * for the Sankalp Learning Platform API
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Middleware imports
import { verifyAuth } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

// Route imports
import notificationsRouter from './routes/notifications';
import interventionsRouter from './routes/interventions';
import trackingRouter from './routes/tracking';
import billingRouter from './routes/billing';
import firestoreRouter from '../routes/firestore.routes';

function getAllowedOrigins(): string[] {
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
export function createApp(): Express {
  const app = express();

  // ═══════════════════════════════════════════════════════════════
  // Core Middleware
  // ═══════════════════════════════════════════════════════════════

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Compression middleware
  app.use(compression());

  // ═══════════════════════════════════════════════════════════════
  // Logging & Monitoring
  // ═══════════════════════════════════════════════════════════════

  app.use(requestLogger);

  // Health check endpoint (no auth required)
  app.get('/health', (req: Request, res: Response) => {
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
  app.get('/api/version', (req: Request, res: Response) => {
    res.json({
      apiVersion: process.env.API_VERSION || '1.0.0',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes - these include their own auth middleware
  app.use('/api', billingRouter);
  app.use('/api', notificationsRouter);
  app.use('/api', interventionsRouter);
  app.use('/api', trackingRouter);
  app.use('/api', firestoreRouter);

  // ═══════════════════════════════════════════════════════════════
  // 404 & Error Handling
  // ═══════════════════════════════════════════════════════════════

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      path: req.path,
      method: req.method,
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

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

export default createApp;
