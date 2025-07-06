import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { securityMiddleware, authRateLimit, userCreationRateLimit } from './middleware/securityMiddleware';
import { config, validateEnvironment } from './config/environment';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { initializeSentry } from './services/sentryService';
import { SchedulerService } from './services/schedulerService';
import logger from './services/loggerService';

// Load environment variables
dotenv.config();

// Validate environment configuration
validateEnvironment();

// Initialize Sentry
initializeSentry();

// Initialize scheduled jobs
SchedulerService.initializeJobs();

const app = express();

// Security middleware
app.use(securityMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes with rate limiting
app.use('/api', routes);

// Apply specific rate limits
app.use('/api/users/create', userCreationRateLimit);
app.use('/api/users/set-claims', authRateLimit);

// Swagger/OpenAPI setup
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AI Hub Backend API',
    version: '1.0.0',
    description: 'API documentation for the AI Hub backend',
  },
  servers: [
    {
      url: '/api',
      description: 'API server',
    },
  ],
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // JSDoc comments in these files
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic root route
app.get('/', (req, res) => {
  res.json({
    message: 'AI Companion Backend is running!',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handling Middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  SchedulerService.stopAllJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  SchedulerService.stopAllJobs();
  process.exit(0);
});

export default app; 