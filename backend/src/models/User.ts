import { firestore } from '../config/firebaseAdmin';
import { UserRole } from '../services/rbacService';
import logger from '../services/loggerService';

export interface User {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  role: UserRole;
  permissions: string[];
  customPermissions?: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isOnline: boolean;
  lastSeen: Date;
  presenceStatus?: 'online' | 'away' | 'busy' | 'offline';
  presenceActivity?: string;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      inApp: boolean;
      categories: {
        messages: boolean;
        sessions: boolean;
        marketplace: boolean;
        prototypes: boolean;
        system: boolean;
        marketing: boolean;
      };
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showOnlineStatus: boolean;
      allowDirectMessages: boolean;
      allowSessionRequests: boolean;
    };
    appearance: {
      theme: 'light' | 'dark' | 'auto';
      language: string;
      timezone: string;
    };
  };
  stats: {
    postsCount: number;
    commentsCount: number;
    prototypesCount: number;
    sessionsCount: number;
    likesReceived: number;
    followersCount: number;
    followingCount: number;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: Date;
    verificationBadge?: 'mentor' | 'expert' | 'contributor';
  };
  subscription?: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt?: Date;
    features: string[];
  };
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: User['socialLinks'];
  verification: User['verification'];
  stats: User['stats'];
  isOnline: boolean;
  lastSeen: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'post_created' | 'comment_created' | 'prototype_uploaded' | 'session_joined' | 'product_purchased';
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export class UserModel {
  private static collection = 'users';

  /**
   * Create a new user
   */
  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const now = new Date();
      const userDoc = {
        ...userData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.collection).add(userDoc);
      
      const user: User = {
        id: docRef.id,
        ...userDoc
      };

      logger.info(`User created: ${user.id}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await firestore.collection(this.collection).doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user by UID (Firebase Auth UID)
   */
  static async getUserByUID(uid: string): Promise<User | null> {
    try {
      const userSnapshot = await firestore
        .collection(this.collection)
        .where('uid', '==', uid)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        return null;
      }

      const userDoc = userSnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    } catch (error) {
      logger.error(`Error getting user by UID ${uid}:`, error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const userSnapshot = await firestore
        .collection(this.collection)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        return null;
      }

      const userDoc = userSnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await firestore.collection(this.collection).doc(userId).update(updateData);
      
      return await this.getUserById(userId);
    } catch (error) {
      logger.error(`Error updating user ${userId}:`, error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      await firestore.collection(this.collection).doc(userId).update({
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      logger.info(`User soft deleted: ${userId}`);
    } catch (error) {
      logger.error(`Error deleting user ${userId}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get users with pagination
   */
  static async getUsers(
    limit: number = 20,
    offset: number = 0,
    filters: {
      role?: UserRole;
      isOnline?: boolean;
      isVerified?: boolean;
      searchQuery?: string;
    } = {}
  ): Promise<{ users: User[]; total: number }> {
    try {
      let query = firestore.collection(this.collection).where('deletedAt', '==', null);

      // Apply filters
      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }

      if (filters.isOnline !== undefined) {
        query = query.where('isOnline', '==', filters.isOnline);
      }

      if (filters.isVerified !== undefined) {
        query = query.where('verification.isVerified', '==', filters.isVerified);
      }

      // Apply pagination
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Get total count
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      // Apply search filter if provided (client-side filtering for simplicity)
      let filteredUsers = users;
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredUsers = users.filter(user =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.bio?.toLowerCase().includes(searchLower)
        );
      }

      return { users: filteredUsers, total };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }

  /**
   * Get user profile (public information)
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        displayName: user.displayName,
        photoURL: user.photoURL,
        bio: user.bio,
        location: user.location,
        website: user.website,
        socialLinks: user.socialLinks,
        verification: user.verification,
        stats: user.stats,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      };
    } catch (error) {
      logger.error(`Error getting user profile ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user stats
   */
  static async updateUserStats(
    userId: string,
    statUpdates: Partial<User['stats']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      Object.entries(statUpdates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updates[`stats.${key}`] = firestore.FieldValue.increment(value);
        }
      });

      await firestore.collection(this.collection).doc(userId).update(updates);
    } catch (error) {
      logger.error(`Error updating user stats ${userId}:`, error);
      throw new Error('Failed to update user stats');
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<User['preferences']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      // Deep merge preferences
      Object.entries(preferences).forEach(([category, settings]) => {
        if (typeof settings === 'object') {
          Object.entries(settings).forEach(([key, value]) => {
            updates[`preferences.${category}.${key}`] = value;
          });
        }
      });

      await firestore.collection(this.collection).doc(userId).update(updates);
    } catch (error) {
      logger.error(`Error updating user preferences ${userId}:`, error);
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(
    userId: string,
    isOnline: boolean,
    presenceStatus?: User['presenceStatus'],
    presenceActivity?: string
  ): Promise<void> {
    try {
      const updates: any = {
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date()
      };

      if (presenceStatus) {
        updates.presenceStatus = presenceStatus;
      }

      if (presenceActivity !== undefined) {
        updates.presenceActivity = presenceActivity;
      }

      await firestore.collection(this.collection).doc(userId).update(updates);
    } catch (error) {
      logger.error(`Error updating online status ${userId}:`, error);
      throw new Error('Failed to update online status');
    }
  }

  /**
   * Verify user
   */
  static async verifyUser(
    userId: string,
    verificationBadge?: User['verification']['verificationBadge']
  ): Promise<void> {
    try {
      const updates: any = {
        'verification.isVerified': true,
        'verification.verifiedAt': new Date(),
        updatedAt: new Date()
      };

      if (verificationBadge) {
        updates['verification.verificationBadge'] = verificationBadge;
      }

      await firestore.collection(this.collection).doc(userId).update(updates);

      logger.info(`User verified: ${userId}`);
    } catch (error) {
      logger.error(`Error verifying user ${userId}:`, error);
      throw new Error('Failed to verify user');
    }
  }

  /**
   * Log user activity
   */
  static async logActivity(
    userId: string,
    type: UserActivity['type'],
    description: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const activityData: Omit<UserActivity, 'id'> = {
        userId,
        type,
        description,
        metadata,
        ipAddress,
        userAgent,
        timestamp: new Date()
      };

      await firestore.collection('userActivity').add(activityData);
    } catch (error) {
      logger.error(`Error logging user activity ${userId}:`, error);
    }
  }

  /**
   * Get user activity
   */
  static async getUserActivity(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<UserActivity[]> {
    try {
      const activitySnapshot = await firestore
        .collection('userActivity')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserActivity[];
    } catch (error) {
      logger.error(`Error getting user activity ${userId}:`, error);
      return [];
    }
  }

  /**
   * Search users
   */
  static async searchUsers(
    query: string,
    limit: number = 20,
    filters: {
      role?: UserRole;
      isVerified?: boolean;
    } = {}
  ): Promise<User[]> {
    try {
      // This is a simplified search implementation
      // In production, you might want to use a dedicated search service like Algolia
      
      let firestoreQuery = firestore
        .collection(this.collection)
        .where('deletedAt', '==', null);

      if (filters.role) {
        firestoreQuery = firestoreQuery.where('role', '==', filters.role);
      }

      if (filters.isVerified !== undefined) {
        firestoreQuery = firestoreQuery.where('verification.isVerified', '==', filters.isVerified);
      }

      const snapshot = await firestoreQuery.limit(100).get(); // Get more for client-side filtering

      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Client-side search filtering
      const searchLower = query.toLowerCase();
      const filteredUsers = users.filter(user =>
        user.displayName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.bio?.toLowerCase().includes(searchLower)
      );

      return filteredUsers.slice(0, limit);
    } catch (error) {
      logger.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get online users count
   */
  static async getOnlineUsersCount(): Promise<number> {
    try {
      const onlineUsersSnapshot = await firestore
        .collection(this.collection)
        .where('isOnline', '==', true)
        .where('deletedAt', '==', null)
        .count()
        .get();

      return onlineUsersSnapshot.data().count;
    } catch (error) {
      logger.error('Error getting online users count:', error);
      return 0;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    usersByRole: Record<UserRole, number>;
    newUsersToday: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get total users
      const totalUsersSnapshot = await firestore
        .collection(this.collection)
        .where('deletedAt', '==', null)
        .count()
        .get();

      // Get active users (online in last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsersSnapshot = await firestore
        .collection(this.collection)
        .where('lastSeen', '>=', yesterday)
        .where('deletedAt', '==', null)
        .count()
        .get();

      // Get verified users
      const verifiedUsersSnapshot = await firestore
        .collection(this.collection)
        .where('verification.isVerified', '==', true)
        .where('deletedAt', '==', null)
        .count()
        .get();

      // Get new users today
      const newUsersTodaySnapshot = await firestore
        .collection(this.collection)
        .where('createdAt', '>=', today)
        .where('deletedAt', '==', null)
        .count()
        .get();

      // Get users by role
      const usersByRole: Record<UserRole, number> = {} as Record<UserRole, number>;
      
      for (const role of Object.values(UserRole)) {
        const roleUsersSnapshot = await firestore
          .collection(this.collection)
          .where('role', '==', role)
          .where('deletedAt', '==', null)
          .count()
          .get();
        
        usersByRole[role] = roleUsersSnapshot.data().count;
      }

      return {
        totalUsers: totalUsersSnapshot.data().count,
        activeUsers: activeUsersSnapshot.data().count,
        verifiedUsers: verifiedUsersSnapshot.data().count,
        usersByRole,
        newUsersToday: newUsersTodaySnapshot.data().count
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw new Error('Failed to get user statistics');
    }
  }
}

export const userModel = UserModel;
export default UserModel;