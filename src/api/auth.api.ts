import { auth, firestore } from '../services/firebase'; // Import auth and firestore from the initialized Firebase app
// import { apiClient } from './client'; // No longer needed for direct Firebase auth operations
import apiClient, { ApiResponse } from './client';
import { AuthUser } from '../services/firebaseService';

// Firebase authentication API - keeping for backward compatibility
export const firebaseAuthApi = {
  login: async (credentials: any) => {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
      // Optionally, fetch user profile from Firestore or set up user object
      const user = userCredential.user;
      // In a real app, you might fetch additional user data from Firestore here
      // For now, return a simplified user object
      return { id: user?.uid, email: user?.email, token: await user?.getIdToken() };
    } catch (error: any) {
      console.error('Firebase Login Error:', error.message);
      throw error;
    }
  },

  register: async (userData: any) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
      const user = userCredential.user;

      // Optionally, save additional user data to Firestore
      if (user) {
        await firestore.collection('users').doc(user.uid).set({
          email: user.email,
          username: userData.username || user.email?.split('@')[0], // Use provided username or derive from email
          // Add any other registration fields here
          createdAt: new Date(),
        }, { merge: true }); // Use merge to avoid overwriting if doc already exists
      }

      return { id: user?.uid, email: user?.email, username: userData.username, token: await user?.getIdToken() };
    } catch (error: any) {
      console.error('Firebase Register Error:', error.message);
      throw error;
    }
  },

  signOut: async () => {
    try {
      await auth.signOut();
      console.log('User signed out from Firebase.');
    } catch (error: any) {
      console.error('Firebase Sign Out Error:', error.message);
      throw error;
    }
  },

  // Add more authentication-related functions here if needed
}; 

export interface SignUpRequest {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  permissions?: string[];
  profile?: any;
  preferences?: any;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  profile?: any;
  preferences?: any;
}

export interface UpdateUserRoleRequest {
  role: string;
  permissions: string[];
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

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string;
  photoURL?: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  profile?: any;
  stats?: UserStats;
  createdAt: Date;
  lastLoginAt?: Date;
}

class AuthApi {
  private basePath = '/users';

  /**
   * Create a new user
   */
  async createUser(data: SignUpRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.post<UserProfile>(this.basePath, data);
  }

  /**
   * Get user by ID
   */
  async getUserById(uid: string): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>(`${this.basePath}/${uid}`);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>(`${this.basePath}/me`);
  }

  /**
   * Update user profile
   */
  async updateUser(uid: string, data: UpdateUserRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<UserProfile>(`${this.basePath}/${uid}`, data);
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(data: UpdateUserRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<UserProfile>(`${this.basePath}/me`, data);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(uid: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}`);
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(uid: string, data: UpdateUserRoleRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<UserProfile>(`${this.basePath}/${uid}/role`, data);
  }

  /**
   * Get users by role (admin only)
   */
  async getUsersByRole(role: string, limit: number = 50): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/role/${role}`, {
      params: { limit }
    });
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(query: string, limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/search`, {
      params: { query, limit }
    });
  }

  /**
   * Update user stats
   */
  async updateUserStats(uid: string, stats: Partial<UserStats>): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${uid}/stats`, { stats });
  }

  /**
   * Get user profile (public)
   */
  async getUserProfile(uid: string): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>(`${this.basePath}/${uid}/profile`);
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(uid: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ photoURL: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiClient.uploadFile<{ photoURL: string }>(
      `${this.basePath}/${uid}/avatar`,
      formData,
      onProgress
    );
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(uid: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}/avatar`);
  }

  /**
   * Get user activity
   */
  async getUserActivity(uid: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${uid}/activity`, {
      params: { limit }
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(uid: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${uid}/notifications`, {
      params: { limit }
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(uid: string, notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${uid}/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(uid: string): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${uid}/notifications/read-all`);
  }

  /**
   * Delete notification
   */
  async deleteNotification(uid: string, notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}/notifications/${notificationId}`);
  }

  /**
   * Get user settings
   */
  async getUserSettings(uid: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${uid}/settings`);
  }

  /**
   * Update user settings
   */
  async updateUserSettings(uid: string, settings: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`${this.basePath}/${uid}/settings`, settings);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(uid: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${uid}/preferences`);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(uid: string, preferences: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`${this.basePath}/${uid}/preferences`, preferences);
  }

  /**
   * Get user privacy settings
   */
  async getUserPrivacy(uid: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${uid}/privacy`);
  }

  /**
   * Update user privacy settings
   */
  async updateUserPrivacy(uid: string, privacy: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`${this.basePath}/${uid}/privacy`, privacy);
  }

  /**
   * Block user
   */
  async blockUser(uid: string, targetUid: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${uid}/block/${targetUid}`);
  }

  /**
   * Unblock user
   */
  async unblockUser(uid: string, targetUid: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}/block/${targetUid}`);
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(uid: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/${uid}/blocked`);
  }

  /**
   * Follow user
   */
  async followUser(uid: string, targetUid: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${uid}/follow/${targetUid}`);
  }

  /**
   * Unfollow user
   */
  async unfollowUser(uid: string, targetUid: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}/follow/${targetUid}`);
  }

  /**
   * Get followers
   */
  async getFollowers(uid: string, limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/${uid}/followers`, {
      params: { limit }
    });
  }

  /**
   * Get following
   */
  async getFollowing(uid: string, limit: number = 20): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/${uid}/following`, {
      params: { limit }
    });
  }

  /**
   * Check if following user
   */
  async isFollowing(uid: string, targetUid: string): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(`${this.basePath}/${uid}/following/${targetUid}`);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(uid: string, period: string = '30d'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${uid}/analytics`, {
      params: { period }
    });
  }

  /**
   * Export user data
   */
  async exportUserData(uid: string): Promise<Blob> {
    return apiClient.downloadFile(`${this.basePath}/${uid}/export`);
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(uid: string, reason?: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${uid}/delete-request`, { reason });
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(uid: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${uid}/delete-request`);
  }
}

export const authApi = new AuthApi();
export default authApi; 