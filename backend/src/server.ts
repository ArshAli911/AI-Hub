import app from "./app";
import { config } from "./config/environment";
import { createServer } from "http";
import { WebSocketService } from "./services/websocketService";
import { SchedulerService } from "./services/schedulerService";
import logger from "./services/loggerService";

const PORT = config.PORT;

// Create HTTP server for Socket.IO
const server = createServer(app);

// Initialize WebSocket service
WebSocketService.initialize(server);

// Initialize email and SMS services
import { EmailService } from './services/emailService';
import { SMSService } from './services/smsService';
import { backgroundJobsService } from './services/backgroundJobsService';

if (config.ENABLE_EMAIL) {
  EmailService.initialize();
  logger.info('Email service initialized');
}

if (config.ENABLE_SMS) {
  SMSService.initialize();
  logger.info('SMS service initialized');
}

// Initialize background jobs service
if (config.ENABLE_BACKGROUND_JOBS) {
  backgroundJobsService.initialize().catch(error => {
    logger.error('Failed to initialize background jobs service:', error);
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Backend server listening on port ${PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
