export const appConfig = {
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.example.com',
    timeout: 30000, // 30 seconds
  },
  app: {
    name: 'AI Hub',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  features: {
    offlineMode: true,
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
  },
  security: {
    encryptionEnabled: true,
    rateLimitingEnabled: true,
    inputValidationEnabled: true,
  },
  accessibility: {
    enabled: true,
    announcements: true,
    highContrast: false,
  },
  performance: {
    enableLazyLoading: true,
    enableMemoryManagement: true,
    enablePerformanceMonitoring: true,
  },
} as const;

export default appConfig;