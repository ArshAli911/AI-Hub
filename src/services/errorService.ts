import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import firebaseAuthService from './firebaseService';
import apiClient from '../api/client';

export interface ErrorInfo {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  appVersion: string;
  platform: string;
  deviceInfo: DeviceInfo;
  networkInfo?: NetworkInfo;
  breadcrumbs: Breadcrumb[];
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  buildNumber: string;
  deviceModel: string;
  deviceId: string;
  screenSize: string;
  memoryUsage: number;
  batteryLevel?: number;
}

export interface NetworkInfo {
  isConnected: boolean;
  type: string;
  strength?: number;
  speed?: number;
}

export interface Breadcrumb {
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  category: 'api' | 'ui' | 'database' | 'storage' | 'network';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorConfig {
  enableSentry: boolean;
  enableCrashlytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableBreadcrumbs: boolean;
  enableNetworkMonitoring: boolean;
  enableDeviceMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  maxBreadcrumbs: number;
  maxErrorsPerSession: number;
  sampleRate: number;
}

class ErrorService {
  private errors: ErrorInfo[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private sessionId: string;
  private isInitialized = false;
  private config: ErrorConfig = {
    enableSentry: true,
    enableCrashlytics: true,
    enablePerformanceMonitoring: true,
    enableBreadcrumbs: true,
    enableNetworkMonitoring: true,
    enableDeviceMonitoring: true,
    logLevel: 'info',
    maxBreadcrumbs: 100,
    maxErrorsPerSession: 50,
    sampleRate: 1.0
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Initialize error service
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize Sentry if enabled
      if (this.config.enableSentry) {
        Sentry.init({
          dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
          environment: __DEV__ ? 'development' : 'production',
          debug: __DEV__,
          enableAutoSessionTracking: true,
          sessionTrackingIntervalMillis: 30000,
          maxBreadcrumbs: this.config.maxBreadcrumbs,
          beforeSend: (event) => this.beforeSend(event),
          beforeBreadcrumb: (breadcrumb) => this.beforeBreadcrumb(breadcrumb),
        });

        // Set user context
        const user = firebaseAuthService.getCurrentUser();
        if (user) {
          Sentry.setUser({
            id: user.uid,
            email: user.email,
            username: user.displayName,
          });
        }
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Set up network monitoring
      if (this.config.enableNetworkMonitoring) {
        this.setupNetworkMonitoring();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing error service:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalUnhandledRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      this.captureError(new Error(event.reason), {
        type: 'unhandled_rejection',
        context: { reason: event.reason }
      });
      
      if (originalUnhandledRejectionHandler) {
        originalUnhandledRejectionHandler(event);
      }
    };

    // Handle JavaScript errors
    const originalErrorHandler = global.onerror;
    global.onerror = (message, source, lineno, colno, error) => {
      this.captureError(error || new Error(message as string), {
        type: 'javascript_error',
        context: { source, lineno, colno }
      });
      
      if (originalErrorHandler) {
        originalErrorHandler(message, source, lineno, colno, error);
      }
    };
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor API response times
    const originalRequest = apiClient.get;
    apiClient.get = async (...args) => {
      const startTime = Date.now();
      try {
        const result = await originalRequest.apply(apiClient, args);
        this.recordPerformanceMetric('api_response_time', Date.now() - startTime, 'ms', 'api', {
          endpoint: args[0],
          method: 'GET',
          status: 'success'
        });
        return result;
      } catch (error) {
        this.recordPerformanceMetric('api_response_time', Date.now() - startTime, 'ms', 'api', {
          endpoint: args[0],
          method: 'GET',
          status: 'error'
        });
        throw error;
      }
    };

    // Monitor component render times
    if (Platform.OS === 'web') {
      this.setupWebPerformanceMonitoring();
    } else {
      this.setupNativePerformanceMonitoring();
    }
  }

  /**
   * Set up web performance monitoring
   */
  private setupWebPerformanceMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Monitor page load times
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.recordPerformanceMetric('page_load_time', loadTime, 'ms', 'ui');
      });

      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          this.recordPerformanceMetric('memory_usage', memory.usedJSHeapSize, 'bytes', 'ui');
        }, 30000);
      }
    }
  }

  /**
   * Set up native performance monitoring
   */
  private setupNativePerformanceMonitoring(): void {
    // Monitor app startup time
    const startTime = Date.now();
    setTimeout(() => {
      this.recordPerformanceMetric('app_startup_time', Date.now() - startTime, 'ms', 'ui');
    }, 1000);
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor network requests
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const result = await originalFetch.apply(global, args);
        this.recordPerformanceMetric('network_request_time', Date.now() - startTime, 'ms', 'network', {
          url: args[0],
          method: args[1]?.method || 'GET'
        });
        return result;
      } catch (error) {
        this.recordPerformanceMetric('network_request_time', Date.now() - startTime, 'ms', 'network', {
          url: args[0],
          method: args[1]?.method || 'GET',
          error: true
        });
        throw error;
      }
    };
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context?: {
    type?: string;
    context?: Record<string, any>;
    level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  }): string {
    try {
      const errorInfo: ErrorInfo = {
        id: this.generateErrorId(),
        type: context?.level || 'error',
        message: error.message,
        stack: error.stack,
        context: context?.context,
        userId: firebaseAuthService.getCurrentUser()?.uid,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        appVersion: this.getAppVersion(),
        platform: Platform.OS,
        deviceInfo: this.getDeviceInfo(),
        breadcrumbs: [...this.breadcrumbs],
        resolved: false
      };

      // Add to local errors array
      this.errors.push(errorInfo);

      // Send to Sentry if enabled
      if (this.config.enableSentry) {
        Sentry.captureException(error, {
          tags: {
            type: context?.type || 'unknown',
            sessionId: this.sessionId
          },
          extra: context?.context,
          level: context?.level || 'error'
        });
      }

      // Send to backend
      this.sendErrorToBackend(errorInfo);

      // Add breadcrumb
      this.addBreadcrumb('Error captured', 'error', {
        errorId: errorInfo.id,
        message: error.message,
        type: context?.type
      });

      return errorInfo.id;
    } catch (err) {
      console.error('Error capturing error:', err);
      return '';
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!this.config.enableBreadcrumbs) return;

    const breadcrumb: Breadcrumb = {
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now()
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep breadcrumbs within limit
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Send to Sentry if enabled
    if (this.config.enableSentry) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(
    name: string,
    value: number,
    unit: string,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      category,
      timestamp: Date.now(),
      metadata
    };

    this.performanceMetrics.push(metric);

    // Send to Sentry if enabled
    if (this.config.enableSentry) {
      Sentry.addBreadcrumb({
        message: `Performance: ${name} = ${value}${unit}`,
        category: 'performance',
        data: { name, value, unit, category, ...metadata },
        level: 'info'
      });
    }

    // Send to backend periodically
    if (this.performanceMetrics.length >= 10) {
      this.sendMetricsToBackend();
    }
  }

  /**
   * Send error to backend
   */
  private async sendErrorToBackend(errorInfo: ErrorInfo): Promise<void> {
    try {
      await apiClient.post('/errors', errorInfo);
    } catch (error) {
      console.error('Error sending error to backend:', error);
    }
  }

  /**
   * Send metrics to backend
   */
  private async sendMetricsToBackend(): Promise<void> {
    try {
      const metrics = [...this.performanceMetrics];
      this.performanceMetrics = [];
      
      await apiClient.post('/metrics', {
        sessionId: this.sessionId,
        userId: firebaseAuthService.getCurrentUser()?.uid,
        metrics
      });
    } catch (error) {
      console.error('Error sending metrics to backend:', error);
    }
  }

  /**
   * Get errors for current session
   */
  getSessionErrors(): ErrorInfo[] {
    return this.errors.filter(error => error.sessionId === this.sessionId);
  }

  /**
   * Get performance metrics for current session
   */
  getSessionMetrics(): PerformanceMetric[] {
    return this.performanceMetrics;
  }

  /**
   * Get breadcrumbs for current session
   */
  getSessionBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear session data
   */
  clearSessionData(): void {
    this.errors = this.errors.filter(error => error.sessionId !== this.sessionId);
    this.performanceMetrics = [];
    this.breadcrumbs = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ErrorConfig {
    return { ...this.config };
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get app version
   */
  private getAppVersion(): string {
    // This would typically come from app.json or package.json
    return '1.0.0';
  }

  /**
   * Get device info
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS,
      version: Platform.Version?.toString() || 'unknown',
      buildNumber: '1',
      deviceModel: 'unknown',
      deviceId: 'unknown',
      screenSize: 'unknown',
      memoryUsage: 0
    };
  }

  /**
   * Before send callback for Sentry
   */
  private beforeSend(event: any): any {
    // Filter out certain errors or modify event data
    if (event.exception && event.exception.values) {
      const exception = event.exception.values[0];
      if (exception.value && exception.value.includes('Network request failed')) {
        return null; // Don't send network errors to Sentry
      }
    }
    return event;
  }

  /**
   * Before breadcrumb callback for Sentry
   */
  private beforeBreadcrumb(breadcrumb: any): any {
    // Filter out sensitive data or modify breadcrumb
    if (breadcrumb.data && breadcrumb.data.password) {
      breadcrumb.data.password = '[REDACTED]';
    }
    return breadcrumb;
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    // Send remaining metrics
    if (this.performanceMetrics.length > 0) {
      this.sendMetricsToBackend();
    }

    // Clear session data
    this.clearSessionData();
  }
}

export const errorService = new ErrorService();
export default errorService; 