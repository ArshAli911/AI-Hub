const { getDefaultConfig } = require('expo/metro-config');
const { resolver: defaultResolver } = getDefaultConfig(__dirname);

// Workaround for Jimp error
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Could not find MIME for Buffer')) {
    // Suppress the specific Jimp error
    return;
  }
  originalConsoleError(...args);
};

const config = getDefaultConfig(__dirname);

// Bundle optimization configurations
config.resolver = {
  ...defaultResolver,
  
  // Alias heavy dependencies to lighter alternatives
  alias: {
    'moment': './src/utils/dateUtils',
    'lodash': './src/utils/bundleOptimizer',
  },
  
  // Platform-specific extensions for better tree shaking
  platforms: ['ios', 'android', 'native', 'web'],
  
  // Asset extensions for optimization
  assetExts: [
    ...defaultResolver.assetExts,
    'webp', // Add WebP support
  ],
  
  // Source extensions
  sourceExts: [
    ...defaultResolver.sourceExts,
    'jsx',
    'ts',
    'tsx',
  ],
};

// Transformer optimizations
config.transformer = {
  ...config.transformer,
  
  // Enable minification in production
  minifierConfig: {
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
    },
    compress: {
      drop_console: !__DEV__, // Remove console.log in production
      drop_debugger: !__DEV__,
      pure_funcs: !__DEV__ ? ['console.log', 'console.warn'] : [],
    },
  },
  
  // Asset transformer optimizations
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Serializer optimizations for bundle splitting
config.serializer = {
  ...config.serializer,
  
  // Custom module filter for tree shaking
  createModuleIdFactory: () => (path) => {
    // Use shorter module IDs in production
    if (!__DEV__) {
      return path.replace(__dirname, '').replace(/\\/g, '/');
    }
    return path;
  },
  
  // Process module filter for dead code elimination
  processModuleFilter: (module) => {
    // Filter out test files and development-only modules
    if (module.path.includes('__tests__') || 
        module.path.includes('.test.') || 
        module.path.includes('.spec.')) {
      return false;
    }
    
    // Filter out development-only dependencies in production
    if (!__DEV__) {
      const devOnlyModules = [
        'react-devtools',
        'flipper',
        '@storybook',
        'reactotron',
      ];
      
      return !devOnlyModules.some(devModule => 
        module.path.includes(devModule)
      );
    }
    
    return true;
  },
};

// Cache configuration for faster builds
// Disable custom cache configuration to use Metro's default
// config.cacheStores = [
//   {
//     name: 'FileStore',
//     options: {
//       root: require('path').join(__dirname, '.metro-cache'),
//     },
//   },
// ];

// Resolver configuration for better performance
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.hasteImplModulePath = require.resolve('./src/utils/hasteImpl.js');

// Watch folder configuration
config.watchFolders = [
  require('path').resolve(__dirname, 'src'),
  require('path').resolve(__dirname, 'assets'),
];

// Maximum workers for parallel processing
config.maxWorkers = require('os').cpus().length;

module.exports = config;