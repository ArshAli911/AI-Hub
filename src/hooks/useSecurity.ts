import { useState, useEffect, useCallback } from 'react';
import { InputValidator, RateLimiter, encryptionService } from '../utils/security';
import { secureStorage } from '../services/secureStorage';
import { logger } from '../utils/logger';

export interface SecurityState {
  isSecureStorageReady: boolean;
  encryptionReady: boolean;
  deviceId: string | null;
  securityLevel: 'low' | 'medium' | 'high';
}

export interface UseSecurityReturn extends SecurityState {
  validateInput: (data: any, rules: any[], context?: string) => Promise<{ isValid: boolean; sanitizedValue: any; errors: string[] }>;
  encryptData: (data: string) => string;
  decryptData: (encryptedData: string) => string;
  checkRateLimit: (identifier: string) => boolean;
  generateSecureToken: (length?: number) => string;
  hashData: (data: string, salt?: string) => string;
}

export const useSecurity = (): UseSecurityReturn => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecureStorageReady: false,
    encryptionReady: false,
    deviceId: null,
    securityLevel: 'medium',
  });

  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {
      // Initialize encryption service
      await encryptionService.initialize();
      
      // Initialize secure storage
      await secureStorage.initialize();
      
      // Get or generate device ID
      let deviceId = await secureStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = encryptionService.generateToken(32);
        await secureStorage.setItem('device_id', deviceId, { encrypt: false });
      }

      setSecurityState({
        isSecureStorageReady: true,
        encryptionReady: true,
        deviceId,
        securityLevel: 'high',
      });

      logger.info('Security services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize security services', error);
      setSecurityState(prev => ({
        ...prev,
        securityLevel: 'low',
      }));
    }
  };

  const validateInput = useCallback(async (
    data: any,
    rules: any[],
    context?: string
  ) => {
    try {
      return InputValidator.validate(data, rules, context);
    } catch (error) {
      logger.error('Input validation failed', error);
      return {
        isValid: false,
        sanitizedValue: data,
        errors: ['Validation failed'],
      };
    }
  }, []);

  const encryptData = useCallback((data: string): string => {
    try {
      return encryptionService.encrypt(data);
    } catch (error) {
      logger.error('Data encryption failed', error);
      throw error;
    }
  }, []);

  const decryptData = useCallback((encryptedData: string): string => {
    try {
      return encryptionService.decrypt(encryptedData);
    } catch (error) {
      logger.error('Data decryption failed', error);
      throw error;
    }
  }, []);

  const checkRateLimit = useCallback((identifier: string): boolean => {
    try {
      const rateLimiter = RateLimiter.getInstance(identifier);
      return rateLimiter.isAllowed(securityState.deviceId || 'unknown');
    } catch (error) {
      logger.error('Rate limit check failed', error);
      return false;
    }
  }, [securityState.deviceId]);

  const generateSecureToken = useCallback((length: number = 32): string => {
    return encryptionService.generateToken(length);
  }, []);

  const hashData = useCallback((data: string, salt?: string): string => {
    return encryptionService.hash(data, salt);
  }, []);

  return {
    ...securityState,
    validateInput,
    encryptData,
    decryptData,
    checkRateLimit,
    generateSecureToken,
    hashData,
  };
};

export default useSecurity;