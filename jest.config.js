module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '@testing-library/jest-native/extend-expect',
  ],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/index.{js,jsx,ts,tsx}',
    '!src/App.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|react-navigation|@testing-library/react-native|@testing-library/jest-native)/)',
  ],
  testEnvironment: 'jsdom',
  globals: {
    __DEV__: true,
  },
  reporters: ['default'],
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  verbose: true,
  errorOnDeprecated: true,
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/hooks/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/utils/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/services/**/*.test.{js,jsx,ts,tsx}',
      ],
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/__tests__/integration/**/*.test.{js,jsx,ts,tsx}',
      ],
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/src/__tests__/performance/**/*.test.{js,jsx,ts,tsx}',
      ],
    },
    {
      displayName: 'Security Tests',
      testMatch: [
        '<rootDir>/src/__tests__/security/**/*.test.{js,jsx,ts,tsx}',
      ],
    },
  ],
};