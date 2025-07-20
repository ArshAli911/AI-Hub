import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Security configuration
export const SECURITY_CONFIG = {
  ENCRYPTION: {
    ALGORITHM: 'AES',
    KEY_SIZE: 256,
    IV_SIZE: 16,
    ITERATIONS: 10000,
  },
  VALIDATION: {
    MAX_STRING_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000,
    MAX_OBJECT_DEPTH: 10,
  },
  RATE_LIMITING: {
    DEFAULT_WINDOW: 60000, // 1 minute
    DEFAULT_MAX_REQUESTS: 100,
    BURST_WINDOW: 1000, // 1 second
    BURST_MAX_REQUESTS: 10,
  },
} as const;

// Input validation types
export interface ValidationRule {
  type: 'required' | 'email' | 'password' | 'phone' | 'url' | 'custom';
  message?: string;
  validator?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
}

export interface SecurityValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errors: string[];
  warnings: string[];
}

// Encryption utilities
export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: string | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption service with master key
   */
  async initialize(): Promise<void> {
    try {
      // Try to get existing master key
      this.masterKey = await this.getStoredMasterKey();
      
      if (!this.masterKey) {
        // Generate new master key
        this.masterKey = this.generateMasterKey();
        await this.storeMasterKey(this.masterKey);
      }
      
      logger.info('EncryptionService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EncryptionService', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Generate a secure master key
   */
  private generateMasterKey(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return randomBytes.toString(CryptoJS.enc.Hex);
  }

  /**
   * Store master key securely
   */
  private async storeMasterKey(key: string): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync('master_encryption_key', key);
    } else {
      // For web, use a more secure storage method in production
      localStorage.setItem('master_encryption_key', key);
    }
  }

  /**
   * Retrieve stored master key
   */
  private async getStoredMasterKey(): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        return await SecureStore.getItemAsync('master_encryption_key');
      } else {
        return localStorage.getItem('master_encryption_key');
      }
    } catch (error) {
      logger.error('Failed to retrieve master key', error);
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string, customKey?: string): string {
    try {
      const key = customKey || this.masterKey;
      if (!key) {
        throw new Error('Encryption key not available');
      }

      const iv = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.ENCRYPTION.IV_SIZE);
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Combine IV and encrypted data
      const combined = iv.concat(encrypted.ciphertext);
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      logger.error('Encryption failed', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, customKey?: string): string {
    try {
      const key = customKey || this.masterKey;
      if (!key) {
        throw new Error('Decryption key not available');
      }

      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      const iv = CryptoJS.lib.WordArray.create(
        combined.words.slice(0, SECURITY_CONFIG.ENCRYPTION.IV_SIZE / 4)
      );
      const ciphertext = CryptoJS.lib.WordArray.create(
        combined.words.slice(SECURITY_CONFIG.ENCRYPTION.IV_SIZE / 4)
      );

      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext } as any,
        key,
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error('Decryption failed', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Generate secure hash
   */
  hash(data: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(32).toString();
    return CryptoJS.PBKDF2(data, saltToUse, {
      keySize: 256 / 32,
      iterations: SECURITY_CONFIG.ENCRYPTION.ITERATIONS,
    }).toString();
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }
}

// Input validation and sanitization
export class InputValidator {
  private static xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];

  private static sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+))/gi,
  ];

  /**
   * Comprehensive input validation
   */
  static validate(
    value: any,
    rules: ValidationRule[],
    context?: string
  ): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      sanitizedValue: value,
      errors: [],
      warnings: [],
    };

    try {
      // Basic type and size validation
      if (!this.validateBasicConstraints(value, result)) {
        return result;
      }

      // Apply validation rules
      for (const rule of rules) {
        if (!this.applyValidationRule(value, rule, result)) {
          result.isValid = false;
        }
      }

      // Security-specific validations
      this.validateSecurity(value, result);

      // Sanitize the value
      result.sanitizedValue = this.sanitizeInput(value);

      logger.debug('Input validation completed', {
        context,
        isValid: result.isValid,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
      });

    } catch (error) {
      logger.error('Input validation failed', error);
      result.isValid = false;
      result.errors.push('Validation process failed');
    }

    return result;
  }

  /**
   * Validate basic constraints (size, depth, etc.)
   */
  private static validateBasicConstraints(
    value: any,
    result: SecurityValidationResult
  ): boolean {
    // String length validation
    if (typeof value === 'string' && value.length > SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH) {
      result.errors.push(`Input too long (max ${SECURITY_CONFIG.VALIDATION.MAX_STRING_LENGTH} characters)`);
      return false;
    }

    // Array length validation
    if (Array.isArray(value) && value.length > SECURITY_CONFIG.VALIDATION.MAX_ARRAY_LENGTH) {
      result.errors.push(`Array too long (max ${SECURITY_CONFIG.VALIDATION.MAX_ARRAY_LENGTH} items)`);
      return false;
    }

    // Object depth validation
    if (typeof value === 'object' && value !== null) {
      const depth = this.getObjectDepth(value);
      if (depth > SECURITY_CONFIG.VALIDATION.MAX_OBJECT_DEPTH) {
        result.errors.push(`Object too deep (max ${SECURITY_CONFIG.VALIDATION.MAX_OBJECT_DEPTH} levels)`);
        return false;
      }
    }

    return true;
  }

  /**
   * Apply individual validation rule
   */
  private static applyValidationRule(
    value: any,
    rule: ValidationRule,
    result: SecurityValidationResult
  ): boolean {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          result.errors.push(rule.message || 'This field is required');
          return false;
        }
        break;

      case 'email':
        if (typeof value === 'string' && !this.isValidEmail(value)) {
          result.errors.push(rule.message || 'Invalid email format');
          return false;
        }
        break;

      case 'password':
        if (typeof value === 'string' && !this.isValidPassword(value)) {
          result.errors.push(rule.message || 'Password does not meet security requirements');
          return false;
        }
        break;

      case 'phone':
        if (typeof value === 'string' && !this.isValidPhone(value)) {
          result.errors.push(rule.message || 'Invalid phone number format');
          return false;
        }
        break;

      case 'url':
        if (typeof value === 'string' && !this.isValidUrl(value)) {
          result.errors.push(rule.message || 'Invalid URL format');
          return false;
        }
        break;

      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          result.errors.push(rule.message || 'Custom validation failed');
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Security-specific validations
   */
  private static validateSecurity(
    value: any,
    result: SecurityValidationResult
  ): void {
    if (typeof value !== 'string') return;

    // XSS detection
    for (const pattern of this.xssPatterns) {
      if (pattern.test(value)) {
        result.errors.push('Potentially malicious content detected');
        result.warnings.push('XSS pattern detected');
        break;
      }
    }

    // SQL injection detection
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(value)) {
        result.warnings.push('SQL injection pattern detected');
        break;
      }
    }

    // Path traversal detection
    if (value.includes('../') || value.includes('..\\')) {
      result.warnings.push('Path traversal pattern detected');
    }

    // Command injection detection
    if (/[;&|`$(){}[\]<>]/.test(value)) {
      result.warnings.push('Command injection characters detected');
    }
  }

  /**
   * Sanitize input to remove potentially harmful content
   */
  private static sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      // Remove XSS patterns
      let sanitized = value;
      for (const pattern of this.xssPatterns) {
        sanitized = sanitized.replace(pattern, '');
      }

      // Encode HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

      // Remove null bytes
      sanitized = sanitized.replace(/\0/g, '');

      return sanitized.trim();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeInput(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeInput(val);
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Password validation
   */
  private static isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password) && password.length <= 128;
  }

  /**
   * Phone validation
   */
  private static isValidPhone(phone: string): boolean {
    // International phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(digitsOnly) && digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  /**
   * URL validation
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Get object depth
   */
  private static getObjectDepth(obj: any, depth: number = 0): number {
    if (depth > SECURITY_CONFIG.VALIDATION.MAX_OBJECT_DEPTH) {
      return depth;
    }

    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      const currentDepth = this.getObjectDepth(value, depth + 1);
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    return maxDepth;
  }
}

// Rate limiting
export class RateLimiter {
  private static instances: Map<string, RateLimiter> = new Map();
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly identifier: string;

  private constructor(identifier: string, windowMs: number, maxRequests: number) {
    this.identifier = identifier;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Get or create rate limiter instance
   */
  static getInstance(
    identifier: string,
    windowMs: number = SECURITY_CONFIG.RATE_LIMITING.DEFAULT_WINDOW,
    maxRequests: number = SECURITY_CONFIG.RATE_LIMITING.DEFAULT_MAX_REQUESTS
  ): RateLimiter {
    const key = `${identifier}_${windowMs}_${maxRequests}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new RateLimiter(identifier, windowMs, maxRequests));
    }

    return this.instances.get(key)!;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // Remove old requests outside the window
    const validRequests = clientRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', {
        clientId,
        identifier: this.identifier,
        requestCount: validRequests.length,
        maxRequests: this.maxRequests,
      });
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(clientId, validRequests);

    return true;
  }

  /**
   * Get remaining requests for client
   */
  getRemainingRequests(clientId: string): number {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Get time until reset
   */
  getTimeUntilReset(clientId: string): number {
    const clientRequests = this.requests.get(clientId) || [];
    if (clientRequests.length === 0) return 0;

    const oldestRequest = Math.min(...clientRequests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clear all requests for client
   */
  clearClient(clientId: string): void {
    this.requests.delete(clientId);
  }

  /**
   * Clear all requests
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Security headers utility
export const SecurityHeaders = {
  /**
   * Get security headers for API requests
   */
  getApiHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  },

  /**
   * Get CORS headers
   */
  getCorsHeaders(allowedOrigins: string[] = []): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': allowedOrigins.length > 0 ? allowedOrigins.join(',') : '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  },

  /**
   * Validate request headers for security
   */
  validateRequestHeaders(headers: Record<string, string>): boolean {
    // Check for required security headers
    const requiredHeaders = ['user-agent', 'accept'];
    for (const header of requiredHeaders) {
      if (!headers[header.toLowerCase()]) {
        logger.warn('Missing required header', { header });
        return false;
      }
    }

    // Check for suspicious headers
    const suspiciousPatterns = [
      /x-forwarded-for.*[,;]/i, // Multiple IPs in X-Forwarded-For
      /user-agent.*bot|crawler|spider/i, // Bot user agents
    ];

    for (const [key, value] of Object.entries(headers)) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(`${key}: ${value}`)) {
          logger.warn('Suspicious header detected', { key, value });
          return false;
        }
      }
    }

    return true;
  },
};

// Initialize encryption service
export const encryptionService = EncryptionService.getInstance();

// Export utilities
export { InputValidator, RateLimiter, SecurityHeaders };
export default {
  encryptionService,
  InputValidator,
  RateLimiter,
  SecurityHeaders,
  SECURITY_CONFIG,
};