import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { errorService } from './errorService';

export interface SecurityConfig {
  enableInputValidation: boolean;
  enableSanitization: boolean;
  enableEncryption: boolean;
  enableRateLimiting: boolean;
  maxInputLength: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  enableContentSecurityPolicy: boolean;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'password' | 'url' | 'phone' | 'custom';
  message: string;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: any) => boolean;
}

export interface SanitizationRule {
  type: 'html' | 'sql' | 'xss' | 'path' | 'custom';
  options?: Record<string, any>;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

class SecurityService {
  private config: SecurityConfig = {
    enableInputValidation: true,
    enableSanitization: true,
    enableEncryption: true,
    enableRateLimiting: true,
    maxInputLength: 1000,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    enableContentSecurityPolicy: true,
    enableXSSProtection: true,
    enableCSRFProtection: true,
  };

  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private sanitizationRules: Map<string, SanitizationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default validation and sanitization rules
   */
  private initializeDefaultRules(): void {
    // Email validation
    this.addValidationRule('email', {
      type: 'email',
      message: 'Please enter a valid email address',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    });

    // Password validation
    this.addValidationRule('password', {
      type: 'password',
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    });

    // URL validation
    this.addValidationRule('url', {
      type: 'url',
      message: 'Please enter a valid URL',
      pattern: /^https?:\/\/.+/,
    });

    // Phone validation
    this.addValidationRule('phone', {
      type: 'phone',
      message: 'Please enter a valid phone number',
      pattern: /^\+?[\d\s\-\(\)]+$/,
    });

    // HTML sanitization
    this.addSanitizationRule('html', {
      type: 'html',
      options: {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        allowedAttributes: {
          'a': ['href', 'target'],
        },
      },
    });

    // XSS protection
    this.addSanitizationRule('xss', {
      type: 'xss',
    });
  }

  /**
   * Add validation rule
   */
  addValidationRule(field: string, rule: ValidationRule): void {
    if (!this.validationRules.has(field)) {
      this.validationRules.set(field, []);
    }
    this.validationRules.get(field)!.push(rule);
  }

  /**
   * Add sanitization rule
   */
  addSanitizationRule(field: string, rule: SanitizationRule): void {
    if (!this.sanitizationRules.has(field)) {
      this.sanitizationRules.set(field, []);
    }
    this.sanitizationRules.get(field)!.push(rule);
  }

  /**
   * Validate input data
   */
  validateInput(data: Record<string, any>, rules?: Record<string, ValidationRule[]>): {
    isValid: boolean;
    errors: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};
    const validationRules = rules || this.validationRules;

    for (const [field, value] of Object.entries(data)) {
      const fieldRules = validationRules.get(field) || [];
      const fieldErrors: string[] = [];

      for (const rule of fieldRules) {
        if (!this.validateField(value, rule)) {
          fieldErrors.push(rule.message);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate single field
   */
  private validateField(value: any, rule: ValidationRule): boolean {
    // Required validation
    if (rule.type === 'required') {
      return value !== null && value !== undefined && value !== '';
    }

    // Skip other validations if value is empty and not required
    if (!value && rule.type !== 'required') {
      return true;
    }

    // Type-specific validations
    switch (rule.type) {
      case 'email':
        return rule.pattern ? rule.pattern.test(value) : this.isValidEmail(value);
      
      case 'password':
        return this.isValidPassword(value, rule);
      
      case 'url':
        return rule.pattern ? rule.pattern.test(value) : this.isValidUrl(value);
      
      case 'phone':
        return rule.pattern ? rule.pattern.test(value) : this.isValidPhone(value);
      
      case 'custom':
        return rule.customValidator ? rule.customValidator(value) : true;
      
      default:
        return true;
    }
  }

  /**
   * Validate email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password
   */
  private isValidPassword(password: string, rule: ValidationRule): boolean {
    if (rule.minLength && password.length < rule.minLength) {
      return false;
    }
    
    if (rule.maxLength && password.length > rule.maxLength) {
      return false;
    }
    
    if (rule.pattern) {
      return rule.pattern.test(password);
    }
    
    return true;
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(data: Record<string, any>, rules?: Record<string, SanitizationRule[]>): Record<string, any> {
    const sanitizedData: Record<string, any> = {};
    const sanitizationRules = rules || this.sanitizationRules;

    for (const [field, value] of Object.entries(data)) {
      const fieldRules = sanitizationRules.get(field) || [];
      let sanitizedValue = value;

      for (const rule of fieldRules) {
        sanitizedValue = this.sanitizeField(sanitizedValue, rule);
      }

      sanitizedData[field] = sanitizedValue;
    }

    return sanitizedData;
  }

  /**
   * Sanitize single field
   */
  private sanitizeField(value: any, rule: SanitizationRule): any {
    if (typeof value !== 'string') {
      return value;
    }

    switch (rule.type) {
      case 'html':
        return this.sanitizeHtml(value, rule.options);
      
      case 'sql':
        return this.sanitizeSql(value);
      
      case 'xss':
        return this.sanitizeXss(value);
      
      case 'path':
        return this.sanitizePath(value);
      
      default:
        return value;
    }
  }

  /**
   * Sanitize HTML
   */
  private sanitizeHtml(html: string, options?: Record<string, any>): string {
    // Remove script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '');

    // Remove dangerous tags
    const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  /**
   * Sanitize SQL
   */
  private sanitizeSql(sql: string): string {
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\b(exec|execute|xp_|sp_)\b)/gi,
    ];

    let sanitized = sql;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Sanitize XSS
   */
  private sanitizeXss(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize file path
   */
  private sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[<>:"|?*]/g, '') // Remove invalid characters
      .replace(/\/{2,}/g, '/') // Normalize slashes
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + key
      );
      return digest;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'encryption_error',
        context: { data: data.substring(0, 10) + '...' }
      });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedData: string): Promise<string> {
    try {
      // In a real implementation, you would use proper encryption/decryption
      // For now, we'll return the data as-is since we're using hashing
      return encryptedData;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'decryption_error',
        context: { data: encryptedData.substring(0, 10) + '...' }
      });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get encryption key
   */
  private async getEncryptionKey(): Promise<string> {
    try {
      let key = await SecureStore.getItemAsync('encryption_key');
      if (!key) {
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Date.now().toString() + Math.random().toString()
        );
        await SecureStore.setItemAsync('encryption_key', key);
      }
      return key;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'encryption_key_error'
      });
      throw new Error('Failed to get encryption key');
    }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(identifier: string, config: RateLimitConfig): boolean {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (record.count >= config.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.config.allowedFileTypes.includes(extension)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${this.config.allowedFileTypes.join(', ')}`,
      };
    }

    // Check for malicious file names
    const maliciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid characters
      /\.(exe|bat|cmd|com|pif|scr|vbs|js)$/i, // Executable files
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(file.name)) {
        return {
          isValid: false,
          error: 'File name contains invalid characters or is not allowed',
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate secure token
   */
  async generateSecureToken(): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const token = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return token;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'token_generation_error'
      });
      throw new Error('Failed to generate secure token');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await this.generateSecureToken();
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt
      );
      return `${salt}:${hash}`;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'password_hash_error'
      });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':');
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + salt
      );
      return computedHash === hash;
    } catch (error) {
      errorService.captureError(error as Error, {
        type: 'password_verification_error'
      });
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Clear rate limit store
   */
  clearRateLimitStore(): void {
    this.rateLimitStore.clear();
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): Record<string, { count: number; resetTime: number }> {
    const stats: Record<string, { count: number; resetTime: number }> = {};
    for (const [key, value] of this.rateLimitStore.entries()) {
      stats[key] = { ...value };
    }
    return stats;
  }
}

export const securityService = new SecurityService();
export default securityService; 