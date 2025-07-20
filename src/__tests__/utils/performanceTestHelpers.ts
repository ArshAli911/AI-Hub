/**
 * Performance testing utilities and helpers
 */

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  bundleSize?: number;
  networkRequests?: number;
}

export interface PerformanceThresholds {
  renderTime: number;
  memoryUsage: number;
  bundleSize?: number;
  networkLatency?: number;
}

export class PerformanceTestHelper {
  private static instance: PerformanceTestHelper;
  private metrics: Map<string, PerformanceMetrics> = new Map();

  static getInstance(): PerformanceTestHelper {
    if (!PerformanceTestHelper.instance) {
      PerformanceTestHelper.instance = new PerformanceTestHelper();
    }
    return PerformanceTestHelper.instance;
  }

  /**
   * Measure component render time
   */
  async measureRenderTime<T>(
    testName: string,
    renderFunction: () => Promise<T> | T,
    threshold: number = 100
  ): Promise<{ result: T; renderTime: number }> {
    const startTime = performance.now();
    const result = await renderFunction();
    const renderTime = performance.now() - startTime;

    this.recordMetric(testName, { renderTime, memoryUsage: this.getCurrentMemoryUsage() });

    if (renderTime > threshold) {
      console.warn(`⚠️ Performance Warning: ${testName} took ${renderTime}ms (threshold: ${threshold}ms)`);
    }

    return { result, renderTime };
  }

  /**
   * Measure memory usage during test execution
   */
  measureMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    return this.measureMemoryUsage();
  }

  /**
   * Monitor memory leaks
   */
  async detectMemoryLeaks(
    testName: string,
    testFunction: () => Promise<void> | void,
    threshold: number = 1000000 // 1MB
  ): Promise<boolean> {
    const initialMemory = this.getCurrentMemoryUsage();
    
    await testFunction();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalMemory = this.getCurrentMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;
    
    const hasLeak = memoryIncrease > threshold;
    
    if (hasLeak) {
      console.warn(`🔴 Memory Leak Detected: ${testName} increased memory by ${memoryIncrease} bytes`);
    }
    
    this.recordMetric(testName, {
      renderTime: 0,
      memoryUsage: memoryIncrease
    });
    
    return hasLeak;
  }

  /**
   * Measure animation performance
   */
  async measureAnimationPerformance(
    animationFunction: () => Promise<void>,
    expectedDuration: number,
    frameRate: number = 60
  ): Promise<{ actualDuration: number; droppedFrames: number }> {
    const frameDuration = 1000 / frameRate;
    let frameCount = 0;
    let droppedFrames = 0;
    
    const startTime = performance.now();
    
    // Mock requestAnimationFrame to count frames
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = jest.fn((callback) => {
      frameCount++;
      const frameTime = frameCount * frameDuration;
      const actualFrameTime = performance.now() - startTime;
      
      if (actualFrameTime > frameTime + frameDuration) {
        droppedFrames++;
      }
      
      setTimeout(() => callback(frameTime), frameDuration);
      return frameCount;
    });
    
    await animationFunction();
    
    const actualDuration = performance.now() - startTime;
    
    // Restore original RAF
    global.requestAnimationFrame = originalRAF;
    
    return { actualDuration, droppedFrames };
  }

  /**
   * Benchmark function execution time
   */
  async benchmark<T>(
    name: string,
    fn: () => Promise<T> | T,
    iterations: number = 100
  ): Promise<{ average: number; min: number; max: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const result = await fn();
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      results.push(result);
    }
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`📊 Benchmark ${name}: avg=${average.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    
    return { average, min, max, results };
  }

  /**
   * Record performance metric
   */
  private recordMetric(testName: string, metrics: PerformanceMetrics): void {
    this.metrics.set(testName, metrics);
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = ['📈 Performance Test Report', '=' .repeat(50)];
    
    for (const [testName, metrics] of this.metrics) {
      report.push(`\n🧪 ${testName}:`);
      report.push(`  Render Time: ${metrics.renderTime.toFixed(2)}ms`);
      report.push(`  Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      
      if (metrics.bundleSize) {
        report.push(`  Bundle Size: ${(metrics.bundleSize / 1024).toFixed(2)}KB`);
      }
    }
    
    return report.join('\n');
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Assert performance threshold
   */
  assertPerformanceThreshold(
    testName: string,
    actualValue: number,
    threshold: number,
    metric: string
  ): void {
    if (actualValue > threshold) {
      throw new Error(
        `Performance threshold exceeded for ${testName}: ${metric} was ${actualValue}, expected <= ${threshold}`
      );
    }
  }

  /**
   * Create performance test wrapper
   */
  createPerformanceTest<T>(
    testName: string,
    testFunction: () => Promise<T> | T,
    thresholds: PerformanceThresholds
  ) {
    return async (): Promise<T> => {
      const initialMemory = this.getCurrentMemoryUsage();
      const startTime = performance.now();
      
      const result = await testFunction();
      
      const renderTime = performance.now() - startTime;
      const finalMemory = this.getCurrentMemoryUsage();
      const memoryUsage = finalMemory - initialMemory;
      
      // Assert thresholds
      this.assertPerformanceThreshold(testName, renderTime, thresholds.renderTime, 'Render Time');
      this.assertPerformanceThreshold(testName, memoryUsage, thresholds.memoryUsage, 'Memory Usage');
      
      // Record metrics
      this.recordMetric(testName, { renderTime, memoryUsage });
      
      return result;
    };
  }
}

/**
 * Global performance test helper instance
 */
export const performanceTestHelper = PerformanceTestHelper.getInstance();

/**
 * Performance test decorators and utilities
 */
export const withPerformanceTest = <T extends any[], R>(
  fn: (...args: T) => Promise<R> | R,
  testName: string,
  thresholds: PerformanceThresholds
) => {
  return async (...args: T): Promise<R> => {
    return performanceTestHelper.createPerformanceTest(testName, () => fn(...args), thresholds)();
  };
};

/**
 * Mock performance API for testing
 */
export const mockPerformanceAPI = () => {
  const mockPerformance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 2000000000,
    },
  };

  Object.defineProperty(global, 'performance', {
    value: mockPerformance,
    writable: true,
  });

  return mockPerformance;
};

/**
 * Network performance testing utilities
 */
export class NetworkPerformanceHelper {
  private requestTimes: Map<string, number> = new Map();

  startRequest(requestId: string): void {
    this.requestTimes.set(requestId, performance.now());
  }

  endRequest(requestId: string): number {
    const startTime = this.requestTimes.get(requestId);
    if (!startTime) {
      throw new Error(`No start time found for request: ${requestId}`);
    }
    
    const duration = performance.now() - startTime;
    this.requestTimes.delete(requestId);
    
    return duration;
  }

  async measureNetworkLatency(
    requestFunction: () => Promise<any>,
    requestId: string = 'default'
  ): Promise<{ result: any; latency: number }> {
    this.startRequest(requestId);
    const result = await requestFunction();
    const latency = this.endRequest(requestId);
    
    return { result, latency };
  }
}

export const networkPerformanceHelper = new NetworkPerformanceHelper();