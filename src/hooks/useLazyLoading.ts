import { useState, useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';

interface LazyLoadOptions {
  delay?: number;
  priority?: 'low' | 'normal' | 'high';
  preload?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

interface LazyLoadState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  loaded: boolean;
}

/**
 * Hook for lazy loading data with priority and retry logic
 */
export const useLazyLoad = <T>(
  loadFn: () => Promise<T>,
  options: LazyLoadOptions = {}
): LazyLoadState<T> & {
  load: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
} => {
  const {
    delay = 0,
    priority = 'normal',
    preload = false,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<LazyLoadState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false,
  });

  const loadFnRef = useRef(loadFn);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    loadFnRef.current = loadFn;
  }, [loadFn]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeLoad = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const loadWithDelay = async (): Promise<T> => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return loadFnRef.current();
      };

      let result: T;

      // Handle priority loading
      if (priority === 'low') {
        // Load after interactions complete
        await new Promise(resolve => InteractionManager.runAfterInteractions(resolve));
        result = await loadWithDelay();
      } else if (priority === 'high') {
        // Load immediately
        result = await loadWithDelay();
      } else {
        // Normal priority - load after a short delay
        await new Promise(resolve => setTimeout(resolve, 16)); // Next frame
        result = await loadWithDelay();
      }

      if (isMountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null,
          loaded: true,
        });
        retryCountRef.current = 0;
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      const err = error instanceof Error ? error : new Error(String(error));

      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        
        // Exponential backoff for retries
        const currentRetryDelay = retryDelay * Math.pow(2, retryCountRef.current - 1);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            executeLoad();
          }
        }, currentRetryDelay);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err,
        }));
      }
    }
  }, [delay, priority, retryCount, retryDelay]);

  const load = useCallback(async (): Promise<void> => {
    if (state.loading) return;
    await executeLoad();
  }, [executeLoad, state.loading]);

  const reload = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await executeLoad();
  }, [executeLoad]);

  const reset = useCallback((): void => {
    setState({
      data: null,
      loading: false,
      error: null,
      loaded: false,
    });
    retryCountRef.current = 0;
  }, []);

  // Auto-load if preload is enabled
  useEffect(() => {
    if (preload && !state.loaded && !state.loading) {
      load();
    }
  }, [preload, state.loaded, state.loading, load]);

  return {
    ...state,
    load,
    reload,
    reset,
  };
};

/**
 * Hook for lazy loading multiple items with batching
 */
export const useLazyLoadBatch = <T>(
  items: Array<() => Promise<T>>,
  options: LazyLoadOptions & {
    batchSize?: number;
    batchDelay?: number;
  } = {}
): {
  data: (T | null)[];
  loading: boolean[];
  errors: (Error | null)[];
  loaded: boolean[];
  loadBatch: (startIndex: number, endIndex?: number) => Promise<void>;
  loadAll: () => Promise<void>;
  reset: () => void;
} => {
  const { batchSize = 5, batchDelay = 100, ...lazyOptions } = options;

  const [data, setData] = useState<(T | null)[]>(new Array(items.length).fill(null));
  const [loading, setLoading] = useState<boolean[]>(new Array(items.length).fill(false));
  const [errors, setErrors] = useState<(Error | null)[]>(new Array(items.length).fill(null));
  const [loaded, setLoaded] = useState<boolean[]>(new Array(items.length).fill(false));

  const loadItem = useCallback(async (index: number): Promise<void> => {
    if (index >= items.length || loading[index]) return;

    setLoading(prev => {
      const newLoading = [...prev];
      newLoading[index] = true;
      return newLoading;
    });

    setErrors(prev => {
      const newErrors = [...prev];
      newErrors[index] = null;
      return newErrors;
    });

    try {
      const result = await items[index]();
      
      setData(prev => {
        const newData = [...prev];
        newData[index] = result;
        return newData;
      });

      setLoaded(prev => {
        const newLoaded = [...prev];
        newLoaded[index] = true;
        return newLoaded;
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      setErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = err;
        return newErrors;
      });
    } finally {
      setLoading(prev => {
        const newLoading = [...prev];
        newLoading[index] = false;
        return newLoading;
      });
    }
  }, [items, loading]);

  const loadBatch = useCallback(async (
    startIndex: number,
    endIndex: number = Math.min(startIndex + batchSize, items.length)
  ): Promise<void> => {
    const promises: Promise<void>[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      promises.push(loadItem(i));
      
      // Add delay between items in batch
      if (i < endIndex - 1 && batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    await Promise.allSettled(promises);
  }, [loadItem, batchSize, batchDelay]);

  const loadAll = useCallback(async (): Promise<void> => {
    for (let i = 0; i < items.length; i += batchSize) {
      await loadBatch(i, Math.min(i + batchSize, items.length));
      
      // Add delay between batches
      if (i + batchSize < items.length && batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay * 2));
      }
    }
  }, [items.length, batchSize, batchDelay, loadBatch]);

  const reset = useCallback((): void => {
    setData(new Array(items.length).fill(null));
    setLoading(new Array(items.length).fill(false));
    setErrors(new Array(items.length).fill(null));
    setLoaded(new Array(items.length).fill(false));
  }, [items.length]);

  return {
    data,
    loading,
    errors,
    loaded,
    loadBatch,
    loadAll,
    reset,
  };
};

/**
 * Hook for intersection-based lazy loading (for lists)
 */
export const useIntersectionLazyLoad = <T>(
  loadFn: () => Promise<T>,
  options: LazyLoadOptions & {
    threshold?: number;
    rootMargin?: string;
  } = {}
): LazyLoadState<T> & {
  ref: React.RefObject<any>;
  load: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
} => {
  const { threshold = 0.1, rootMargin = '50px', ...lazyOptions } = options;
  const ref = useRef<any>(null);
  
  const lazyLoad = useLazyLoad(loadFn, lazyOptions);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !lazyLoad.loaded && !lazyLoad.loading) {
            lazyLoad.load();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, lazyLoad]);

  return {
    ...lazyLoad,
    ref,
  };
};