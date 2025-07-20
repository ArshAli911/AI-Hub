// Performance configuration and constants

export const PERFORMANCE_CONFIG = {
  // Image optimization
  images: {
    defaultQuality: 80,
    thumbnailQuality: 60,
    maxWidth: 1200,
    maxHeight: 1200,
    thumbnailSize: 200,
    cachePolicy: 'memory-disk' as const,
    formats: {
      preferred: 'webp',
      fallback: 'jpeg',
    },
    lazy: {
      threshold: 0.1,
      rootMargin: '50px',
    },
  },

  // List virtualization
  lists: {
    windowSize: 10,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
    estimatedItemSize: 100,
    preloadDistance: 1000,
    cacheSize: 50,
    batchSize: 20,
  },

  // Network requests
  network: {
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
    cacheTimeout: 300000, // 5 minutes
    maxConcurrentRequests: 6,
    requestDelay: 16, // One frame
  },

  // Memory management
  memory: {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 60000, // 1 minute
    memoryWarningThreshold: 0.8, // 80%
    maxSubscriptions: 100,
    maxTimers: 50,
  },

  // Bundle optimization
  bundle: {
    chunkSize: 250 * 1024, // 250KB
    preloadChunks: ['auth', 'navigation', 'core'],
    lazyChunks: ['camera', 'payments', 'analytics'],
    treeshaking: true,
    minification: true,
  },

  // Animation performance
  animations: {
    useNativeDriver: true,
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: 'ease-out',
    fps: 60,
    maxConcurrentAnimations: 5,
  },

  // Database/Storage
  storage: {
    maxCacheEntries: 1000,
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
    batchSize: 50,
    syncInterval: 30000, // 30 seconds
  },

  // Monitoring
  monitoring: {
    enabled: __DEV__,
    sampleRate: 0.1, // 10% sampling in production
    maxMetrics: 1000,
    flushInterval: 60000, // 1 minute
    slowOperationThreshold: 1000, // 1 second
  },
} as const;

// Performance thresholds for different operations
export const PERFORMANCE_THRESHOLDS = {
  // Render performance
  render: {
    component: 16, // 16ms for 60fps
    screen: 100,
    list: 50,
  },

  // Network performance
  network: {
    api: 2000, // 2 seconds
    image: 5000, // 5 seconds
    upload: 30000, // 30 seconds
  },

  // Memory usage
  memory: {
    warning: 100 * 1024 * 1024, // 100MB
    critical: 200 * 1024 * 1024, // 200MB
  },

  // Bundle size
  bundle: {
    total: 2 * 1024 * 1024, // 2MB
    chunk: 500 * 1024, // 500KB
    asset: 1 * 1024 * 1024, // 1MB
  },
} as const;

// Feature flags for performance optimizations
export const PERFORMANCE_FLAGS = {
  // Enable/disable specific optimizations
  lazyLoading: true,
  imageOptimization: true,
  listVirtualization: true,
  bundleSplitting: true,
  memoryManagement: true,
  performanceMonitoring: __DEV__,
  
  // Experimental features
  experimental: {
    concurrentFeatures: false,
    suspenseForDataFetching: false,
    automaticBatching: true,
  },
} as const;

// Platform-specific optimizations
export const PLATFORM_OPTIMIZATIONS = {
  ios: {
    // iOS-specific optimizations
    useCADisplayLink: true,
    enableHermes: true,
    flipperEnabled: __DEV__,
  },
  
  android: {
    // Android-specific optimizations
    enableHermes: true,
    enableProguard: !__DEV__,
    enableSeparateBuildPerCPUArchitecture: !__DEV__,
  },
  
  web: {
    // Web-specific optimizations
    enableServiceWorker: !__DEV__,
    enableWebAssembly: false,
    enableWebWorkers: true,
  },
} as const;

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  // Time budgets (in milliseconds)
  time: {
    appStartup: 3000,
    screenTransition: 300,
    apiResponse: 2000,
    imageLoad: 1000,
    listScroll: 16, // 60fps
  },

  // Size budgets (in bytes)
  size: {
    totalBundle: 2 * 1024 * 1024,
    jsBundle: 1.5 * 1024 * 1024,
    assets: 500 * 1024,
    images: 200 * 1024,
    fonts: 100 * 1024,
  },

  // Memory budgets (in bytes)
  memory: {
    baseline: 50 * 1024 * 1024,
    peak: 150 * 1024 * 1024,
    cache: 30 * 1024 * 1024,
  },
} as const;

// Development vs Production configurations
export const getPerformanceConfig = () => {
  const baseConfig = PERFORMANCE_CONFIG;
  
  if (__DEV__) {
    return {
      ...baseConfig,
      monitoring: {
        ...baseConfig.monitoring,
        enabled: true,
        sampleRate: 1.0, // 100% sampling in development
      },
      network: {
        ...baseConfig.network,
        timeout: 60000, // Longer timeout for debugging
      },
    };
  }
  
  return {
    ...baseConfig,
    monitoring: {
      ...baseConfig.monitoring,
      enabled: true,
      sampleRate: 0.1, // 10% sampling in production
    },
    bundle: {
      ...baseConfig.bundle,
      minification: true,
      treeshaking: true,
    },
  };
};

// Utility functions for performance checks
export const performanceUtils = {
  // Check if operation exceeds threshold
  exceedsThreshold: (duration: number, operation: keyof typeof PERFORMANCE_THRESHOLDS) => {
    const threshold = PERFORMANCE_THRESHOLDS[operation];
    if (typeof threshold === 'object') {
      return false; // Need specific sub-operation
    }
    return duration > threshold;
  },

  // Check if feature flag is enabled
  isFeatureEnabled: (feature: keyof typeof PERFORMANCE_FLAGS) => {
    return PERFORMANCE_FLAGS[feature];
  },

  // Get platform-specific optimization
  getPlatformOptimization: <T extends keyof typeof PLATFORM_OPTIMIZATIONS>(
    platform: T
  ) => {
    return PLATFORM_OPTIMIZATIONS[platform];
  },

  // Check if within performance budget
  withinBudget: (
    value: number,
    budget: keyof typeof PERFORMANCE_BUDGETS,
    type: string
  ) => {
    const budgetConfig = PERFORMANCE_BUDGETS[budget];
    if (typeof budgetConfig === 'object' && type in budgetConfig) {
      return value <= (budgetConfig as any)[type];
    }
    return false;
  },
};