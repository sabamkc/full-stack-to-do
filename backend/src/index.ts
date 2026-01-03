import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import './config/firebase'; // Initialize Firebase
import pool from './config/database'; // Initialize database
import logger from './config/logger';

// Import middleware
import { requestLogger, detailedRequestLogger, requestIdMiddleware, errorLogger } from './middleware/logger.middleware';
import { generalRateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';

const app: Application = express();

// ============================================
// MIDDLEWARE STACK (ORDER IS IMPORTANT!)
// ============================================

// 1. Request ID - Assign unique ID to each request for tracing
app.use(requestIdMiddleware);

// 2. Security Headers - Must be first to ensure headers are set
app.use(helmet());

// 3. CORS - Cross-origin resource sharing
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 4. Body Parsers - Parse request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Request Logging - Log all incoming requests
app.use(requestLogger); // Morgan + Winston integration
app.use(detailedRequestLogger); // Detailed structured logs

// 6. Rate Limiting - Apply to all routes except health check
app.use(generalRateLimiter);

// ============================================
// ROUTES
// ============================================

// Health check endpoint (no authentication required)
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      checks: {
        database: 'connected',
        firebase: 'initialized',
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Todo App API',
    version: '1.0.0',
    status: 'running',
    environment: env.NODE_ENV,
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/docs',
    },
  });
});

// API Routes will be mounted here
app.use('/api/v1/auth', authRoutes);
// Example: app.use('/api/v1/todos', authenticateUser, todoRoutes);
// Example: app.use('/api/v1/projects', authenticateUser, projectRoutes);

// ============================================
// ERROR HANDLING (MUST BE LAST!)
// ============================================

// 404 handler - catches all undefined routes
app.use(notFoundHandler);

// Error logger - logs errors before sending response
app.use(errorLogger);

// Global error handler - must be last middleware
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: env.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid,
  });
  
  console.log('=================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📝 Logs: ./logs/`);
  console.log('=================================');
});

// Handle server errors
server.on('error', (error: any) => {
  logger.error('Server error', { error: error.message, code: error.code });
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;