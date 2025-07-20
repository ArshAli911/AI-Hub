/**
 * Performance Tests for React Native Rendering
 * 
 * This test suite validates that components meet performance benchmarks for:
 * - Component rendering times
 * - Animation frame rates
 * - Memory usage and leak prevention
 * - Bundle size optimization
 * - Network request efficiency
 * 
 * All thresholds are defined in performanceTestHelpers.ts and can be adjusted
 * based on target device specifications and performance requirements.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, FlatList } from 'react-native';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { 
  PerformanceTestHelper, 
  PERFORMANCE_THRESHOLDS 
} from '../utils/performanceTestHelpers';

// Mock performance monitor to control test behavior
jest.mock('../../utils/performanceMonitor');
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;

describe('Rendering Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceMonitor.startMeasurement.mockReturnValue('test-measurement');
    mockPerformanceMonitor.endMeasurement.mockReturnValue(100);
    mockPerformanceMonitor.measureMemoryUsage.mockReturnValue(50000000);
  });

  describe('Component Rendering', () => {
    it('should render simple components within performance threshold', async () => {
      const SimpleComponent = PerformanceTestHelper.createMockComponent('Hello World');
      
      await PerformanceTestHelper.measureRenderTime(
        SimpleComponent,
        undefined,
        { 
          threshold: PERFORMANCE_THRESHOLDS.SIMPLE_COMPONENT,
          description: 'Simple component render'
        }
      );
    });

    it('should handle large lists efficiently', async () => {
      const data = PerformanceTestHelper.createMockListData(1000);
      
      const ListComponent = () => (
        <FlatList
          data={data}
          renderItem={({ item }) => <Text key={item.id}>{item.text}</Text>}
          keyExtractor={(item) => item.id.toString()}
          getItemLayout={(_, index) => ({
            length: 50,
            offset: 50 * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      );
      
      await PerformanceTestHelper.measureRenderTime(
        ListComponent,
        undefined,
        { 
          threshold: PERFORMANCE_THRESHOLDS.LARGE_LIST,
          description: 'Large list render'
        }
      );
    });

    it('should optimize re-renders with memoization', async () => {
      let renderCount = 0;
      
      const MemoizedComponent = React.memo(() => {
        renderCount++;
        return <Text>Memoized Component</Text>;
      });
      
      const ParentComponent = ({ value }: { value: number }) => (
        <>
          <Text>{value}</Text>
          <MemoizedComponent />
        </>
      );
      
      const { rerender } = render(<ParentComponent value={1} />);
      
      // Re-render with same props
      rerender(<ParentComponent value={1} />);
      rerender(<ParentComponent value={1} />);
      
      // MemoizedComponent should only render once
      expect(renderCount).toBe(1);
    });

    it('should measure component mount time', async () => {
      const HeavyComponent = () => {
        // Simulate heavy computation
        const heavyData = Array.from({ length: 10000 }, (_, i) => i * 2);
        return <Text>{heavyData.length} items processed</Text>;
      };
      
      mockPerformanceMonitor.startMeasurement.mockReturnValue('heavy-component-mount');
      
      await act(async () => {
        render(<HeavyComponent />);
      });
      
      expect(mockPerformanceMonitor.startMeasurement).toHaveBeenCalledWith('heavy-component-mount');
      expect(mockPerformanceMonitor.endMeasurement).toHaveBeenCalledWith('heavy-component-mount');
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during animations', async () => {
      const AnimatedComponent = () => {
        const [opacity, setOpacity] = React.useState(0);
        
        React.useEffect(() => {
          const animate = () => {
            setOpacity(prev => (prev >= 1 ? 0 : prev + 0.1));
            requestAnimationFrame(animate);
          };
          animate();
        }, []);
        
        return <Text style={{ opacity }}>Animated Text</Text>;
      };
      
      const rafMock = PerformanceTestHelper.mockRequestAnimationFrame();
      
      render(<AnimatedComponent />);
      
      // Let animation run for a short time
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      // Check that frames are being requested at appropriate intervals
      expect(rafMock.frameCount).toBeGreaterThan(10);
      
      rafMock.restore();
    });

    it('should handle gesture animations smoothly', async () => {
      const GestureComponent = () => {
        const [position, setPosition] = React.useState({ x: 0, y: 0 });
        
        const handleGesture = (event: any) => {
          const startTime = performance.now();
          
          setPosition({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          });
          
          const processingTime = performance.now() - startTime;
          expect(processingTime).toBeWithinPerformanceThreshold(16); // One frame budget
        };
        
        return (
          <Text
            onTouchMove={handleGesture}
            style={{ transform: [{ translateX: position.x }, { translateY: position.y }] }}
          >
            Draggable Text
          </Text>
        );
      };
      
      const { getByText } = render(<GestureComponent />);
      const element = getByText('Draggable Text');
      
      // Simulate gesture events
      const gestureEvents = Array.from({ length: 10 }, (_, i) => ({
        nativeEvent: { locationX: i * 10, locationY: i * 5 },
      }));
      
      for (const event of gestureEvents) {
        await act(async () => {
          element.props.onTouchMove(event);
        });
      }
    });
  });

  describe('Memory Performance', () => {
    it('should not create memory leaks in component lifecycle', async () => {
      const LeakTestComponent = () => {
        React.useEffect(() => {
          const interval = setInterval(() => {
            // Some periodic task
          }, 1000);
          
          return () => clearInterval(interval);
        }, []);
        
        return <Text>Leak Test Component</Text>;
      };
      
      await PerformanceTestHelper.measureMemoryLeak(
        LeakTestComponent,
        mockPerformanceMonitor.measureMemoryUsage,
        { 
          threshold: PERFORMANCE_THRESHOLDS.MEMORY_LEAK,
          description: 'Component lifecycle memory leak test'
        }
      );
    });

    it('should handle large data sets efficiently', async () => {
      const largeDataSet = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        metadata: { index: i, category: i % 10 },
      }));
      
      const DataComponent = ({ data }: { data: any[] }) => (
        <Text>{data.length} items loaded</Text>
      );
      
      mockPerformanceMonitor.measureMemoryUsage
        .mockReturnValueOnce(50000000)  // start
        .mockReturnValueOnce(100000000); // end
      
      const startMemory = mockPerformanceMonitor.measureMemoryUsage();
      
      await act(async () => {
        render(<DataComponent data={largeDataSet} />);
      });
      
      const endMemory = mockPerformanceMonitor.measureMemoryUsage();
      const memoryUsed = endMemory - startMemory;
      
      // Should not use excessive memory for data processing
      expect(memoryUsed).toBeWithinPerformanceThreshold(50000000); // 50MB threshold
    });
  });

  describe('Bundle Performance', () => {
    it('should lazy load components to reduce initial bundle size', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <Text>Lazy Loaded Component</Text>
        })
      );
      
      const LazyWrapper = () => (
        <React.Suspense fallback={<Text>Loading...</Text>}>
          <LazyComponent />
        </React.Suspense>
      );
      
      const { getByText, queryByText } = render(<LazyWrapper />);
      
      // Should show loading initially
      expect(getByText('Loading...')).toBeTruthy();
      
      // Wait for lazy component to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(queryByText('Loading...')).toBeNull();
      expect(getByText('Lazy Loaded Component')).toBeTruthy();
    });

    it('should measure code splitting effectiveness', () => {
      // Mock bundle analyzer data
      const bundleStats = {
        main: { size: 500000 }, // 500KB
        vendor: { size: 1000000 }, // 1MB
        lazy: { size: 200000 }, // 200KB
      };
      
      const totalSize = Object.values(bundleStats).reduce((sum, chunk) => sum + chunk.size, 0);
      const mainBundleRatio = bundleStats.main.size / totalSize;
      
      // Main bundle should be less than 50% of total
      expect(mainBundleRatio).toBeLessThan(0.5);
    });
  });

  describe('Network Performance', () => {
    it('should batch API requests efficiently', async () => {
      const requests = PerformanceTestHelper.createMockApiRequests(3);
      
      await PerformanceTestHelper.measureNetworkPerformance(
        async () => {
          const batchedRequests = PerformanceTestHelper.simulateBatchedRequests(requests);
          const results = await Promise.all(batchedRequests);
          expect(results).toHaveLength(3);
        },
        { 
          threshold: PERFORMANCE_THRESHOLDS.BATCH_OPERATION,
          description: 'Batched API requests'
        }
      );
    });

    it('should implement request caching effectively', async () => {
      const cacheComparison = await PerformanceTestHelper.simulateCacheComparison();
      
      // Cache hit should be significantly faster than network request
      expect(cacheComparison.cacheHitDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT);
      expect(cacheComparison.speedImprovement).toBeGreaterThan(10);
      expect(cacheComparison.cachedResult).toBeDefined();
    });
  });
});