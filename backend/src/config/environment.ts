import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment configuration with validation
export const config = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Application configuration
  APP_NAME: process.env.APP_NAME || 'AI Companion',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@aicompanion.com',
  
  // Firebase configuration
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  
  // CORS configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:19006',
    'http://localhost:8081',
  ],
  
  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Security configuration
  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database configuration (if you add a separate database later)
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Email configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_SECURE: process.env.EMAIL_SECURE || 'false',
  EMAIL_USER: process.env.EMAIL_USER || 'noreply@aicompanion.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'AI Companion <noreply@aicompanion.com>',
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || 'support@aicompanion.com',
  
  // SMS configuration (Twilio)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // External services configuration
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Feature flags
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_CORS: process.env.ENABLE_CORS !== 'false',
  ENABLE_HELMET: process.env.ENABLE_HELMET !== 'false',
  ENABLE_EMAIL: process.env.ENABLE_EMAIL !== 'false',
  ENABLE_SMS: process.env.ENABLE_SMS !== 'false',
  
  // Background jobs configuration
  ENABLE_BACKGROUND_JOBS: process.env.ENABLE_BACKGROUND_JOBS !== 'false',
  ENABLE_EMAIL_QUEUE: process.env.ENABLE_EMAIL_QUEUE !== 'false',
  ENABLE_FILE_PROCESSING_QUEUE: process.env.ENABLE_FILE_PROCESSING_QUEUE !== 'false',
  ENABLE_EXPORT_QUEUE: process.env.ENABLE_EXPORT_QUEUE !== 'false',
  ENABLE_SCHEDULED_JOBS: process.env.ENABLE_SCHEDULED_JOBS !== 'false',
  
  // Queue configuration
  QUEUE_CONCURRENCY: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  QUEUE_POLL_INTERVAL: parseInt(process.env.QUEUE_POLL_INTERVAL || '5000', 10), // 5 seconds
  QUEUE_VISIBILITY_TIMEOUT: parseInt(process.env.QUEUE_VISIBILITY_TIMEOUT || '300000', 10), // 5 minutes
};

// Validation function to ensure required environment variables are set
export const validateEnvironment = () => {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_STORAGE_BUCKET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Helper function to check if we're in production
export const isProduction = () => config.NODE_ENV === 'production';

// Helper function to check if we're in development
export const isDevelopment = () => config.NODE_ENV === 'development';

// Helper function to check if we're in test environment
export const isTest = () => config.NODE_ENV === 'test'; 