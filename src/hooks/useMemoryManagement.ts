import { useEffect, useRef, useCallback, useState } from 'react';

// Type definitions for cleanup functions
type CleanupFunction = () => void;
type SubscriptionFunction = () => CleanupFunction;

/**
 * Hook for managing subscriptions and preventing memory leaks
 */
export const useSubscriptions = () => {
  const subscriptionsRef = useRef<CleanupFunction[]>([]);

  const addSubscription = useCallback((subscription: SubscriptionFunction) => {
    const cleanup = subscription();
    subscriptionsRef.current.push(cleanup);
    return cleanup;
  }, []);

  const removeSubscription = useCallback((cleanup: CleanupFunction) => {
    const index = subscriptionsRef.current.indexOf(cleanup);
    if (index > -1) {
      subscriptionsRef.current.splice(index, 1);
      cleanup();
    }
  }, []);

  const clearAllSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(cleanup => cleanup());
    subscriptionsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllSubscriptions();
    };
  }, [clearAllSubscriptions]);

  return {
    addSubscription,
    removeSubscription,
    clearAllSubscriptions,
  };
};

/**
 * Hook for managing timers and intervals
 */
export const useTimers = () => {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = global.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    
    timersRef.current.add(timer);
    return timer;
  }, []);

  const setInterval = useCallback((callback: () => void, delay: number) => {
    const timer = global.setInterval(callback, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    if (timersRef.current.has(timer)) {
      global.clearTimeout(timer);
      global.clearInterval(timer);
      timersRef.current.delete(timer);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => {
      global.clearTimeout(timer);
      global.clearInterval(timer);
    });
    timersRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers,
  };
};

/**
 * Hook for managing event listeners
 */
export const useEventListeners = () => {
  const listenersRef = useRef<Array<{
    target: EventTarget;
    event: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>>([]);

  const addEventListener = useCallback((
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    target.addEventListener(event, listener, options);
    listenersRef.current.push({ target, event, listener, options });
    
    return () => {
      target.removeEventListener(event, listener, options);
      const index = listenersRef.current.findIndex(
        item => item.target === target && item.event === event && item.listener === listener
      );
      if (index > -1) {
        listenersRef.current.splice(index, 1);
      }
    };
  }, []);

  const removeEventListener = useCallback((
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    target.removeEventListener(event, listener, options);
    const index = listenersRef.current.findIndex(
      item => item.target === target && item.event === event && item.listener === listener
    );
    if (index > -1) {
      listenersRef.current.splice(index, 1);
    }
  }, []);

  const clearAllEventListeners = useCallback(() => {
    listenersRef.current.forEach(({ target, event, listener, options }) => {
      target.removeEventListener(event, listener, options);
    });
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllEventListeners();
    };
  }, [clearAllEventListeners]);

  return {
    addEventListener,
    removeEventListener,
    clearAllEventListeners,
  };
};

/**
 * Hook for managing async operations and preventing state updates on unmounted components
 */
export const useAsyncOperation = () => {
  const isMountedRef = useRef(true);
  const pendingOperationsRef = useRef<Set<Promise<any>>>(new Set());

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel all pending operations
      pendingOperationsRef.current.clear();
    };
  }, []);

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void
  ): Promise<T | null> => {
    const promise = operation();
    pendingOperationsRef.current.add(promise);

    try {
      const result = await promise;
      
      if (isMountedRef.current) {
        onSuccess?.(result);
        return result;
      }
      
      return null;
    } catch (error) {
      if (isMountedRef.current) {
        onError?.(error);
      }
      throw error;
    } finally {
      pendingOperationsRef.current.delete(promise);
    }
  }, []);

  const isMounted = useCallback(() => isMountedRef.current, []);

  return {
    executeAsync,
    isMounted,
  };
};

/**
 * Hook for debouncing values to prevent excessive re-renders
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const { setTimeout, clearAllTimers } = useTimers();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearAllTimers();
    };
  }, [value, delay, setTimeout, clearAllTimers]);

  return debouncedValue;
};

/**
 * Hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  const { setTimeout } = useTimers();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return callback(...args);
    } else {
      setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - (now - lastCallRef.current));
    }
  }, [callback, delay, setTimeout]) as T;
};

/**
 * Hook for managing component lifecycle and cleanup
 */
export const useLifecycle = (
  onMount?: () => void | CleanupFunction,
  onUnmount?: () => void
) => {
  const cleanupRef = useRef<CleanupFunction | null>(null);

  useEffect(() => {
    if (onMount) {
      const cleanup = onMount();
      if (typeof cleanup === 'function') {
        cleanupRef.current = cleanup;
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      onUnmount?.();
    };
  }, [onMount, onUnmount]);
};

// Extend global types for memory API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
  
  var gc: (() => void) | undefined;
}

// Type definitions for memory management
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

/**
 * Hook for monitoring memory usage and managing memory pressure
 */
export const useMemoryManagement = (options?: UseMemoryManagementOptions): UseMemoryManagementReturn => {
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage>({
    used: 0,
    total: 0,
    percentage: 0,
  });
  
  const [isMemoryPressure, setIsMemoryPressure] = useState(false);
  const { setInterval, clearAllTimers } = useTimers();
  
  const threshold = options?.threshold ?? 80;
  const onMemoryPressure = options?.onMemoryPressure;
  const monitoringInterval = options?.monitoringInterval;

  const checkMemoryUsage = useCallback(() => {
    if (global.performance?.memory) {
      const used = global.performance.memory.usedJSHeapSize;
      const total = global.performance.memory.totalJSHeapSize;
      
      // Handle edge cases
      if (total <= 0) {
        setMemoryUsage({ used: 0, total: 0, percentage: 0 });
        setIsMemoryPressure(false);
        return;
      }
      
      // Ensure non-negative values
      const safeUsed = Math.max(0, used);
      const safeTotal = Math.max(0, total);
      const percentage = Math.round((safeUsed / safeTotal) * 100);
      
      setMemoryUsage({
        used: safeUsed,
        total: safeTotal,
        percentage,
      });
      
      const pressureDetected = percentage > threshold;
      setIsMemoryPressure(pressureDetected);
      
      if (pressureDetected && onMemoryPressure) {
        onMemoryPressure();
      }
    }
  }, [threshold, onMemoryPressure]);

  const forceGarbageCollection = useCallback(() => {
    if (global.gc) {
      global.gc();
    }
  }, []);

  useEffect(() => {
    if (monitoringInterval) {
      setInterval(checkMemoryUsage, monitoringInterval);
    }

    return () => {
      clearAllTimers();
    };
  }, [checkMemoryUsage, monitoringInterval, setInterval, clearAllTimers]);

  return {
    memoryUsage,
    isMemoryPressure,
    checkMemoryUsage,
    forceGarbageCollection,
  };
};