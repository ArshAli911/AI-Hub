import { renderHook, act } from '@testing-library/react-native';
import { useMemoryManagement } from '../../hooks/useMemoryManagement';

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50000000, // 50MB
    totalJSHeapSize: 100000000, // 100MB
    jsHeapSizeLimit: 2000000000, // 2GB
  },
  now: jest.fn(() => Date.now()),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('useMemoryManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  it('should initialize with default memory stats', () => {
    const { result } = renderHook(() => useMemoryManagement());

    expect(result.current.memoryUsage).toEqual({
      used: 0,
      total: 0,
      percentage: 0,
    });
    expect(result.current.isMemoryPressure).toBe(false);
  });

  it('should update memory usage when checkMemoryUsage is called', () => {
    const { result } = renderHook(() => useMemoryManagement());

    act(() => {
      result.current.checkMemoryUsage();
    });

    expect(result.current.memoryUsage.used).toBe(50000000);
    expect(result.current.memoryUsage.total).toBe(100000000);
    expect(result.current.memoryUsage.percentage).toBe(50);
  });

  it('should detect memory pressure when usage exceeds threshold', () => {
    // Mock high memory usage
    mockPerformance.memory.usedJSHeapSize = 85000000; // 85MB out of 100MB

    const { result } = renderHook(() => useMemoryManagement());

    act(() => {
      result.current.checkMemoryUsage();
    });

    expect(result.current.isMemoryPressure).toBe(true);
  });

  it('should clear cache when memory pressure is detected', () => {
    const mockClearCache = jest.fn();
    
    // Mock high memory usage
    mockPerformance.memory.usedJSHeapSize = 90000000;

    const { result } = renderHook(() => useMemoryManagement({
      onMemoryPressure: mockClearCache,
    }));

    act(() => {
      result.current.checkMemoryUsage();
    });

    expect(mockClearCache).toHaveBeenCalled();
  });

  it('should force garbage collection when available', () => {
    const mockGC = jest.fn();
    global.gc = mockGC;

    const { result } = renderHook(() => useMemoryManagement());

    act(() => {
      result.current.forceGarbageCollection();
    });

    expect(mockGC).toHaveBeenCalled();
  });

  it('should handle missing performance.memory gracefully', () => {
    const originalMemory = mockPerformance.memory;
    delete (mockPerformance as any).memory;

    const { result } = renderHook(() => useMemoryManagement());

    act(() => {
      result.current.checkMemoryUsage();
    });

    expect(result.current.memoryUsage).toEqual({
      used: 0,
      total: 0,
      percentage: 0,
    });

    // Restore
    mockPerformance.memory = originalMemory;
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useMemoryManagement({
      monitoringInterval: 1000,
    }));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});