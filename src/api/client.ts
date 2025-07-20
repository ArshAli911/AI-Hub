import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import firebaseAuthService from '../services/firebaseService';
import { Platform } from 'react-native';
import { appConfig } from '../config/app';
import { RateLimiter, SecurityHeaders, InputValidator } from '../utils/security';
import { logger } from '../utils/logger';
import { secureStorage } from '../services/secureStorage';

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RequestConfig extends AxiosRequestConfig {
  retry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
  }> = [];
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private deviceId: string | null = null;

  constructor() {
    this.baseURL = appConfig.api.baseUrl;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: appConfig.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `AI-Hub-App/${Platform.OS}`,
        ...SecurityHeaders.getApiHeaders(),
      }
    });

    this.setupInterceptors();
    this.initializeDeviceId();
  }

  /**
   * Initialize device ID for rate limiting
   */
  private async initializeDeviceId(): Promise<void> {
    try {
      this.deviceId = await secureStorage.getItem('device_id');
      if (!this.deviceId) {
        this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await secureStorage.setItem('device_id', this.deviceId, { encrypt: false });
      }
    } catch (error) {
      logger.error('Failed to initialize device ID', error);
      this.deviceId = `temp_${Date.now()}`;
    }
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Security validation
        await this.validateRequest(config);

        // Rate limiting check
        await this.checkRateLimit(config);

        // Add auth token
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add security headers
        config.headers = {
          ...config.headers,
          'X-Request-ID': this.generateRequestId(),
          'X-Device-ID': this.deviceId || 'unknown',
          'X-App-Version': '1.0.0',
          'X-Platform': Platform.OS,
          ...SecurityHeaders.getApiHeaders(),
        };

        // Input validation and sanitization
        if (config.data) {
          config.data = await this.validateAndSanitizeInput(config.data, config.url || '');
        }

        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as RequestConfig;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Force token refresh
            await firebaseAuthService.getIdToken(true);
            this.processQueue(null, null);
            
            // Retry original request
            const token = await this.getAuthToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(null, refreshError);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Process failed request queue
   */
  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      if (firebaseAuthService.isAuthenticated()) {
        return await firebaseAuthService.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (typeof data === 'object' && data !== null) {
        return {
          code: data.error || `HTTP_${status}`,
          message: data.message || `Request failed with status ${status}`,
          details: data
        };
      }

      return {
        code: `HTTP_${status}`,
        message: `Request failed with status ${status}`,
        details: data
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        details: error.request
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        details: error
      };
    }
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = unknown>(
    url: string,
    file: File | FormData,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const uploadConfig: RequestConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(progress);
          }
        }
      };

      const response = await this.client.post<ApiResponse<T>>(url, file, uploadConfig);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Download file
   */
  async downloadFile(
    url: string,
    filename?: string,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<Blob> {
    try {
      const downloadConfig: RequestConfig = {
        ...config,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress?.(progress);
          }
        }
      };

      const response = await this.client.get(url, downloadConfig);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Make request with retry logic
   */
  async requestWithRetry<T = unknown>(
    requestFn: () => Promise<ApiResponse<T>>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as ApiError;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          throw lastError;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: ApiError): boolean {
    const nonRetryableCodes = [
      'HTTP_400', 'HTTP_401', 'HTTP_403', 'HTTP_404', 'HTTP_422',
      'VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR'
    ];
    
    return nonRetryableCodes.includes(error.code);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set base URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.client.defaults.headers.common = {
      ...this.client.defaults.headers.common,
      ...headers
    };
  }

  /**
   * Clear default headers
   */
  clearDefaultHeaders(): void {
    this.client.defaults.headers.common = {};
  }

  /**
   * Validate request for security issues
   */
  private async validateRequest(config: AxiosRequestConfig): Promise<void> {
    // Validate URL
    if (config.url && !this.isValidUrl(config.url)) {
      throw new Error('Invalid request URL detected');
    }

    // Validate headers
    if (config.headers && !SecurityHeaders.validateRequestHeaders(config.headers as Record<string, string>)) {
      throw new Error('Suspicious request headers detected');
    }

    // Check for suspicious patterns in URL
    if (config.url && this.containsSuspiciousPatterns(config.url)) {
      logger.warn('Suspicious URL pattern detected', { url: config.url });
      throw new Error('Potentially malicious request detected');
    }
  }

  /**
   * Check rate limiting for request
   */
  private async checkRateLimit(config: AxiosRequestConfig): Promise<void> {
    if (!this.deviceId) return;

    const endpoint = this.getEndpointKey(config.url || '', config.method || 'GET');
    
    // Get or create rate limiter for this endpoint
    if (!this.rateLimiters.has(endpoint)) {
      // Different limits for different endpoint types
      const { windowMs, maxRequests } = this.getRateLimitConfig(endpoint);
      this.rateLimiters.set(endpoint, RateLimiter.getInstance(endpoint, windowMs, maxRequests));
    }

    const rateLimiter = this.rateLimiters.get(endpoint)!;
    
    if (!rateLimiter.isAllowed(this.deviceId)) {
      const timeUntilReset = rateLimiter.getTimeUntilReset(this.deviceId);
      const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`);
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).retryAfter = timeUntilReset;
      throw error;
    }
  }

  /**
   * Validate and sanitize input data
   */
  private async validateAndSanitizeInput(data: any, url: string): Promise<any> {
    try {
      // Define validation rules based on endpoint
      const rules = this.getValidationRules(url);
      
      // Validate input
      const result = InputValidator.validate(data, rules, url);
      
      if (!result.isValid) {
        logger.error('Input validation failed', {
          url,
          errors: result.errors,
          warnings: result.warnings,
        });
        throw new Error(`Input validation failed: ${result.errors.join(', ')}`);
      }

      // Log warnings but don't block request
      if (result.warnings.length > 0) {
        logger.warn('Input validation warnings', {
          url,
          warnings: result.warnings,
        });
      }

      return result.sanitizedValue;
    } catch (error) {
      logger.error('Input validation error', error, { url });
      throw error;
    }
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    // Check for relative URLs (should start with /)
    if (url.startsWith('/')) return true;
    
    // Check for absolute URLs
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Check for suspicious patterns in URL
   */
  private containsSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      /\.\./,                    // Path traversal
      /<script/i,                // XSS attempt
      /javascript:/i,            // JavaScript protocol
      /data:/i,                  // Data protocol
      /file:/i,                  // File protocol
      /[;&|`$(){}[\]<>]/,       // Command injection characters
      /%[0-9a-f]{2}/i,          // URL encoded suspicious characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Get endpoint key for rate limiting
   */
  private getEndpointKey(url: string, method: string): string {
    // Normalize URL by removing query parameters and IDs
    const normalizedUrl = url
      .split('?')[0]                    // Remove query params
      .replace(/\/\d+/g, '/:id')        // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid'); // Replace UUIDs
    
    return `${method.toUpperCase()}_${normalizedUrl}`;
  }

  /**
   * Get rate limit configuration for endpoint
   */
  private getRateLimitConfig(endpoint: string): { windowMs: number; maxRequests: number } {
    // Authentication endpoints - stricter limits
    if (endpoint.includes('auth') || endpoint.includes('login') || endpoint.includes('register')) {
      return { windowMs: 60000, maxRequests: 5 }; // 5 requests per minute
    }

    // File upload endpoints - moderate limits
    if (endpoint.includes('upload') || endpoint.includes('file')) {
      return { windowMs: 60000, maxRequests: 10 }; // 10 requests per minute
    }

    // Search endpoints - moderate limits
    if (endpoint.includes('search') || endpoint.includes('query')) {
      return { windowMs: 60000, maxRequests: 30 }; // 30 requests per minute
    }

    // POST/PUT/DELETE operations - moderate limits
    if (endpoint.startsWith('POST_') || endpoint.startsWith('PUT_') || endpoint.startsWith('DELETE_')) {
      return { windowMs: 60000, maxRequests: 50 }; // 50 requests per minute
    }

    // GET operations - generous limits
    return { windowMs: 60000, maxRequests: 100 }; // 100 requests per minute
  }

  /**
   * Get validation rules for endpoint
   */
  private getValidationRules(url: string): any[] {
    const rules: any[] = [];

    // Authentication endpoints
    if (url.includes('auth') || url.includes('login')) {
      rules.push(
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Invalid email format' },
        { type: 'required', message: 'Password is required' },
        { type: 'password', message: 'Password does not meet requirements' }
      );
    }

    // User profile endpoints
    if (url.includes('profile') || url.includes('user')) {
      rules.push(
        { type: 'required', message: 'Required field missing' }
      );
    }

    // File upload endpoints
    if (url.includes('upload')) {
      rules.push(
        { 
          type: 'custom', 
          validator: (data: any) => {
            // Validate file size, type, etc.
            return true; // Implement file validation logic
          },
          message: 'Invalid file upload data'
        }
      );
    }

    return rules;
  }
}

export const apiClient = new ApiClient();
export default apiClient; 