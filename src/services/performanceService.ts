import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { errorService } from './errorService';
import apiClient from '../api/client';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: 'api' | 'ui' | 'database' | 'storage' | 'network' | 'memory' | 'battery' | 'cpu';
  timestamp: number;
  metadata?: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export interface PerformanceThreshold {
  name: string;
  category: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  action: 'log' | 'alert' | 'error';
}

export interface MemoryInfo {
  total: number;
  used: number;
  available: number;
  usagePercentage: number;
}

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
  isLowPowerMode?: boolean;
}

export interface NetworkInfo {
  type: string;
  isConnected: boolean;
  strength?: number;
  speed?: number;
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableMemoryTracking: boolean;
  enableBatteryTracking: boolean;
  enableNetworkTracking: boolean;
  enableApiTracking: boolean;
  enableUITracking: boolean;
  sampleInterval: number;
  maxMetricsPerSession: number;
  enableThresholds: boolean;
  enableAutoOptimization: boolean;
  enableReporting: boolean;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private sessionId: string;
  private monitoringInterval?: NodeJS.Timeout;
  private config: PerformanceConfig = {
    enableMonitoring: true,
    enableMemoryTracking: true,
    enableBatteryTracking: true,
    enableNetworkTracking: true,
    enableApiTracking: true,
    enableUITracking: true,
    sampleInterval: 30000, // 30 seconds
    maxMetricsPerSession: 1000,
    enableThresholds: true,
    enableAutoOptimization: true,
    enableReporting: true,
  };

  private startTime: number;
  private apiStartTimes: Map<string, number> = new Map();
  private uiRenderTimes: Map<string, number> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeThresholds();
    this.startMonitoring();
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeThresholds(): void {
    this.thresholds = [
      {
        name: 'high_memory_usage',
        category: 'memory',
        threshold: 80, // 80% memory usage
        operator: 'gte',
        action: 'alert',
      },
      {
        name: 'low_battery',
        category: 'battery',
        threshold: 20, // 20% battery
        operator: 'lte',
        action: 'alert',
      },
      {
        name: 'slow_api_response',
        category: 'api',
        threshold: 5000, // 5 seconds
        operator: 'gt',
        action: 'log',
      },
      {
        name: 'slow_ui_render',
        category: 'ui',
        threshold: 100, // 100ms
        operator: 'gt',
        action: 'log',
      },
    ];
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);

    // Collect initial metrics
    this.collectMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const promises: Promise<void>[] = [];

      if (this.config.enableMemoryTracking) {
        promises.push(this.collectMemoryMetrics());
      }

      if (this.config.enableBatteryTracking) {
        promises.push(this.collectBatteryMetrics());
      }

      if (this.config.enableNetworkTracking) {
        promises.push(this.collectNetworkMetrics());
      }

      await Promise.all(promises);

      // Check thresholds
      if (this.config.enableThresholds) {
        this.checkThresholds();
      }

      // Auto-optimize if enabled
      if (this.config.enableAutoOptimization) {
        this.autoOptimize();
      }

      // Report metrics if enabled
      if (this.config.enableReporting) {
        this.reportMetrics();
      }
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'performance_metric_collection_error'
      });
    }
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<void> {
    try {
      const memoryInfo = await this.getMemoryInfo();
      
      this.recordMetric('memory_usage_percentage', memoryInfo.usagePercentage, '%', 'memory', {
        total: memoryInfo.total,
        used: memoryInfo.used,
        available: memoryInfo.available,
      });

      this.recordMetric('memory_used_mb', memoryInfo.used / (1024 * 1024), 'MB', 'memory');
      this.recordMetric('memory_available_mb', memoryInfo.available / (1024 * 1024), 'MB', 'memory');
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'memory_metric_error'
      });
    }
  }

  /**
   * Collect battery metrics
   */
  private async collectBatteryMetrics(): Promise<void> {
    try {
      const batteryInfo = await this.getBatteryInfo();
      
      this.recordMetric('battery_level', batteryInfo.level * 100, '%', 'battery', {
        isCharging: batteryInfo.isCharging,
        isLowPowerMode: batteryInfo.isLowPowerMode,
      });
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'battery_metric_error'
      });
    }
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<void> {
    try {
      const networkInfo = await this.getNetworkInfo();
      
      this.recordMetric('network_connected', networkInfo.isConnected ? 1 : 0, 'boolean', 'network', {
        type: networkInfo.type,
        strength: networkInfo.strength,
        speed: networkInfo.speed,
      });
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'network_metric_error'
      });
    }
  }

  /**
   * Get memory information
   */
  private async getMemoryInfo(): Promise<MemoryInfo> {
    // This would typically use a native module or platform-specific API
    // For now, we'll return mock data
    const total = 4 * 1024 * 1024 * 1024; // 4GB
    const used = Math.random() * total * 0.8; // Random usage up to 80%
    const available = total - used;
    
    return {
      total,
      used,
      available,
      usagePercentage: (used / total) * 100,
    };
  }

  /**
   * Get battery information
   */
  private async getBatteryInfo(): Promise<BatteryInfo> {
    // This would typically use expo-battery or a native module
    // For now, we'll return mock data
    return {
      level: Math.random(), // Random battery level
      isCharging: Math.random() > 0.5,
      isLowPowerMode: Math.random() > 0.8,
    };
  }

  /**
   * Get network information
   */
  private async getNetworkInfo(): Promise<NetworkInfo> {
    // This would typically use expo-network or a native module
    // For now, we'll return mock data
    return {
      type: 'wifi',
      isConnected: true,
      strength: Math.random() * 100,
      speed: Math.random() * 100,
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name,
      value,
      unit,
      category,
      timestamp: Date.now(),
      metadata,
      sessionId: this.sessionId,
    };

    this.metrics.push(metric);

    // Keep metrics within limit
    if (this.metrics.length > this.config.maxMetricsPerSession) {
      this.metrics.shift();
    }
  }

  /**
   * Start API request timing
   */
  startApiRequest(endpoint: string): void {
    if (!this.config.enableApiTracking) return;
    
    this.apiStartTimes.set(endpoint, Date.now());
  }

  /**
   * End API request timing
   */
  endApiRequest(endpoint: string, success: boolean = true): void {
    if (!this.config.enableApiTracking) return;
    
    const startTime = this.apiStartTimes.get(endpoint);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.recordMetric('api_response_time', duration, 'ms', 'api', {
        endpoint,
        success,
      });
      this.apiStartTimes.delete(endpoint);
    }
  }

  /**
   * Start UI render timing
   */
  startUIRender(componentName: string): void {
    if (!this.config.enableUITracking) return;
    
    this.uiRenderTimes.set(componentName, Date.now());
  }

  /**
   * End UI render timing
   */
  endUIRender(componentName: string): void {
    if (!this.config.enableUITracking) return;
    
    const startTime = this.uiRenderTimes.get(componentName);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.recordMetric('ui_render_time', duration, 'ms', 'ui', {
        component: componentName,
      });
      this.uiRenderTimes.delete(componentName);
    }
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(): void {
    for (const threshold of this.thresholds) {
      const recentMetrics = this.metrics.filter(
        metric => 
          metric.category === threshold.category &&
          metric.timestamp > Date.now() - this.config.sampleInterval
      );

      if (recentMetrics.length === 0) continue;

      const latestMetric = recentMetrics[recentMetrics.length - 1];
      const shouldTrigger = this.evaluateThreshold(latestMetric.value, threshold);

      if (shouldTrigger) {
        this.handleThresholdViolation(threshold, latestMetric);
      }
    }
  }

  /**
   * Evaluate threshold
   */
  private evaluateThreshold(value: number, threshold: PerformanceThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return value > threshold.threshold;
      case 'lt':
        return value < threshold.threshold;
      case 'eq':
        return value === threshold.threshold;
      case 'gte':
        return value >= threshold.threshold;
      case 'lte':
        return value <= threshold.threshold;
      default:
        return false;
    }
  }

  /**
   * Handle threshold violation
   */
  private handleThresholdViolation(threshold: PerformanceThreshold, metric: PerformanceMetric): void {
    const message = `Performance threshold violated: ${threshold.name} - ${metric.name}: ${metric.value}${metric.unit}`;

    switch (threshold.action) {
      case 'log':
        console.warn(message);
        break;
      case 'alert':
        errorService.captureError(new Error(message), {
          type: 'performance_threshold_alert',
          level: 'warning',
          context: { threshold, metric }
        });
        break;
      case 'error':
        errorService.captureError(new Error(message), {
          type: 'performance_threshold_error',
          level: 'error',
          context: { threshold, metric }
        });
        break;
    }
  }

  /**
   * Auto-optimize performance
   */
  private autoOptimize(): void {
    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp > Date.now() - this.config.sampleInterval
    );

    // Check for high memory usage
    const memoryMetrics = recentMetrics.filter(metric => metric.category === 'memory');
    const avgMemoryUsage = memoryMetrics.reduce((sum, metric) => sum + metric.value, 0) / memoryMetrics.length;

    if (avgMemoryUsage > 85) {
      this.optimizeMemory();
    }

    // Check for slow API responses
    const apiMetrics = recentMetrics.filter(metric => metric.category === 'api');
    const avgApiResponseTime = apiMetrics.reduce((sum, metric) => sum + metric.value, 0) / apiMetrics.length;

    if (avgApiResponseTime > 3000) {
      this.optimizeApiCalls();
    }
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemory(): void {
    // Clear caches, reduce image quality, etc.
    console.warn('Performing memory optimization');
    
    // This would implement actual memory optimization strategies
    // For now, we'll just log the action
  }

  /**
   * Optimize API calls
   */
  private optimizeApiCalls(): void {
    // Implement caching, request batching, etc.
    console.warn('Performing API optimization');
    
    // This would implement actual API optimization strategies
    // For now, we'll just log the action
  }

  /**
   * Report metrics to backend
   */
  private async reportMetrics(): Promise<void> {
    try {
      const recentMetrics = this.metrics.filter(
        metric => metric.timestamp > Date.now() - this.config.sampleInterval
      );

      if (recentMetrics.length === 0) return;

      await apiClient.post('/performance/metrics', {
        sessionId: this.sessionId,
        metrics: recentMetrics,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          model: Device.modelName,
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          appVersion: Application.nativeApplicationVersion,
        },
      });

      // Clear reported metrics
      this.metrics = this.metrics.filter(
        metric => metric.timestamp <= Date.now() - this.config.sampleInterval
      );
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'performance_reporting_error'
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    sessionDuration: number;
    totalMetrics: number;
    averageMemoryUsage: number;
    averageApiResponseTime: number;
    averageUIRenderTime: number;
    thresholdViolations: number;
  } {
    const sessionDuration = Date.now() - this.startTime;
    const totalMetrics = this.metrics.length;

    const memoryMetrics = this.metrics.filter(metric => metric.category === 'memory');
    const averageMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics.reduce((sum, metric) => sum + metric.value, 0) / memoryMetrics.length
      : 0;

    const apiMetrics = this.metrics.filter(metric => metric.category === 'api');
    const averageApiResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, metric) => sum + metric.value, 0) / apiMetrics.length
      : 0;

    const uiMetrics = this.metrics.filter(metric => metric.category === 'ui');
    const averageUIRenderTime = uiMetrics.length > 0
      ? uiMetrics.reduce((sum, metric) => sum + metric.value, 0) / uiMetrics.length
      : 0;

    return {
      sessionDuration,
      totalMetrics,
      averageMemoryUsage,
      averageApiResponseTime,
      averageUIRenderTime,
      thresholdViolations: 0, // This would be tracked separately
    };
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Add performance threshold
   */
  addThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.push(threshold);
  }

  /**
   * Remove performance threshold
   */
  removeThreshold(name: string): void {
    this.thresholds = this.thresholds.filter(threshold => threshold.name !== name);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if interval changed
    if (config.sampleInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Generate metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopMonitoring();
    this.clearMetrics();
  }
}

export const performanceService = new PerformanceService();
export default performanceService; 