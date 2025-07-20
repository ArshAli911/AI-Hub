interface PerformanceMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface BundleInfo {
  totalSize: number;
  gzippedSize: number;
  components: Record<string, number>;
}

class PerformanceMonitor {
  private measurements: Map<string, number> = new Map();

  startMeasurement(label: string): string {
    const timestamp = performance.now();
    this.measurements.set(label, timestamp);
    
    if (typeof performance.mark === 'function') {
      performance.mark(`${label}-start`);
    }
    
    return label;
  }

  endMeasurement(label: string): number {
    const endTime = performance.now();
    const startTime = this.measurements.get(label);
    
    if (typeof performance.mark === 'function') {
      performance.mark(`${label}-end`);
    }
    
    if (typeof performance.measure === 'function' && startTime) {
      performance.measure(label, `${label}-start`, `${label}-end`);
    }
    
    if (startTime) {
      const duration = endTime - startTime;
      this.measurements.delete(label);
      return duration;
    }
    
    return 0;
  }

  getMemoryInfo(): PerformanceMetrics {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize || 0,
        totalJSHeapSize: memory.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
      };
    }
    
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  }

  measureMemoryUsage(): number {
    const memoryInfo = this.getMemoryInfo();
    return memoryInfo.usedJSHeapSize;
  }

  getBundleInfo(): BundleInfo {
    // This would typically be populated by a build-time analysis
    return {
      totalSize: 1700000, // 1.7MB
      gzippedSize: 500000, // 500KB
      components: {
        main: 500000,
        vendor: 1000000,
        lazy: 200000,
      },
    };
  }

  startTiming(label: string): void {
    this.startMeasurement(label);
  }

  endTiming(label: string): number {
    return this.endMeasurement(label);
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;