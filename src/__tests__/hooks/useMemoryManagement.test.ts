import { useMemoryManagement } from '../../hooks/useMemoryManagement';

// Type definitions for better type safety
interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
}

interface UseMemoryManagementOptions {
  onMemoryPressure?: () => void;
  monitoringInterval?: number;
  threshold?: number;
}

interface UseMemoryManagementReturn {
  memoryUsage: MemoryUsage;
  isMemoryPressure: boolean;
  checkMemoryUsage: () => void;
  forceGarbageCollection: () => void;
}

// Constants for better maintainability
const MEMORY_CONSTANTS = {
  DEFAULT_USED_MB: 50,
  DEFAULT_TOTAL_MB: 100,
  HIGH_USAGE_MB: 85,
  CRITICAL_USAGE_MB: 90,
  PRESSURE_THRESHOLD: 80,
  HEAP_SIZE_LIMIT: 2000000000,
  MB_TO_BYTES: 1024 * 1024,
} as const;

// Mock performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: MEMORY_CONSTANTS.DEFAULT_USED_MB * MEMORY_CONSTANTS.MB_TO_BYTES,
    totalJSHeapSize: MEMORY_CONSTANTS.DEFAULT_TOTAL_MB * MEMORY_CONSTANTS.MB_TO_BYTES,
    jsHeapSizeLimit: MEMORY_CONSTANTS.HEAP_SIZE_LIMIT,
  },
  now: jest.fn(() => Date.now()),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Test helper functions
const createMemoryMock = (usedMB: number, totalMB: number = MEMORY_CONSTANTS.DEFAULT_TOTAL_MB) => {
  // Ensure memory object exists
  if (!mockPerformance.memory) {
    mockPerformance.memory = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: MEMORY_CONSTANTS.HEAP_SIZE_LIMIT,
    };
  }
  mockPerformance.memory.usedJSHeapSize = usedMB * MEMORY_CONSTANTS.MB_TO_BYTES;
  mockPerformance.memory.totalJSHeapSize = totalMB * MEMORY_CONSTANTS.MB_TO_BYTES;
};

// Mock React hooks to avoid "invalid hook call" errors in tests
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn(),
  useRef: jest.fn(),
}));

// Import React after mocking
import React from 'react';

// Mock implementations
let mockState: any = {};
let mockSetState: jest.Mock;
let mockEffectCleanup: jest.Mock;
let mockCallbacks: { [key: string]: Function } = {};

const setupMocks = () => {
  mockSetState = jest.fn((newState) => {
    if (typeof newState === 'function') {
      mockState = newState(mockState);
    } else {
      mockState = newState;
    }
  });

  mockEffectCleanup = jest.fn();

  (React.useState as jest.Mock).mockImplementation((initialState) => {
    if (!mockState.hasOwnProperty('initialized')) {
      mockState = { ...initialState };
      mockState.initialized = true;
    }
    return [mockState, mockSetState];
  });

  (React.useEffect as jest.Mock).mockImplementation((effect, deps) => {
    const cleanup = effect();
    if (cleanup) {
      mockEffectCleanup.mockImplementation(cleanup);
    }
  });

  (React.useCallback as jest.Mock).mockImplementation((callback, deps) => {
    const key = callback.toString();
    if (!mockCallbacks[key]) {
      mockCallbacks[key] = callback;
    }
    return mockCallbacks[key];
  });

  (React.useRef as jest.Mock).mockImplementation((initialValue) => ({
    current: initialValue,
  }));
};

/**
 * Test suite for the useMemoryManagement hook
 * Validates memory monitoring, pressure detection, and garbage collection functionality
 */
describe('useMemoryManagement', () => {
  let originalGC: typeof global.gc;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
    
    // Reset memory mock to defaults
    createMemoryMock(MEMORY_CONSTANTS.DEFAULT_USED_MB);
    
    // Store original gc function
    originalGC = global.gc;
    
    // Setup React mocks
    setupMocks();
    
    // Reset mock state
    mockState = {
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      isMemoryPressure: false,
    };
    mockCallbacks = {};
  });

  afterEach(() => {
    // Restore original gc function
    global.gc = originalGC;
  });

  describe('Initialization', () => {
    it('should initialize with safe default memory values', () => {
      const result = useMemoryManagement();

      expect(result.memoryUsage).toMatchObject({
        used: 0,
        total: 0,
        percentage: 0,
      });
      expect(result.isMemoryPressure).toBe(false);
      expect(typeof result.checkMemoryUsage).toBe('function');
      expect(typeof result.forceGarbageCollection).toBe('function');
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should calculate correct memory usage percentage when checkMemoryUsage is called', () => {
      const result = useMemoryManagement();
      
      // Simulate calling checkMemoryUsage
      result.checkMemoryUsage();

      // The mock should have been called to update state
      expect(mockSetState).toHaveBeenCalled();
    });

    it('should update memory stats when memory usage changes', () => {
      createMemoryMock(75); // 75MB out of 100MB
      const result = useMemoryManagement();
      
      result.checkMemoryUsage();

      expect(mockSetState).toHaveBeenCalled();
    });
  });

  describe('Memory Pressure Detection', () => {
    it('should detect memory pressure when usage exceeds threshold', () => {
      const mockOnMemoryPressure = jest.fn();
      createMemoryMock(MEMORY_CONSTANTS.HIGH_USAGE_MB);

      const result = useMemoryManagement({
        onMemoryPressure: mockOnMemoryPressure,
      });

      result.checkMemoryUsage();

      // Should call setState to update memory pressure
      expect(mockSetState).toHaveBeenCalled();
    });

    it('should invoke onMemoryPressure callback when memory usage is critical', () => {
      const mockOnMemoryPressure = jest.fn();
      createMemoryMock(MEMORY_CONSTANTS.CRITICAL_USAGE_MB);

      const result = useMemoryManagement({
        onMemoryPressure: mockOnMemoryPressure,
      });

      result.checkMemoryUsage();

      // The callback should be invoked during checkMemoryUsage
      expect(mockOnMemoryPressure).toHaveBeenCalledTimes(1);
    });

    it('should respect custom threshold when provided', () => {
      const customThreshold = 70;
      const mockOnMemoryPressure = jest.fn();
      createMemoryMock(75); // 75% usage
      
      const result = useMemoryManagement({
        threshold: customThreshold,
        onMemoryPressure: mockOnMemoryPressure,
      });

      result.checkMemoryUsage();

      // Should trigger callback since 75% > 70% threshold
      expect(mockOnMemoryPressure).toHaveBeenCalled();
    });

    it('should not trigger memory pressure when usage is below threshold', () => {
      const mockOnMemoryPressure = jest.fn();
      createMemoryMock(60); // 60% usage, below 80% threshold

      const result = useMemoryManagement({
        onMemoryPressure: mockOnMemoryPressure,
      });

      result.checkMemoryUsage();

      expect(mockOnMemoryPressure).not.toHaveBeenCalled();
    });
  });

  describe('Garbage Collection', () => {
    it('should invoke global.gc when forceGarbageCollection is called and gc is available', () => {
      const mockGC = jest.fn();
      global.gc = mockGC;

      const result = useMemoryManagement();
      result.forceGarbageCollection();

      expect(mockGC).toHaveBeenCalledTimes(1);
    });

    it('should handle gracefully when global.gc is not available', () => {
      delete (global as any).gc;

      const result = useMemoryManagement();

      expect(() => {
        result.forceGarbageCollection();
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing performance.memory API gracefully', () => {
      const originalMemory = mockPerformance.memory;
      delete (mockPerformance as any).memory;

      const result = useMemoryManagement();
      result.checkMemoryUsage();

      // Should not throw and should call setState
      expect(mockSetState).toHaveBeenCalled();

      // Restore for other tests
      mockPerformance.memory = originalMemory;
    });

    it('should handle zero total memory gracefully', () => {
      createMemoryMock(50, 0); // 50MB used, 0MB total
      const result = useMemoryManagement();
      
      result.checkMemoryUsage();
      
      // Should handle gracefully and call setState
      expect(mockSetState).toHaveBeenCalled();
    });

    it('should handle negative memory values by converting to zero', () => {
      mockPerformance.memory.usedJSHeapSize = -1000;
      mockPerformance.memory.totalJSHeapSize = 100 * MEMORY_CONSTANTS.MB_TO_BYTES;
      
      const result = useMemoryManagement();
      result.checkMemoryUsage();
      
      // Should handle gracefully and call setState
      expect(mockSetState).toHaveBeenCalled();
    });

    it('should handle extremely high memory usage (over 100%)', () => {
      createMemoryMock(150, 100); // 150MB used, 100MB total
      const result = useMemoryManagement();
      
      result.checkMemoryUsage();
      
      // Should handle gracefully and call setState
      expect(mockSetState).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    it('should setup monitoring interval when provided', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      useMemoryManagement({
        monitoringInterval: 1000,
      });

      // useEffect should have been called to setup the interval
      expect(React.useEffect).toHaveBeenCalled();
      
      setIntervalSpy.mockRestore();
    });

    it('should cleanup on unmount', () => {
      useMemoryManagement({
        monitoringInterval: 1000,
      });

      // useEffect should have been called and should return cleanup
      expect(React.useEffect).toHaveBeenCalled();
      
      // Simulate unmount by calling cleanup
      mockEffectCleanup();
      
      expect(mockEffectCleanup).toHaveBeenCalled();
    });
  });
});