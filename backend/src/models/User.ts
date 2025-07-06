import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  role: UserRole;
  permissions: string[];
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  profile?: UserProfile;
  preferences?: UserPreferences;
  stats?: UserStats;
}

export interface UserProfile {
  phoneNumber?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  skills?: string[];
  experience?: number; // years of experience
  education?: string;
  company?: string;
  title?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    sessions: boolean;
    marketplace: boolean;
    community: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

export interface UserStats {
  totalSessions: number;
  completedSessions: number;
  totalPrototypes: number;
  totalProducts: number;
  totalFeedback: number;
  averageRating: number;
  memberSince: Date;
}

export enum UserRole {
  USER = 'user',
  MENTOR = 'mentor',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum UserPermission {
  CREATE_PROTOTYPE = 'create_prototype',
  EDIT_PROTOTYPE = 'edit_prototype',
  DELETE_PROTOTYPE = 'delete_prototype',
  CREATE_PRODUCT = 'create_product',
  EDIT_PRODUCT = 'edit_product',
  DELETE_PRODUCT = 'delete_product',
  BOOK_SESSION = 'book_session',
  HOST_SESSION = 'host_session',
  MANAGE_USERS = 'manage_users',
  MODERATE_CONTENT = 'moderate_content',
  VIEW_ANALYTICS = 'view_analytics'
}

class UserModel {
  private db = getFirestore();
  private auth = getAuth();
  private collection = this.db.collection('users');

  /**
   * Create a new user
   */
  async createUser(userData: Omit<User, 'uid' | 'createdAt' | 'updatedAt'> & { uid: string }): Promise<User> {
    try {
      const now = new Date();
      const user: User = {
        ...userData,
        uid: userData.uid,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        isEmailVerified: false,
        role: userData.role || UserRole.USER,
        permissions: userData.permissions || [],
        stats: {
          totalSessions: 0,
          completedSessions: 0,
          totalPrototypes: 0,
          totalProducts: 0,
          totalFeedback: 0,
          averageRating: 0,
          memberSince: now
        }
      };

      await this.collection.doc(user.uid).set(user);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by UID
   */
  async getUserById(uid: string): Promise<User | null> {
    try {
      const doc = await this.collection.doc(uid).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as User;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.collection.where('email', '==', email).limit(1).get();
      if (snapshot.empty) {
        return null;
      }
      return snapshot.docs[0].data() as User;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  }

  /**
   * Update user
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<User> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await this.collection.doc(uid).update(updateData);
      
      const updatedUser = await this.getUserById(uid);
      if (!updatedUser) {
        throw new Error('User not found after update');
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await this.collection.doc(uid).delete();
      // Note: Firebase Auth user deletion should be handled separately
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Update user role and permissions
   */
  async updateUserRole(uid: string, role: UserRole, permissions: string[]): Promise<User> {
    try {
      // Update custom claims in Firebase Auth
      await this.auth.setCustomUserClaims(uid, { role, permissions });
      
      // Update user document
      return await this.updateUser(uid, { role, permissions });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole, limit: number = 50): Promise<User[]> {
    try {
      const snapshot = await this.collection
        .where('role', '==', role)
        .where('isActive', '==', true)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw new Error('Failed to fetch users by role');
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple prefix search on displayName
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('displayName')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Update user stats
   */
  async updateUserStats(uid: string, stats: Partial<UserStats>): Promise<void> {
    try {
      const user = await this.getUserById(uid);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedStats: UserStats = {
        totalSessions: user.stats?.totalSessions || 0,
        completedSessions: user.stats?.completedSessions || 0,
        totalPrototypes: user.stats?.totalPrototypes || 0,
        totalProducts: user.stats?.totalProducts || 0,
        totalFeedback: user.stats?.totalFeedback || 0,
        averageRating: user.stats?.averageRating || 0,
        memberSince: user.stats?.memberSince || new Date(),
        ...stats
      };

      await this.updateUser(uid, { stats: updatedStats });
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw new Error('Failed to update user stats');
    }
  }

  /**
   * Get user with Firebase Auth data
   */
  async getUserWithAuthData(uid: string): Promise<User & { authData?: any }> {
    try {
      const [user, authRecord] = await Promise.all([
        this.getUserById(uid),
        this.auth.getUser(uid)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        ...user,
        authData: {
          emailVerified: authRecord.emailVerified,
          disabled: authRecord.disabled,
          customClaims: authRecord.customClaims
        }
      };
    } catch (error) {
      console.error('Error fetching user with auth data:', error);
      throw new Error('Failed to fetch user with auth data');
    }
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(updates: Array<{ uid: string; updates: Partial<User> }>): Promise<void> {
    try {
      const batch = this.db.batch();
      
      updates.forEach(({ uid, updates: userUpdates }) => {
        const docRef = this.collection.doc(uid);
        batch.update(docRef, {
          ...userUpdates,
          updatedAt: new Date()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw new Error('Failed to bulk update users');
    }
  }
}

export const userModel = new UserModel();
export default userModel; 