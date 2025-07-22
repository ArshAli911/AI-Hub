import crypto from 'crypto';
import { firestore } from '../config/firebaseAdmin';
import logger from './loggerService';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId: string;
  permissions: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  usage: {
    totalRequests: number;
    lastUsed: Date | null;
    requestsToday: number;
    requestsThisHour: number;
    requestsThisMinute: number;
  };
  restrictions: {
    allowedIPs?: string[];
    allowedDomains?: string[];
    allowedUserAgents?: string[];
  };
  status: 'active' | 'inactive' | 'revoked';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyUsage {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export class ApiKeyService {
  private readonly keyPrefix = 'ak_';
  private readonly keyLength = 32;

  /**
   * Generate a new API key
   */
  async generateApiKey(
    userId: string,
    name: string,
    permissions: string[] = [],
    options: {
      rateLimit?: Partial<ApiKey['rateLimit']>;
      restrictions?: ApiKey['restrictions'];
      expiresAt?: Date;
    } = {}
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    try {
      // Generate random key
      const plainKey = this.keyPrefix + crypto.randomBytes(this.keyLength).toString('hex');
      const hashedKey = this.hashKey(plainKey);

      // Create API key document
      const apiKeyData: Omit<ApiKey, 'id'> = {
        name,
        key: plainKey.substring(0, 8) + '...' + plainKey.substring(plainKey.length - 4), // Masked key for display
        hashedKey,
        userId,
        permissions,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          ...options.rateLimit
        },
        usage: {
          totalRequests: 0,
          lastUsed: null,
          requestsToday: 0,
          requestsThisHour: 0,
          requestsThisMinute: 0
        },
        restrictions: options.restrictions || {},
        status: 'active',
        expiresAt: options.expiresAt || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      const docRef = await firestore.collection('apiKeys').add(apiKeyData);

      const apiKey: ApiKey = {
        id: docRef.id,
        ...apiKeyData
      };

      logger.info(`API key generated for user ${userId}: ${apiKey.id}`);

      return { apiKey, plainKey };
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw new Error('Failed to generate API key');
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    try {
      if (!plainKey.startsWith(this.keyPrefix)) {
        return null;
      }

      const hashedKey = this.hashKey(plainKey);

      // Find API key by hashed key
      const apiKeySnapshot = await firestore
        .collection('apiKeys')
        .where('hashedKey', '==', hashedKey)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (apiKeySnapshot.empty) {
        return null;
      }

      const apiKeyDoc = apiKeySnapshot.docs[0];
      const apiKey = { id: apiKeyDoc.id, ...apiKeyDoc.data() } as ApiKey;

      // Check if key is expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        await this.revokeApiKey(apiKey.id, 'expired');
        return null;
      }

      return apiKey;
    } catch (error) {
      logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(apiKey: ApiKey): Promise<{ allowed: boolean; resetTime?: Date }> {
    try {
      const now = new Date();
      const currentMinute = Math.floor(now.getTime() / (60 * 1000));
      const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
      const currentDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));

      // Get current usage
      const usage = apiKey.usage;
      const limits = apiKey.rateLimit;

      // Check minute limit
      if (usage.requestsThisMinute >= limits.requestsPerMinute) {
        return {
          allowed: false,
          resetTime: new Date((currentMinute + 1) * 60 * 1000)
        };
      }

      // Check hour limit
      if (usage.requestsThisHour >= limits.requestsPerHour) {
        return {
          allowed: false,
          resetTime: new Date((currentHour + 1) * 60 * 60 * 1000)
        };
      }

      // Check day limit
      if (usage.requestsToday >= limits.requestsPerDay) {
        return {
          allowed: false,
          resetTime: new Date((currentDay + 1) * 24 * 60 * 60 * 1000)
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return { allowed: false };
    }
  }

  /**
   * Check IP restrictions
   */
  checkIPRestriction(apiKey: ApiKey, ipAddress: string): boolean {
    const allowedIPs = apiKey.restrictions.allowedIPs;
    
    if (!allowedIPs || allowedIPs.length === 0) {
      return true; // No restrictions
    }

    return allowedIPs.some(allowedIP => {
      // Support CIDR notation and exact matches
      if (allowedIP.includes('/')) {
        return this.isIPInCIDR(ipAddress, allowedIP);
      } else {
        return ipAddress === allowedIP;
      }
    });
  }

  /**
   * Check domain restrictions
   */
  checkDomainRestriction(apiKey: ApiKey, origin: string): boolean {
    const allowedDomains = apiKey.restrictions.allowedDomains;
    
    if (!allowedDomains || allowedDomains.length === 0) {
      return true; // No restrictions
    }

    if (!origin) {
      return false;
    }

    try {
      const url = new URL(origin);
      const domain = url.hostname;

      return allowedDomains.some(allowedDomain => {
        // Support wildcard domains
        if (allowedDomain.startsWith('*.')) {
          const baseDomain = allowedDomain.substring(2);
          return domain.endsWith(baseDomain);
        } else {
          return domain === allowedDomain;
        }
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Check user agent restrictions
   */
  checkUserAgentRestriction(apiKey: ApiKey, userAgent: string): boolean {
    const allowedUserAgents = apiKey.restrictions.allowedUserAgents;
    
    if (!allowedUserAgents || allowedUserAgents.length === 0) {
      return true; // No restrictions
    }

    if (!userAgent) {
      return false;
    }

    return allowedUserAgents.some(allowedUA => {
      // Support partial matches
      return userAgent.toLowerCase().includes(allowedUA.toLowerCase());
    });
  }

  /**
   * Record API key usage
   */
  async recordUsage(
    apiKey: ApiKey,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const now = new Date();
      const currentMinute = Math.floor(now.getTime() / (60 * 1000));
      const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
      const currentDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));

      // Update API key usage
      const apiKeyRef = firestore.collection('apiKeys').doc(apiKey.id);
      
      await apiKeyRef.update({
        'usage.totalRequests': firestore.FieldValue.increment(1),
        'usage.lastUsed': now,
        'usage.requestsToday': firestore.FieldValue.increment(1),
        'usage.requestsThisHour': firestore.FieldValue.increment(1),
        'usage.requestsThisMinute': firestore.FieldValue.increment(1),
        updatedAt: now
      });

      // Record detailed usage
      const usageData: ApiKeyUsage = {
        apiKeyId: apiKey.id,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
        timestamp: now
      };

      await firestore.collection('apiKeyUsage').add(usageData);

      // Reset counters if needed
      await this.resetCountersIfNeeded(apiKey.id, currentMinute, currentHour, currentDay);
    } catch (error) {
      logger.error('Error recording API key usage:', error);
    }
  }

  /**
   * Get API keys for user
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const apiKeysSnapshot = await firestore
        .collection('apiKeys')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return apiKeysSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApiKey[];
    } catch (error) {
      logger.error(`Error getting API keys for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get API key by ID
   */
  async getApiKey(apiKeyId: string): Promise<ApiKey | null> {
    try {
      const apiKeyDoc = await firestore.collection('apiKeys').doc(apiKeyId).get();
      
      if (!apiKeyDoc.exists) {
        return null;
      }

      return { id: apiKeyDoc.id, ...apiKeyDoc.data() } as ApiKey;
    } catch (error) {
      logger.error(`Error getting API key ${apiKeyId}:`, error);
      return null;
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(
    apiKeyId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rateLimit' | 'restrictions' | 'status' | 'expiresAt'>>
  ): Promise<void> {
    try {
      await firestore.collection('apiKeys').doc(apiKeyId).update({
        ...updates,
        updatedAt: new Date()
      });

      logger.info(`API key ${apiKeyId} updated`);
    } catch (error) {
      logger.error(`Error updating API key ${apiKeyId}:`, error);
      throw new Error('Failed to update API key');
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string, reason: string = 'manual'): Promise<void> {
    try {
      await firestore.collection('apiKeys').doc(apiKeyId).update({
        status: 'revoked',
        revokedAt: new Date(),
        revokeReason: reason,
        updatedAt: new Date()
      });

      logger.info(`API key ${apiKeyId} revoked: ${reason}`);
    } catch (error) {
      logger.error(`Error revoking API key ${apiKeyId}:`, error);
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStatistics(
    apiKeyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Record<string, number>;
  }> {
    try {
      const usageSnapshot = await firestore
        .collection('apiKeyUsage')
        .where('apiKeyId', '==', apiKeyId)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .get();

      const usage = usageSnapshot.docs.map(doc => doc.data() as ApiKeyUsage);

      const stats = {
        totalRequests: usage.length,
        successfulRequests: usage.filter(u => u.statusCode >= 200 && u.statusCode < 400).length,
        errorRequests: usage.filter(u => u.statusCode >= 400).length,
        averageResponseTime: usage.reduce((sum, u) => sum + u.responseTime, 0) / usage.length || 0,
        requestsByEndpoint: {} as Record<string, number>,
        requestsByDay: {} as Record<string, number>
      };

      // Group by endpoint
      usage.forEach(u => {
        stats.requestsByEndpoint[u.endpoint] = (stats.requestsByEndpoint[u.endpoint] || 0) + 1;
      });

      // Group by day
      usage.forEach(u => {
        const day = u.timestamp.toISOString().split('T')[0];
        stats.requestsByDay[day] = (stats.requestsByDay[day] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error(`Error getting usage statistics for API key ${apiKeyId}:`, error);
      throw new Error('Failed to get usage statistics');
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<void> {
    try {
      const now = new Date();
      
      const expiredKeysSnapshot = await firestore
        .collection('apiKeys')
        .where('expiresAt', '<', now)
        .where('status', '==', 'active')
        .get();

      if (expiredKeysSnapshot.empty) {
        return;
      }

      const batch = firestore.batch();
      expiredKeysSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'revoked',
          revokedAt: now,
          revokeReason: 'expired',
          updatedAt: now
        });
      });

      await batch.commit();
      
      logger.info(`Cleaned up ${expiredKeysSnapshot.size} expired API keys`);
    } catch (error) {
      logger.error('Error cleaning up expired API keys:', error);
    }
  }

  /**
   * Hash API key
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    // This is a simplified implementation
    // In production, use a proper CIDR library
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength);
    
    // Convert IPs to integers for comparison
    const ipInt = this.ipToInt(ip);
    const networkInt = this.ipToInt(network);
    
    // Create subnet mask
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    
    return (ipInt & mask) === (networkInt & mask);
  }

  /**
   * Convert IP address to integer
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Reset usage counters if needed
   */
  private async resetCountersIfNeeded(
    apiKeyId: string,
    currentMinute: number,
    currentHour: number,
    currentDay: number
  ): Promise<void> {
    try {
      const apiKeyRef = firestore.collection('apiKeys').doc(apiKeyId);
      const apiKeyDoc = await apiKeyRef.get();
      
      if (!apiKeyDoc.exists) {
        return;
      }

      const apiKey = apiKeyDoc.data() as ApiKey;
      const lastUsed = apiKey.usage.lastUsed;
      
      if (!lastUsed) {
        return;
      }

      const lastMinute = Math.floor(lastUsed.getTime() / (60 * 1000));
      const lastHour = Math.floor(lastUsed.getTime() / (60 * 60 * 1000));
      const lastDay = Math.floor(lastUsed.getTime() / (24 * 60 * 60 * 1000));

      const updates: any = {};

      // Reset minute counter
      if (currentMinute > lastMinute) {
        updates['usage.requestsThisMinute'] = 0;
      }

      // Reset hour counter
      if (currentHour > lastHour) {
        updates['usage.requestsThisHour'] = 0;
      }

      // Reset day counter
      if (currentDay > lastDay) {
        updates['usage.requestsToday'] = 0;
      }

      if (Object.keys(updates).length > 0) {
        await apiKeyRef.update(updates);
      }
    } catch (error) {
      logger.error('Error resetting usage counters:', error);
    }
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;