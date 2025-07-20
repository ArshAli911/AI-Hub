// Application constants
export const APP_NAME = 'AI Hub';
export const APP_VERSION = '1.0.0';
export const APP_BUILD = '1';

// API Constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_AVATAR: '/users/avatar',
    DELETE_AVATAR: '/users/avatar',
    SETTINGS: '/users/settings',
    PREFERENCES: '/users/preferences',
  },
  MENTORS: {
    LIST: '/mentors',
    PROFILE: '/mentors/:id',
    BOOK_SESSION: '/mentors/:id/sessions',
    SESSIONS: '/mentors/sessions',
    REVIEWS: '/mentors/:id/reviews',
  },
  COMMUNITY: {
    POSTS: '/community/posts',
    POST: '/community/posts/:id',
    COMMENTS: '/community/posts/:id/comments',
    LIKE: '/community/posts/:id/like',
    CATEGORIES: '/community/categories',
  },
  MARKETPLACE: {
    PRODUCTS: '/marketplace/products',
    PRODUCT: '/marketplace/products/:id',
    PURCHASE: '/marketplace/products/:id/purchase',
    ORDERS: '/marketplace/orders',
  },
  PROTOTYPES: {
    LIST: '/prototypes',
    UPLOAD: '/prototypes',
    PROTOTYPE: '/prototypes/:id',
    DOWNLOAD: '/prototypes/:id/download',
    FEEDBACK: '/prototypes/:id/feedback',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@ai_hub_auth_token',
  USER_DATA: '@ai_hub_user_data',
  THEME: '@ai_hub_theme',
  LANGUAGE: '@ai_hub_language',
  ONBOARDING_COMPLETED: '@ai_hub_onboarding_completed',
  CACHE_VERSION: '@ai_hub_cache_version',
  OFFLINE_QUEUE: '@ai_hub_offline_queue',
  USER_PREFERENCES: '@ai_hub_user_preferences',
} as const;

// Screen Names
export const SCREEN_NAMES = {
  // Auth Stack
  SPLASH: 'Splash',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  
  // Main Stack
  HOME: 'Home',
  MENTORS: 'Mentors',
  MENTOR_PROFILE: 'MentorProfile',
  BOOK_SESSION: 'BookSession',
  COMMUNITY: 'Community',
  POST_DETAILS: 'PostDetails',
  CREATE_POST: 'CreatePost',
  MARKETPLACE: 'Marketplace',
  PRODUCT_DETAILS: 'ProductDetails',
  PROTOTYPES: 'Prototypes',
  PROTOTYPE_DETAILS: 'PrototypeDetails',
  UPLOAD_PROTOTYPE: 'UploadPrototype',
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  SETTINGS: 'Settings',
  
  // Modal Screens
  IMAGE_VIEWER: 'ImageViewer',
  VIDEO_CALL: 'VideoCall',
  CHAT: 'Chat',
} as const;

// Theme Constants
export const THEME = {
  COLORS: {
    PRIMARY: '#6200EE',
    PRIMARY_VARIANT: '#3700B3',
    SECONDARY: '#03DAC6',
    SECONDARY_VARIANT: '#018786',
    BACKGROUND: '#FFFFFF',
    SURFACE: '#FFFFFF',
    ERROR: '#B00020',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    INFO: '#2196F3',
    ON_PRIMARY: '#FFFFFF',
    ON_SECONDARY: '#000000',
    ON_BACKGROUND: '#000000',
    ON_SURFACE: '#000000',
    ON_ERROR: '#FFFFFF',
    TEXT_PRIMARY: '#212121',
    TEXT_SECONDARY: '#757575',
    DIVIDER: '#BDBDBD',
    DISABLED: '#9E9E9E',
    PLACEHOLDER: '#9E9E9E',
  },
  DARK_COLORS: {
    PRIMARY: '#BB86FC',
    PRIMARY_VARIANT: '#3700B3',
    SECONDARY: '#03DAC6',
    SECONDARY_VARIANT: '#03DAC6',
    BACKGROUND: '#121212',
    SURFACE: '#1E1E1E',
    ERROR: '#CF6679',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    INFO: '#2196F3',
    ON_PRIMARY: '#000000',
    ON_SECONDARY: '#000000',
    ON_BACKGROUND: '#FFFFFF',
    ON_SURFACE: '#FFFFFF',
    ON_ERROR: '#000000',
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_SECONDARY: '#B3B3B3',
    DIVIDER: '#424242',
    DISABLED: '#616161',
    PLACEHOLDER: '#616161',
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    ROUND: 50,
  },
  FONT_SIZES: {
    XS: 10,
    SM: 12,
    MD: 14,
    LG: 16,
    XL: 18,
    XXL: 20,
    XXXL: 24,
    TITLE: 28,
    HEADING: 32,
  },
  FONT_WEIGHTS: {
    LIGHT: '300' as const,
    REGULAR: '400' as const,
    MEDIUM: '500' as const,
    SEMIBOLD: '600' as const,
    BOLD: '700' as const,
  },
} as const;

// Animation Constants
export const ANIMATIONS = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
  EASING: {
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    LINEAR: 'linear',
  },
} as const;

// Validation Constants
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },
  EMAIL: {
    MAX_LENGTH: 254,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  BIO: {
    MAX_LENGTH: 500,
  },
  POST: {
    TITLE_MAX_LENGTH: 200,
    CONTENT_MAX_LENGTH: 5000,
  },
  COMMENT: {
    MAX_LENGTH: 1000,
  },
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mov', 'video/avi'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 0.8,
} as const;

// Cache Constants
export const CACHE = {
  TTL: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
  KEYS: {
    USER_PROFILE: 'user_profile',
    MENTORS_LIST: 'mentors_list',
    POSTS_LIST: 'posts_list',
    PRODUCTS_LIST: 'products_list',
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Successfully logged out!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  POST_CREATED: 'Post created successfully!',
  POST_UPDATED: 'Post updated successfully!',
  POST_DELETED: 'Post deleted successfully!',
  SESSION_BOOKED: 'Session booked successfully!',
  REVIEW_SUBMITTED: 'Review submitted successfully!',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_BIOMETRIC_AUTH: false,
  ENABLE_DARK_MODE: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_VIDEO_CALLS: true,
  ENABLE_CHAT: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
} as const;

export default {
  APP_NAME,
  APP_VERSION,
  APP_BUILD,
  API_ENDPOINTS,
  STORAGE_KEYS,
  SCREEN_NAMES,
  THEME,
  ANIMATIONS,
  VALIDATION,
  FILE_UPLOAD,
  PAGINATION,
  CACHE,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
};