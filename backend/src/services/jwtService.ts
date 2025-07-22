import jwt from 'jsonwebtoken';
import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';

export interface JWTPayload {
  uid: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  uid: string;
  sessionId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'ai-companion-app',
      audience: 'ai-companion-users'
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'ai-companion-app',
      audience: 'ai-companion-users'
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
    uid: string,
    email: string,
    role: string,
    permissions: string[]
  ): Promise<TokenPair> {
    try {
      // Generate session ID
      const sessionId = this.generateSessionId();
      
      // Get user's current token version
      const userDoc = await firestore.collection('users').doc(uid).get();
      const userData = userDoc.data();
      const tokenVersion = userData?.tokenVersion || 0;

      // Generate tokens
      const accessToken = this.generateAccessToken({
        uid,
        email,
        role,
        permissions,
        sessionId
      });

      const refreshToken = this.generateRefreshToken({
        uid,
        sessionId,
        tokenVersion
      });

      // Store session in database
      await this.storeSession(uid, sessionId, {
        accessToken,
        refreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.getExpiryTime(this.refreshTokenExpiry)),
        userAgent: '', // Will be set by middleware
        ipAddress: '', // Will be set by middleware
        isActive: true
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpiryTime(this.accessTokenExpiry),
        refreshExpiresIn: this.getExpiryTime(this.refreshTokenExpiry)
      };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'ai-companion-app',
        audience: 'ai-companion-users'
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid access token');
      } else {
        logger.error('Error verifying access token:', error);
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'ai-companion-app',
        audience: 'ai-companion-users'
      }) as RefreshTokenPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid refresh token');
      } else {
        logger.error('Error verifying refresh token:', error);
      }
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);
      if (!payload) {
        return null;
      }

      // Check if session exists and is active
      const session = await this.getSession(payload.uid, payload.sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      // Check token version
      const userDoc = await firestore.collection('users').doc(payload.uid).get();
      const userData = userDoc.data();
      
      if (!userData || userData.tokenVersion !== payload.tokenVersion) {
        // Token version mismatch, invalidate session
        await this.invalidateSession(payload.uid, payload.sessionId);
        return null;
      }

      // Get user role and permissions
      const role = userData.role || 'user';
      const permissions = userData.permissions || [];

      // Generate new token pair
      return await this.generateTokenPair(
        payload.uid,
        userData.email,
        role,
        permissions
      );
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(uid: string, sessionId: string): Promise<void> {
    try {
      await firestore
        .collection('userSessions')
        .doc(`${uid}_${sessionId}`)
        .update({
          isActive: false,
          invalidatedAt: new Date()
        });
    } catch (error) {
      logger.error('Error invalidating session:', error);
    }
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(uid: string): Promise<void> {
    try {
      // Increment token version to invalidate all existing tokens
      await firestore.collection('users').doc(uid).update({
        tokenVersion: firestore.FieldValue.increment(1)
      });

      // Mark all sessions as inactive
      const sessionsSnapshot = await firestore
        .collection('userSessions')
        .where('uid', '==', uid)
        .where('isActive', '==', true)
        .get();

      const batch = firestore.batch();
      sessionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          invalidatedAt: new Date()
        });
      });

      await batch.commit();
    } catch (error) {
      logger.error('Error invalidating all user sessions:', error);
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(uid: string): Promise<any[]> {
    try {
      const sessionsSnapshot = await firestore
        .collection('userSessions')
        .where('uid', '==', uid)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      const expiredSessionsSnapshot = await firestore
        .collection('userSessions')
        .where('expiresAt', '<', now)
        .get();

      if (expiredSessionsSnapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      expiredSessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      logger.info(`Cleaned up ${expiredSessionsSnapshot.size} expired sessions`);
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Store session in database
   */
  private async storeSession(
    uid: string,
    sessionId: string,
    sessionData: any
  ): Promise<void> {
    try {
      await firestore
        .collection('userSessions')
        .doc(`${uid}_${sessionId}`)
        .set({
          uid,
          sessionId,
          ...sessionData
        });
    } catch (error) {
      logger.error('Error storing session:', error);
      throw error;
    }
  }

  /**
   * Get session from database
   */
  private async getSession(uid: string, sessionId: string): Promise<any | null> {
    try {
      const sessionDoc = await firestore
        .collection('userSessions')
        .doc(`${uid}_${sessionId}`)
        .get();

      return sessionDoc.exists ? sessionDoc.data() : null;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           Date.now().toString(36);
  }

  /**
   * Get expiry time in milliseconds
   */
  private getExpiryTime(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000; // Default 15 minutes
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      logger.error('Error getting token expiry:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    return expiry ? expiry < new Date() : true;
  }
}

export const jwtService = new JWTService();
export default jwtService;