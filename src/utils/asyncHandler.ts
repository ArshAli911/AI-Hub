/**
 * Debounce function for async operations
 */
export const asyncDebounce = <T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let resolvePromise: ((value: ReturnType<T>) => void) | null = null;
  let rejectPromise: ((reason: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Store resolve/reject for the latest call
      resolvePromise = resolve;
      rejectPromise = reject;

      // Set new timeout
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolvePromise?.(result);
        } catch (error) {
          rejectPromise?.(error);
        }
      }, delay);
    });
  };
};

/**
 * Throttle function for async operations
 */
export const asyncThrottle = <T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => Promise<ReturnType<T> | null>) => {
  let lastCallTime = 0;
  let isExecuting = false;

  return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    const now = Date.now();

    if (isExecuting || now - lastCallTime < delay) {
      return null;
    }

    isExecuting = true;
    lastCallTime = now;

    try {
      const result = await func(...args);
      return result;
    } finally {
      isExecuting = false;
    }
  };
};

/**
 * Retry function for async operations
 */
export const asyncRetry = async <T>(
  func: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: boolean = true
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
};

/**
 * Timeout wrapper for async operations
 */
export const asyncTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
};

/**
 * Batch async operations
 */
export const asyncBatch = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 5,
  delay: number = 0
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, index) => 
      processor(item, i + index)
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Batch item ${i + index} failed:`, result.reason);
      }
    });

    // Add delay between batches if specified
    if (delay > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
};

/**
 * Safe async wrapper that catches errors
 */
export const asyncSafe = async <T>(
  func: () => Promise<T>,
  fallback?: T
): Promise<T | null> => {
  try {
    return await func();
  } catch (error) {
    console.warn('Async operation failed:', error);
    return fallback ?? null;
  }
};

export default {
  asyncDebounce,
  asyncThrottle,
  asyncRetry,
  asyncTimeout,
  asyncBatch,
  asyncSafe,
};