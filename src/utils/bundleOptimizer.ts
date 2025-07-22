// Bundle optimization utilities and recommendations

/**
 * Lightweight alternatives to heavy dependencies
 */

// Replace moment.js with our lightweight date utils
export { formatDate, formatTime, getRelativeTime } from './dateUtils';

// Optimized icon loading - only load icons when needed
export const loadIcon = async (iconName: string) => {
  // Dynamically import only the needed icon
  try {
    const iconModule = await import(`@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/${iconName}.ttf`);
    return iconModule.default;
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`);
    return null;
  }
};

// Tree-shakable utility functions
export const utils = {
  // Lightweight lodash alternatives
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  pick: <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  omit: <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },

  isEmpty: (value: any): boolean => {
    if (value == null) return true;
    if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  isEqual: (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => utils.isEqual(item, b[index]));
    }
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => utils.isEqual(a[key], b[key]));
    }
    
    return false;
  },

  cloneDeep: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj)) return obj.map(item => utils.cloneDeep(item)) as unknown as T;
    
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = utils.cloneDeep((obj as any)[key]);
    });
    return cloned;
  },

  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  uniq: <T>(array: T[]): T[] => {
    return Array.from(new Set(array));
  },

  flatten: <T>(array: (T | T[])[]): T[] => {
    return array.reduce<T[]>((acc, val) => 
      Array.isArray(val) ? acc.concat(utils.flatten(val)) : acc.concat(val), []
    );
  },
};

/**
 * Bundle size recommendations
 */
export const bundleRecommendations = {
  // Heavy dependencies to consider replacing
  heavyDependencies: [
    {
      name: 'moment',
      size: '~67KB',
      alternative: 'date-fns or native Intl API',
      savings: '~50KB',
      implemented: true,
    },
    {
      name: 'lodash',
      size: '~70KB',
      alternative: 'Native JS methods or tree-shaking',
      savings: '~60KB',
      implemented: true,
    },
    {
      name: 'axios',
      size: '~15KB',
      alternative: 'fetch API with polyfill',
      savings: '~10KB',
      implemented: false,
    },
  ],

  // Optimization strategies
  strategies: [
    'Use dynamic imports for code splitting',
    'Implement tree shaking for unused code',
    'Optimize images and use WebP format',
    'Use lazy loading for components and routes',
    'Minimize polyfills and use native APIs',
    'Bundle analyze to identify large dependencies',
  ],

  // Metro bundler optimizations
  metroConfig: {
    resolver: {
      alias: {
        // Alias heavy dependencies to lighter alternatives
        'moment': './src/utils/dateUtils',
        'lodash': './src/utils/bundleOptimizer',
      },
    },
    transformer: {
      minifierConfig: {
        // Optimize minification
        keep_fnames: false,
        mangle: {
          keep_fnames: false,
        },
        compress: {
          drop_console: true, // Remove console.log in production
        },
      },
    },
  },
};

/**
 * Code splitting utilities
 */
export const codeSplitting = {
  // Lazy load heavy features
  loadFeature: async (featureName: string) => {
    switch (featureName) {
      case 'camera':
        return import('expo-image-picker');
      case 'notifications':
        return import('expo-notifications');
      case 'location':
        return import('expo-location');
      default:
        throw new Error(`Unknown feature: ${featureName}`);
    }
  },

  // Preload critical features
  preloadCriticalFeatures: async () => {
    const criticalFeatures = ['notifications'];
    const promises = criticalFeatures.map(feature => 
      codeSplitting.loadFeature(feature).catch(err => 
        console.warn(`Failed to preload ${feature}:`, err)
      )
    );
    await Promise.allSettled(promises);
  },
};

/**
 * Asset optimization
 */
export const assetOptimization = {
  // Optimize image loading
  getOptimizedImageUri: (
    uri: string,
    width?: number,
    height?: number,
    quality: number = 80
  ): string => {
    if (!uri.startsWith('http')) return uri;
    
    const url = new URL(uri);
    
    // Add optimization parameters
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp'); // Use WebP format
    
    return url.toString();
  },

  // Preload critical images
  preloadImages: async (imageUris: string[]): Promise<void> => {
    const { Image } = await import('react-native');
    const promises = imageUris.map(uri => 
      Image.prefetch(uri).catch(err => 
        console.warn(`Failed to preload image ${uri}:`, err)
      )
    );
    await Promise.allSettled(promises);
  },

  // Get responsive image sizes
  getResponsiveImageSizes: (containerWidth: number) => {
    return {
      small: Math.min(containerWidth * 0.5, 200),
      medium: Math.min(containerWidth * 0.75, 400),
      large: Math.min(containerWidth, 800),
    };
  },
};

/**
 * Performance budget checker
 */
export const performanceBudget = {
  // Bundle size limits (in KB)
  limits: {
    total: 2000, // 2MB total
    javascript: 1000, // 1MB JS
    images: 500, // 500KB images
    fonts: 100, // 100KB fonts
  },

  // Check if bundle size is within budget
  checkBudget: (sizes: {
    total: number;
    javascript: number;
    images: number;
    fonts: number;
  }) => {
    const violations: string[] = [];
    
    Object.entries(performanceBudget.limits).forEach(([key, limit]) => {
      const size = sizes[key as keyof typeof sizes];
      if (size > limit) {
        violations.push(`${key}: ${size}KB exceeds limit of ${limit}KB`);
      }
    });
    
    return {
      withinBudget: violations.length === 0,
      violations,
      totalSize: sizes.total,
      budgetUsage: (sizes.total / performanceBudget.limits.total) * 100,
    };
  },
};