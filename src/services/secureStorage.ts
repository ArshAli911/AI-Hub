import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encryptionService } from '../utils/security';
import { logger } from '../utils/logger';

export interface SecureStorageOptions {
  encrypt?: boolean;
  expiresIn?: number; // milliseconds
  requireAuthentication?: boolean;
  accessGroup?: string; // iOS only
}

export interface StoredItem {
  value: any;
  encrypted: boolean;
  timestamp: number;
  expiresAt?: number;
  checksum?: string;
}

export class SecureStorageService {
  private static instance: SecureStorageService;
  private initialized = false;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Initialize secure storage service
   */
  async initialize(): Promise<void> {
    try {
      await encryptionService.initialize();
      this.initialized = true;
      logger.info('SecureStorageService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecureStorageService', error);
      throw error;
    }
  }

  /**
   * Store data securely
   */
  async setItem(
    key: string,
    value: any,
    options: SecureStorageOptions = {}
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const {
        encrypt = true,
        expiresIn,
        requireAuthentication = false,
        accessGroup,
      } = options;

      // Create stored item
      const storedItem: StoredItem = {
        value: encrypt ? encryptionService.encrypt(JSON.stringify(value)) : value,
        encrypted: encrypt,
        timestamp: Date.now(),
        expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      };

      // Add checksum for integrity verification
      if (encrypt) {
        storedItem.checksum = this.generateChecksum(JSON.stringify(value));
      }

      const serializedItem = JSON.stringify(storedItem);

      // Choose storage method based on sensitivity
      if (this.isSensitiveKey(key) || requireAuthentication) {
        await this.setSecureItem(key, serializedItem, { accessGroup });
      } else {
        await AsyncStorage.setItem(key, serializedItem);
      }

      logger.debug('Item stored securely', {
        key,
        encrypted: encrypt,
        hasExpiration: !!expiresIn,
        useSecureStore: this.isSensitiveKey(key) || requireAuthentication,
      });

    } catch (error) {
      logger.error('Failed to store item securely', error, { key });
      throw new Error(`Secure storage failed for key: ${key}`);
    }
  }

  /**
   * Retrieve data securely
   */
  async getItem<T = any>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      let serializedItem: string | null;

      // Choose retrieval method based on sensitivity
      if (this.isSensitiveKey(key)) {
        serializedItem = await this.getSecureItem(key);
      } else {
        serializedItem = await AsyncStorage.getItem(key);
      }

      if (!serializedItem) {
        return null;
      }

      const storedItem: StoredItem = JSON.parse(serializedItem);

      // Check expiration
      if (storedItem.expiresAt && Date.now() > storedItem.expiresAt) {
        await this.removeItem(key);
        logger.debug('Expired item removed', { key });
        return null;
      }

      // Decrypt if necessary
      let value = storedItem.value;
      if (storedItem.encrypted) {
        const decryptedValue = encryptionService.decrypt(value);
        
        // Verify checksum if available
        if (storedItem.checksum) {
          const currentChecksum = this.generateChecksum(decryptedValue);
          if (currentChecksum !== storedItem.checksum) {
            logger.error('Data integrity check failed', { key });
            await this.removeItem(key);
            throw new Error('Data integrity verification failed');
          }
        }

        value = JSON.parse(decryptedValue);
      }

      return value as T;

    } catch (error) {
      logger.error('Failed to retrieve item securely', error, { key });
      return null;
    }
  }

  /**
   * Remove item from secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (this.isSensitiveKey(key)) {
        await this.removeSecureItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }

      logger.debug('Item removed from secure storage', { key });
    } catch (error) {
      logger.error('Failed to remove item from secure storage', error, { key });
      throw error;
    }
  }

  /**
   * Check if item exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const item = await this.getItem(key);
      return item !== null;
    } catch (error) {
      logger.error('Failed to check item existence', error, { key });
      return false;
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const asyncStorageKeys = await AsyncStorage.getAllKeys();
      
      // Filter out system keys and only return app keys
      const appKeys = asyncStorageKeys.filter(key => 
        key.startsWith('@ai_hub_') || key.startsWith('ai_hub_')
      );

      return appKeys;
    } catch (error) {
      logger.error('Failed to get all keys', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      
      await Promise.all(
        keys.map(key => this.removeItem(key))
      );

      logger.info('All secure storage data cleared');
    } catch (error) {
      logger.error('Failed to clear secure storage', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalItems: number;
    encryptedItems: number;
    expiredItems: number;
    totalSize: number;
  }> {
    try {
      const keys = await this.getAllKeys();
      let totalItems = 0;
      let encryptedItems = 0;
      let expiredItems = 0;
      let totalSize = 0;

      for (const key of keys) {
        try {
          const serializedItem = await AsyncStorage.getItem(key);
          if (serializedItem) {
            totalItems++;
            totalSize += serializedItem.length;

            const storedItem: StoredItem = JSON.parse(serializedItem);
            if (storedItem.encrypted) {
              encryptedItems++;
            }
            if (storedItem.expiresAt && Date.now() > storedItem.expiresAt) {
              expiredItems++;
            }
          }
        } catch (error) {
          // Skip invalid items
          continue;
        }
      }

      return {
        totalItems,
        encryptedItems,
        expiredItems,
        totalSize,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      return {
        totalItems: 0,
        encryptedItems: 0,
        expiredItems: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Clean up expired items
   */
  async cleanupExpired(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      let cleanedCount = 0;

      for (const key of keys) {
        try {
          const item = await this.getItem(key);
          if (item === null) {
            // Item was expired and automatically removed
            cleanedCount++;
          }
        } catch (error) {
          // Skip invalid items
          continue;
        }
      }

      logger.info('Expired items cleaned up', { count: cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired items', error);
      return 0;
    }
  }

  /**
   * Store item in secure store (iOS Keychain / Android Keystore)
   */
  private async setSecureItem(
    key: string,
    value: string,
    options: { accessGroup?: string } = {}
  ): Promise<void> {
    if (Platform.OS === 'web') {
      // Fallback to AsyncStorage for web
      await AsyncStorage.setItem(key, value);
      return;
    }

    const secureStoreOptions: SecureStore.SecureStoreOptions = {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to access secure data',
    };

    if (Platform.OS === 'ios' && options.accessGroup) {
      secureStoreOptions.accessGroup = options.accessGroup;
    }

    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  }

  /**
   * Get item from secure store
   */
  private async getSecureItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Fallback to AsyncStorage for web
      return await AsyncStorage.getItem(key);
    }

    try {
      return await SecureStore.getItemAsync(key, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure data',
      });
    } catch (error) {
      if (error.code === 'UserCancel') {
        logger.info('User cancelled authentication for secure item', { key });
        return null;
      }
      throw error;
    }
  }

  /**
   * Remove item from secure store
   */
  private async removeSecureItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  }

  /**
   * Check if key contains sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      'token',
      'password',
      'secret',
      'key',
      'auth',
      'credential',
      'private',
      'secure',
      'biometric',
      'pin',
    ];

    const lowerKey = key.toLowerCase();
    return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: string): string {
    return encryptionService.hash(data);
  }
}

// Predefined secure storage keys
export const SECURE_STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: '@ai_hub_auth_token',
  REFRESH_TOKEN: '@ai_hub_refresh_token',
  USER_CREDENTIALS: '@ai_hub_user_credentials',
  BIOMETRIC_KEY: '@ai_hub_biometric_key',

  // User data
  USER_PROFILE: '@ai_hub_user_profile',
  USER_PREFERENCES: '@ai_hub_user_preferences',
  USER_SETTINGS: '@ai_hub_user_settings',

  // Security
  ENCRYPTION_KEYS: '@ai_hub_encryption_keys',
  SECURITY_QUESTIONS: '@ai_hub_security_questions',
  TWO_FACTOR_SECRET: '@ai_hub_2fa_secret',

  // App data
  OFFLINE_DATA: '@ai_hub_offline_data',
  CACHE_DATA: '@ai_hub_cache_data',
  ANALYTICS_DATA: '@ai_hub_analytics_data',

  // Session
  SESSION_DATA: '@ai_hub_session_data',
  DEVICE_ID: '@ai_hub_device_id',
  INSTALLATION_ID: '@ai_hub_installation_id',
} as const;

// Create singleton instance
export const secureStorage = SecureStorageService.getInstance();

// Convenience functions
export const secureStorageHelpers = {
  /**
   * Store authentication token
   */
  async storeAuthToken(token: string, expiresIn?: number): Promise<void> {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, token, {
      encrypt: true,
      expiresIn,
      requireAuthentication: true,
    });
  },

  /**
   * Get authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return await secureStorage.getItem<string>(SECURE_STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Store user credentials
   */
  async storeUserCredentials(credentials: any): Promise<void> {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.USER_CREDENTIALS, credentials, {
      encrypt: true,
      requireAuthentication: true,
    });
  },

  /**
   * Get user credentials
   */
  async getUserCredentials(): Promise<any> {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.USER_CREDENTIALS);
  },

  /**
   * Store user profile
   */
  async storeUserProfile(profile: any): Promise<void> {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.USER_PROFILE, profile, {
      encrypt: true,
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    });
  },

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    return await secureStorage.getItem(SECURE_STORAGE_KEYS.USER_PROFILE);
  },

  /**
   * Clear all authentication data
   */
  async clearAuthData(): Promise<void> {
    await Promise.all([
      secureStorage.removeItem(SECURE_STORAGE_KEYS.AUTH_TOKEN),
      secureStorage.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN),
      secureStorage.removeItem(SECURE_STORAGE_KEYS.USER_CREDENTIALS),
      secureStorage.removeItem(SECURE_STORAGE_KEYS.SESSION_DATA),
    ]);
  },
};

export default secureStorage;