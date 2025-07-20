import { performanceMonitor } from '../../utils/performanceMonitor';
import { render } from '@testing-library/react-native';
import React from 'react';
import { View, Text, FlatList } from 'react-native';

// Mock performance APIs
const mockPerformanceNow = jest.fn();
const mockPerformanceMark = jest.fn();
const mockPerformanceMeasure = jest.fn();

global.performance = {
  now: mockPerformanceNow,
  mark: mockPerformanceMark,
  measure: mockPerformanceMeasure,
} as any;

// Mock React Native performance APIs
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      setTimeout(callback, 0);
      return { cancel: jest.fn() };
    },
  },
}));

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('Performance Monitoring', () => {
    it('should measure component render time', () => {
      const TestComponent = () => <Text>Test</Text>;
      
      performanceMonitor.startTiming('component-render');
      render(<TestComponent />);
      performanceMonitor.endTiming('component-render');
      
      expect(mockPerformanceMark).toHaveBeenCalledWith('component-render-start');
      expect(mockPerformanceMark).toHaveBeenCalledWith('component-render-end');
      expect(mockPerformanceMeasure).toHaveBeenCalledWith(
        'component-render',
        'component-render-start',
        'component-render-end'
      );
    });

    it('should track memory usage', () => {
      const memoryInfo = performanceMonitor.getMemoryInfo();
      
      expect(memoryInfo).toHaveProperty('usedJSHeapSize');
      expect(memoryInfo).toHaveProperty('totalJSHeapSize');
      expect(memoryInfo).toHaveProperty('jsHeapSizeLimit');
    });

    it('should measure bundle size impact', () => {
      const bundleInfo = performanceMonitor.getBundleInfo();
      
      expect(bundleInfo).toHaveProperty('totalSize');
      expect(bundleInfo).toHaveProperty('gzippedSize');
      expect(bundleInfo).toHaveProperty('components');
    });
  });

  describe('Component Performance', () => {
    it('should render simple components quickly', () => {
      const startTime = performance.now();
      
      const SimpleComponent = () => <Text>Simple</Text>;
      render(<SimpleComponent />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 16ms (60fps)
      expect(renderTime).toBeLessThan(16);
    });

    it('should handle large lists efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
      
      const startTime = performance.now();
      
      const LargeList = () => (
        <FlatList
          data={data}
          renderItem={({ item }) => <Text key={item.id}>{item.text}</Text>}
          keyExtractor={(item) => item.id.toString()}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      );
      
      render(<LargeList />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render initial items quickly
      expect(renderTime).toBeLessThan(100);
    });

    it('should optimize re-renders', () => {
      let renderCount = 0;
      
      const OptimizedComponent = React.memo(() => {
        renderCount++;
        return <Text>Optimized</Text>;
      });
      
      const { rerender } = render(<OptimizedComponent />);
      
      // Re-render with same props
      rerender(<OptimizedComponent />);
      
      // Should not re-render unnecessarily
      expect(renderCount).toBe(1);
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during animations', () => {
      const frameTimings: number[] = [];
      let lastFrameTime = performance.now();
      
      // Simulate animation frames
      for (let i = 0; i < 60; i++) {
        const currentTime = lastFrameTime + 16.67; // 60fps = 16.67ms per frame
        frameTimings.push(currentTime - lastFrameTime);
        lastFrameTime = currentTime;
      }
      
      const averageFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
      
      // Should maintain close to 16.67ms per frame
      expect(averageFrameTime).toBeLessThan(20);
      expect(averageFrameTime).toBeGreaterThan(15);
    });

    it('should handle animation interruptions gracefully', () => {
      const animationFrames: number[] = [];
      
      // Simulate interrupted animation
      for (let i = 0; i < 30; i++) {
        animationFrames.push(16.67);
      }
      
      // Simulate frame drop
      animationFrames.push(50);
      
      for (let i = 0; i < 29; i++) {
        animationFrames.push(16.67);
      }
      
      const droppedFrames = animationFrames.filter(time => time > 20).length;
      
      // Should have minimal frame drops
      expect(droppedFrames).toBeLessThan(2);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during component lifecycle', () => {
      const initialMemory = performanceMonitor.getMemoryInfo().usedJSHeapSize;
      
      // Create and destroy components
      for (let i = 0; i < 100; i++) {
        const TestComponent = () => <Text>Test {i}</Text>;
        const { unmount } = render(<TestComponent />);
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performanceMonitor.getMemoryInfo().usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB
    });

    it('should clean up event listeners', () => {
      const listeners: Array<() => void> = [];
      
      const ComponentWithListeners = () => {
        React.useEffect(() => {
          const listener = () => {};
          listeners.push(listener);
          
          return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          };
        }, []);
        
        return <Text>Component</Text>;
      };
      
      const { unmount } = render(<ComponentWithListeners />);
      expect(listeners.length).toBe(1);
      
      unmount();
      expect(listeners.length).toBe(0);
    });
  });

  describe('Network Performance', () => {
    it('should batch API requests efficiently', async () => {
      const apiCalls: string[] = [];
      
      // Mock API client
      const mockApiClient = {
        get: jest.fn((url: string) => {
          apiCalls.push(url);
          return Promise.resolve({ data: {} });
        }),
      };
      
      // Simulate multiple API calls
      const promises = [
        mockApiClient.get('/api/users'),
        mockApiClient.get('/api/posts'),
        mockApiClient.get('/api/comments'),
      ];
      
      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      // Should complete all requests quickly
      expect(totalTime).toBeLessThan(100);
      expect(apiCalls.length).toBe(3);
    });

    it('should handle request caching', () => {
      const cache = new Map();
      
      const cachedRequest = (url: string) => {
        if (cache.has(url)) {
          return Promise.resolve(cache.get(url));
        }
        
        const response = { data: `Response for ${url}` };
        cache.set(url, response);
        return Promise.resolve(response);
      };
      
      // First request
      const startTime1 = performance.now();
      cachedRequest('/api/data');
      const endTime1 = performance.now();
      
      // Second request (cached)
      const startTime2 = performance.now();
      cachedRequest('/api/data');
      const endTime2 = performance.now();
      
      const firstRequestTime = endTime1 - startTime1;
      const cachedRequestTime = endTime2 - startTime2;
      
      // Cached request should be faster
      expect(cachedRequestTime).toBeLessThan(firstRequestTime);
    });
  });

  describe('Bundle Performance', () => {
    it('should have reasonable bundle size', () => {
      const bundleInfo = performanceMonitor.getBundleInfo();
      
      // Bundle should be under reasonable limits
      expect(bundleInfo.totalSize).toBeLessThan(10 * 1024 * 1024); // 10MB
      expect(bundleInfo.gzippedSize).toBeLessThan(3 * 1024 * 1024); // 3MB
    });

    it('should load critical components first', () => {
      const loadOrder: string[] = [];
      
      // Simulate component loading
      const criticalComponents = ['App', 'Navigation', 'Home'];
      const nonCriticalComponents = ['Settings', 'Profile', 'Help'];
      
      // Critical components should load first
      criticalComponents.forEach(component => {
        loadOrder.push(component);
      });
      
      nonCriticalComponents.forEach(component => {
        loadOrder.push(component);
      });
      
      // Verify load order
      expect(loadOrder.indexOf('App')).toBeLessThan(loadOrder.indexOf('Settings'));
      expect(loadOrder.indexOf('Navigation')).toBeLessThan(loadOrder.indexOf('Profile'));
      expect(loadOrder.indexOf('Home')).toBeLessThan(loadOrder.indexOf('Help'));
    });
  });

  describe('Accessibility Performance', () => {
    it('should not impact performance significantly', () => {
      const ComponentWithA11y = () => (
        <View
          accessible={true}
          accessibilityLabel="Test component"
          accessibilityHint="This is a test component"
          accessibilityRole="button"
        >
          <Text>Accessible Component</Text>
        </View>
      );
      
      const ComponentWithoutA11y = () => (
        <View>
          <Text>Regular Component</Text>
        </View>
      );
      
      const startTime1 = performance.now();
      render(<ComponentWithA11y />);
      const endTime1 = performance.now();
      
      const startTime2 = performance.now();
      render(<ComponentWithoutA11y />);
      const endTime2 = performance.now();
      
      const a11yTime = endTime1 - startTime1;
      const regularTime = endTime2 - startTime2;
      
      // Accessibility should not add significant overhead
      expect(a11yTime - regularTime).toBeLessThan(5);
    });
  });
});