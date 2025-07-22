// Haste implementation for Metro bundler optimization

const path = require('path');
const crypto = require('crypto');

/**
 * Custom Haste implementation for better module resolution
 */
module.exports = {
  /**
   * Get the haste name for a module
   */
  getHasteName(filePath) {
    // Only create haste names for our source files
    if (!filePath.includes('/src/')) {
      return null;
    }
    
    // Get relative path from src directory
    const relativePath = path.relative(
      path.join(__dirname, '..'),
      filePath
    );
    
    // Convert path to haste name
    return relativePath
      .replace(/\\/g, '/')
      .replace(/\.(js|jsx|ts|tsx)$/, '')
      .replace(/\/index$/, '');
  },

  /**
   * Check if a file should be included in the haste map
   */
  shouldInclude(filePath) {
    // Include only source files
    if (filePath.includes('/src/')) {
      return true;
    }
    
    // Exclude node_modules, tests, and build files
    const excludePatterns = [
      '/node_modules/',
      '/__tests__/',
      '.test.',
      '.spec.',
      '/build/',
      '/dist/',
      '/.expo/',
    ];
    
    return !excludePatterns.some(pattern => filePath.includes(pattern));
  },

  /**
   * Get dependencies for a module
   */
  getDependencies(filePath, content) {
    const dependencies = [];
    
    // Extract import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    // Extract require statements
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  },

  /**
   * Get cache key for the file
   * This is required by Metro bundler
   */
  getCacheKey() {
    const currentTime = new Date().getTime();
    return crypto.createHash('md5').update(String(currentTime)).digest('hex');
  },
};