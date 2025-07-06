// Export all services for easy importing
export * from './firebase';

// Re-export commonly used service functions
export { 
  auth,
  firestore,
  storage,
  firebaseService
} from './firebase';

// Service configuration
export const SERVICE_CONFIG = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  storage: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    uploadPath: 'uploads/',
  },
  notifications: {
    defaultChannel: 'general',
    channels: {
      general: {
        id: 'general',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: 'default',
      },
      sessions: {
        id: 'sessions',
        name: 'Session Notifications',
        description: 'Mentor session updates',
        importance: 'high',
      },
      marketplace: {
        id: 'marketplace',
        name: 'Marketplace Notifications',
        description: 'Marketplace activity updates',
        importance: 'default',
      },
    },
  },
};

// Service utilities
export const serviceUtils = {
  // Generate unique file names
  generateFileName: (originalName: string, userId: string): string => {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    return `${userId}_${timestamp}.${extension}`;
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate file type
  validateFileType: (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(file.type);
  },

  // Validate file size
  validateFileSize: (file: File, maxSize: number): boolean => {
    return file.size <= maxSize;
  },

  // Create error message for file validation
  getFileValidationError: (file: File, allowedTypes: string[], maxSize: number): string | null => {
    if (!serviceUtils.validateFileType(file, allowedTypes)) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    if (!serviceUtils.validateFileSize(file, maxSize)) {
      return `File too large. Maximum size: ${serviceUtils.formatFileSize(maxSize)}`;
    }
    return null;
  },
};

// Re-export service utilities
export const {
  generateFileName,
  formatFileSize,
  validateFileType,
  validateFileSize,
  getFileValidationError,
} = serviceUtils;

// Core services
export { default as firebaseAuthService } from './firebaseService';
export { default as storageService } from './storage';
export { default as notificationService } from './notifications';

// API services
export { default as apiClient } from '../api/client';
export { default as authApi } from '../api/auth.api';
export { default as mentorApi } from '../api/mentor.api';
export { default as prototypeApi } from '../api/prototype.api';
export { default as marketplaceApi } from '../api/marketplace.api';

// Advanced services
export { default as websocketService } from './websocketService';
export { default as paymentService } from './paymentService';
export { default as videoCallService } from './videoCallService';
export { default as offlineService } from './offlineService';

// Production services
export { default as errorService } from './errorService';
export { default as securityService } from './securityService';
export { default as performanceService } from './performanceService';

// Re-export types for convenience
export type {
  AuthUser,
  SignUpData,
  SignInData
} from './firebaseService';

export type {
  UploadProgress,
  UploadResult,
  FileInfo
} from './storage';

export type {
  NotificationData,
  PushNotificationData,
  NotificationSettings
} from './notifications';

export type {
  WebSocketMessage,
  WebSocketEvent,
  WebSocketConfig,
  WebSocketListener
} from './websocketService';

export type {
  PaymentMethod,
  PaymentIntent,
  Subscription,
  Invoice
} from './paymentService';

export type {
  VideoCallRoom,
  VideoCallParticipant,
  VideoCallSettings,
  VideoCallMessage
} from './videoCallService';

export type {
  OfflineAction,
  SyncConfig,
  DataCache,
  ConflictData
} from './offlineService';

export type {
  ErrorInfo,
  DeviceInfo,
  NetworkInfo,
  Breadcrumb,
  PerformanceMetric,
  ErrorConfig
} from './errorService';

export type {
  SecurityConfig,
  ValidationRule,
  SanitizationRule,
  RateLimitConfig
} from './securityService';

export type {
  PerformanceMetric as PerformanceMetricType,
  PerformanceThreshold,
  MemoryInfo,
  BatteryInfo,
  NetworkInfo as NetworkInfoType,
  PerformanceConfig
} from './performanceService'; 