import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserProvider } from '../context/UserProvider';
import { User, Mentor, Prototype, Product } from '../types';

// Test data generators
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  skills: ['React Native', 'TypeScript'],
  experience: 'Intermediate',
  location: 'New York, NY',
  timezone: 'America/New_York',
  hourlyRate: 50,
  rating: 4.5,
  reviewCount: 10,
  isVerified: true,
  isAvailable: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockMentor = (overrides: Partial<Mentor> = {}): Mentor => ({
  id: 'test-mentor-id',
  userId: 'test-user-id',
  expertise: ['React Native', 'Mobile Development'],
  experience: 5,
  education: 'Computer Science',
  certifications: ['AWS Certified', 'Google Cloud'],
  availability: {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }],
    saturday: [],
    sunday: []
  },
  hourlyRate: 75,
  rating: 4.8,
  reviewCount: 25,
  isAvailable: true,
  isVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockPrototype = (overrides: Partial<Prototype> = {}): Prototype => ({
  id: 'test-prototype-id',
  title: 'Test Prototype',
  description: 'A test prototype for testing purposes',
  category: 'Mobile App',
  tags: ['React Native', 'UI/UX'],
  images: ['https://example.com/image1.jpg'],
  videoUrl: 'https://example.com/video.mp4',
  demoUrl: 'https://example.com/demo',
  githubUrl: 'https://github.com/test/prototype',
  status: 'active',
  isPublic: true,
  creatorId: 'test-user-id',
  collaborators: [],
  feedback: [],
  views: 100,
  likes: 25,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'test-product-id',
  title: 'Test Product',
  description: 'A test product for testing purposes',
  category: 'Mobile App',
  price: 99.99,
  currency: 'USD',
  images: ['https://example.com/product1.jpg'],
  demoUrl: 'https://example.com/demo',
  downloadUrl: 'https://example.com/download',
  sellerId: 'test-user-id',
  rating: 4.5,
  reviewCount: 15,
  downloads: 500,
  status: 'active',
  tags: ['React Native', 'Premium'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

// Mock API responses
export const mockApiResponses = {
  user: {
    success: { data: createMockUser(), success: true },
    error: { error: 'User not found', success: false }
  },
  mentor: {
    success: { data: createMockMentor(), success: true },
    error: { error: 'Mentor not found', success: false }
  },
  prototype: {
    success: { data: createMockPrototype(), success: true },
    error: { error: 'Prototype not found', success: false }
  },
  product: {
    success: { data: createMockProduct(), success: true },
    error: { error: 'Product not found', success: false }
  }
};

// Mock navigation
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(),
  dispatch: jest.fn(),
};

export const mockRoute = {
  key: 'test-route',
  name: 'TestScreen',
  params: {},
  path: undefined,
};

// Mock Firebase
export const mockFirebaseAuth = {
  currentUser: createMockUser(),
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updatePassword: jest.fn(),
  updateEmail: jest.fn(),
  updateProfile: jest.fn(),
};

// Mock AsyncStorage
export const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};

// Mock Expo Notifications
export const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
};

// Mock Expo FileSystem
export const mockFileSystem = {
  documentDirectory: '/test/documents/',
  cacheDirectory: '/test/cache/',
  bundleDirectory: '/test/bundle/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
  copyAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  downloadAsync: jest.fn(),
  uploadAsync: jest.fn(),
};

// Mock Expo ImagePicker
export const mockImagePicker = {
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
  ImagePickerResult: {
    canceled: false,
    assets: [{ uri: 'test-image.jpg', width: 100, height: 100 }],
  },
};

// Mock Expo Location
export const mockLocation = {
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  LocationAccuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
};

// Custom render function with providers
export const renderWithProviders = (
  component: React.ReactElement,
  options: {
    initialRoute?: string;
  } = {}
) => {
  return render(
    React.createElement(ThemeProvider, null,
      React.createElement(AuthProvider, null,
        React.createElement(UserProvider, null,
          React.createElement(NavigationContainer, null, component)
        )
      )
    )
  );
};

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = jest.fn();
  console.error = mockError;
  return {
    mockError,
    restore: () => {
      console.error = originalError;
    },
  };
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  const mockWarn = jest.fn();
  console.warn = mockWarn;
  return {
    mockWarn,
    restore: () => {
      console.warn = originalWarn;
    },
  };
};

// Validation helpers
export const expectToBeValidUser = (user: User) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('displayName');
  expect(typeof user.id).toBe('string');
  expect(typeof user.email).toBe('string');
  expect(typeof user.username).toBe('string');
  expect(typeof user.displayName).toBe('string');
};

export const expectToBeValidMentor = (mentor: Mentor) => {
  expect(mentor).toHaveProperty('id');
  expect(mentor).toHaveProperty('userId');
  expect(mentor).toHaveProperty('expertise');
  expect(mentor).toHaveProperty('hourlyRate');
  expect(typeof mentor.id).toBe('string');
  expect(typeof mentor.userId).toBe('string');
  expect(Array.isArray(mentor.expertise)).toBe(true);
  expect(typeof mentor.hourlyRate).toBe('number');
};

export const expectToBeValidPrototype = (prototype: Prototype) => {
  expect(prototype).toHaveProperty('id');
  expect(prototype).toHaveProperty('title');
  expect(prototype).toHaveProperty('description');
  expect(prototype).toHaveProperty('creatorId');
  expect(typeof prototype.id).toBe('string');
  expect(typeof prototype.title).toBe('string');
  expect(typeof prototype.description).toBe('string');
  expect(typeof prototype.creatorId).toBe('string');
};

export const expectToBeValidProduct = (product: Product) => {
  expect(product).toHaveProperty('id');
  expect(product).toHaveProperty('title');
  expect(product).toHaveProperty('description');
  expect(product).toHaveProperty('price');
  expect(product).toHaveProperty('sellerId');
  expect(typeof product.id).toBe('string');
  expect(typeof product.title).toBe('string');
  expect(typeof product.description).toBe('string');
  expect(typeof product.price).toBe('number');
  expect(typeof product.sellerId).toBe('string');
};

// Network helpers
export const mockNetworkError = () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(() => 
    Promise.reject(new Error('Network request failed'))
  );
  return {
    restore: () => {
      global.fetch = originalFetch;
    },
  };
};

export const mockNetworkSuccess = (data: any) => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response)
  );
  return {
    restore: () => {
      global.fetch = originalFetch;
    },
  };
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};

export const resetAllMocks = () => {
  jest.resetAllMocks();
  jest.resetModules();
};

// Test environment setup
export const setupTestEnvironment = () => {
  beforeAll(() => {
    // Mock global objects
    global.console = {
      ...console,
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };
  });

  beforeEach(() => {
    cleanupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  afterAll(() => {
    resetAllMocks();
  });
}; 