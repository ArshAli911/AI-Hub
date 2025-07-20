/**
 * Performance reporting and monitoring utilities
 */

export interface PerformanceReport {
  testSuite: string;
  timestamp: number;
  metrics: {
    renderTime: {
      average: number;
      min: number;
      max: number;
      p95: number;
    };
    memoryUsage: {
      peak: number;
      average: number;
      leaks: number;
    };
    bundleSize: {
      main: number;
      vendor: number;
      total: number;
    };
    networkLatency: {
      average: number;
      slowest: number;
      fastest: number;
    };
  };
  thresholds: {
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
    networkLatency: number;
  };
  violations: Array<{
    test: string;
    metric: string;
    actual: number;
    threshold: number;
    severity: 'warning' | 'error';
  }>;
}

export class PerformanceReporter {
  private reports: PerformanceReport[] = [];
  private currentReport: Partial<PerformanceReport> | null = null;

  /**
   * Start a new performance report
   */
  startReport(testSuite: string): void {
    this.currentReport = {
      testSuite,
      timestamp: Date.now(),
      metrics: {
        renderTime: { average: 0, min: 0, max: 0, p95: 0 },
        memoryUsage: { peak: 0, average: 0, leaks: 0 },
        bundleSize: { main: 0, vendor: 0, total: 0 },
        networkLatency: { average: 0, slowest: 0, fastest: 0 },
      },
      thresholds: {
        renderTime: 100,
        memoryUsage: 50 * 1024 * 1024, // 50MB
        bundleSize: 2 * 1024 * 1024, // 2MB
        networkLatency: 1000, // 1s
      },
      violations: [],
    };
  }

  /**
   * Add performance data to current report
   */
  addMetric(
    testName: string,
    metricType: keyof PerformanceReport['metrics'],
    value: number
  ): void {
    if (!this.currentReport) {
      throw new Error('No active report. Call startReport() first.');
    }

    const threshold = this.currentReport.thresholds![metricType];
    
    if (value > threshold) {
      this.currentReport.violations!.push({
        test: testName,
        metric: metricType,
        actual: value,
        threshold,
        severity: value > threshold * 1.5 ? 'error' : 'warning',
      });
    }

    // Update metrics based on type
    this.updateMetrics(metricType, value);
  }

  /**
   * Update metrics in current report
   */
  private updateMetrics(
    metricType: keyof PerformanceReport['metrics'],
    value: number
  ): void {
    if (!this.currentReport?.metrics) return;

    switch (metricType) {
      case 'renderTime':
        this.updateRenderTimeMetrics(value);
        break;
      case 'memoryUsage':
        this.updateMemoryMetrics(value);
        break;
      case 'bundleSize':
        this.updateBundleSizeMetrics(value);
        break;
      case 'networkLatency':
        this.updateNetworkLatencyMetrics(value);
        break;
    }
  }

  private updateRenderTimeMetrics(value: number): void {
    const metrics = this.currentReport!.metrics!.renderTime;
    metrics.min = metrics.min === 0 ? value : Math.min(metrics.min, value);
    metrics.max = Math.max(metrics.max, value);
    metrics.average = (metrics.average + value) / 2;
  }

  private updateMemoryMetrics(value: number): void {
    const metrics = this.currentReport!.metrics!.memoryUsage;
    metrics.peak = Math.max(metrics.peak, value);
    metrics.average = (metrics.average + value) / 2;
    if (value > this.currentReport!.thresholds!.memoryUsage) {
      metrics.leaks++;
    }
  }

  private updateBundleSizeMetrics(value: number): void {
    const metrics = this.currentReport!.metrics!.bundleSize;
    metrics.total = Math.max(metrics.total, value);
  }

  private updateNetworkLatencyMetrics(value: number): void {
    const metrics = this.currentReport!.metrics!.networkLatency;
    metrics.fastest = metrics.fastest === 0 ? value : Math.min(metrics.fastest, value);
    metrics.slowest = Math.max(metrics.slowest, value);
    metrics.average = (metrics.average + value) / 2;
  }

  /**
   * Finish current report and add to reports list
   */
  finishReport(): PerformanceReport | null {
    if (!this.currentReport) {
      return null;
    }

    const report = this.currentReport as PerformanceReport;
    this.reports.push(report);
    this.currentReport = null;

    return report;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(): string {
    const latestReport = this.reports[this.reports.length - 1];
    if (!latestReport) {
      return '<p>No performance reports available.</p>';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Report - ${latestReport.testSuite}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
          .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .metric-title { font-weight: bold; color: #333; margin-bottom: 10px; }
          .metric-value { font-size: 1.2em; color: #007bff; }
          .violations { margin-top: 20px; }
          .violation { padding: 10px; margin: 5px 0; border-radius: 3px; }
          .violation.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
          .violation.error { background: #f8d7da; border-left: 4px solid #dc3545; }
          .chart { width: 100%; height: 200px; background: #f9f9f9; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Performance Report: ${latestReport.testSuite}</h1>
          <p>Generated: ${new Date(latestReport.timestamp).toLocaleString()}</p>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-title">Render Time</div>
            <div class="metric-value">Avg: ${latestReport.metrics.renderTime.average.toFixed(2)}ms</div>
            <div>Min: ${latestReport.metrics.renderTime.min.toFixed(2)}ms</div>
            <div>Max: ${latestReport.metrics.renderTime.max.toFixed(2)}ms</div>
            <div>Threshold: ${latestReport.thresholds.renderTime}ms</div>
          </div>

          <div class="metric-card">
            <div class="metric-title">Memory Usage</div>
            <div class="metric-value">Peak: ${(latestReport.metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB</div>
            <div>Average: ${(latestReport.metrics.memoryUsage.average / 1024 / 1024).toFixed(2)}MB</div>
            <div>Leaks: ${latestReport.metrics.memoryUsage.leaks}</div>
            <div>Threshold: ${(latestReport.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
          </div>

          <div class="metric-card">
            <div class="metric-title">Bundle Size</div>
            <div class="metric-value">Total: ${(latestReport.metrics.bundleSize.total / 1024).toFixed(2)}KB</div>
            <div>Main: ${(latestReport.metrics.bundleSize.main / 1024).toFixed(2)}KB</div>
            <div>Vendor: ${(latestReport.metrics.bundleSize.vendor / 1024).toFixed(2)}KB</div>
            <div>Threshold: ${(latestReport.thresholds.bundleSize / 1024).toFixed(2)}KB</div>
          </div>

          <div class="metric-card">
            <div class="metric-title">Network Latency</div>
            <div class="metric-value">Avg: ${latestReport.metrics.networkLatency.average.toFixed(2)}ms</div>
            <div>Fastest: ${latestReport.metrics.networkLatency.fastest.toFixed(2)}ms</div>
            <div>Slowest: ${latestReport.metrics.networkLatency.slowest.toFixed(2)}ms</div>
            <div>Threshold: ${latestReport.thresholds.networkLatency}ms</div>
          </div>
        </div>

        ${latestReport.violations.length > 0 ? `
          <div class="violations">
            <h2>Performance Violations</h2>
            ${latestReport.violations.map(violation => `
              <div class="violation ${violation.severity}">
                <strong>${violation.test}</strong> - ${violation.metric}: 
                ${violation.actual.toFixed(2)} exceeds threshold of ${violation.threshold.toFixed(2)}
                (${violation.severity.toUpperCase()})
              </div>
            `).join('')}
          </div>
        ` : '<div class="violations"><h2>✅ No Performance Violations</h2></div>'}

        <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 5px;">
          <h3>Performance Recommendations</h3>
          ${this.generateRecommendations(latestReport)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(report: PerformanceReport): string {
    const recommendations: string[] = [];

    if (report.metrics.renderTime.average > report.thresholds.renderTime) {
      recommendations.push('• Consider optimizing component rendering with React.memo() or useMemo()');
      recommendations.push('• Implement virtualization for large lists');
      recommendations.push('• Use lazy loading for heavy components');
    }

    if (report.metrics.memoryUsage.leaks > 0) {
      recommendations.push('• Check for memory leaks in useEffect cleanup functions');
      recommendations.push('• Ensure proper cleanup of event listeners and timers');
      recommendations.push('• Consider using WeakMap/WeakSet for temporary references');
    }

    if (report.metrics.bundleSize.total > report.thresholds.bundleSize) {
      recommendations.push('• Implement code splitting to reduce bundle size');
      recommendations.push('• Use dynamic imports for non-critical features');
      recommendations.push('• Optimize images and assets');
    }

    if (report.metrics.networkLatency.average > report.thresholds.networkLatency) {
      recommendations.push('• Implement request caching and batching');
      recommendations.push('• Use compression for API responses');
      recommendations.push('• Consider using a CDN for static assets');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Great job! All performance metrics are within acceptable thresholds.');
    }

    return recommendations.map(rec => `<p>${rec}</p>`).join('');
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(): string {
    return JSON.stringify(this.reports, null, 2);
  }

  /**
   * Generate console report
   */
  generateConsoleReport(): void {
    const latestReport = this.reports[this.reports.length - 1];
    if (!latestReport) {
      console.log('No performance reports available.');
      return;
    }

    console.log('\n📊 Performance Report');
    console.log('='.repeat(50));
    console.log(`Test Suite: ${latestReport.testSuite}`);
    console.log(`Generated: ${new Date(latestReport.timestamp).toLocaleString()}`);
    
    console.log('\n📈 Metrics:');
    console.log(`  Render Time: avg=${latestReport.metrics.renderTime.average.toFixed(2)}ms, max=${latestReport.metrics.renderTime.max.toFixed(2)}ms`);
    console.log(`  Memory Usage: peak=${(latestReport.metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB, leaks=${latestReport.metrics.memoryUsage.leaks}`);
    console.log(`  Bundle Size: ${(latestReport.metrics.bundleSize.total / 1024).toFixed(2)}KB`);
    console.log(`  Network Latency: avg=${latestReport.metrics.networkLatency.average.toFixed(2)}ms`);

    if (latestReport.violations.length > 0) {
      console.log('\n⚠️ Violations:');
      latestReport.violations.forEach(violation => {
        const icon = violation.severity === 'error' ? '🔴' : '🟡';
        console.log(`  ${icon} ${violation.test}: ${violation.metric} = ${violation.actual.toFixed(2)} (threshold: ${violation.threshold.toFixed(2)})`);
      });
    } else {
      console.log('\n✅ No performance violations detected!');
    }
  }

  /**
   * Export report to file
   */
  exportReport(format: 'html' | 'json' = 'html'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${timestamp}.${format}`;
    
    const content = format === 'html' 
      ? this.generateHTMLReport()
      : this.generateJSONReport();
    
    // In a real implementation, you would write to file system
    // For testing, we'll just return the content
    return content;
  }

  /**
   * Compare reports over time
   */
  compareReports(reportA: PerformanceReport, reportB: PerformanceReport): {
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
    networkLatency: number;
  } {
    return {
      renderTime: ((reportB.metrics.renderTime.average - reportA.metrics.renderTime.average) / reportA.metrics.renderTime.average) * 100,
      memoryUsage: ((reportB.metrics.memoryUsage.average - reportA.metrics.memoryUsage.average) / reportA.metrics.memoryUsage.average) * 100,
      bundleSize: ((reportB.metrics.bundleSize.total - reportA.metrics.bundleSize.total) / reportA.metrics.bundleSize.total) * 100,
      networkLatency: ((reportB.metrics.networkLatency.average - reportA.metrics.networkLatency.average) / reportA.metrics.networkLatency.average) * 100,
    };
  }

  /**
   * Get all reports
   */
  getAllReports(): PerformanceReport[] {
    return [...this.reports];
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports = [];
    this.currentReport = null;
  }
}

/**
 * Global performance reporter instance
 */
export const performanceReporter = new PerformanceReporter();

/**
 * Performance monitoring decorator for Jest tests
 */
export const withPerformanceMonitoring = (testSuite: string) => {
  return {
    beforeAll: () => {
      performanceReporter.startReport(testSuite);
    },
    afterAll: () => {
      const report = performanceReporter.finishReport();
      if (report) {
        performanceReporter.generateConsoleReport();
      }
    },
    addMetric: (testName: string, metricType: keyof PerformanceReport['metrics'], value: number) => {
      performanceReporter.addMetric(testName, metricType, value);
    },
  };
};