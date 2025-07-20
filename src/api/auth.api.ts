import { auth, firestore } from "../services/firebase"; // Import auth and firestore from the initialized Firebase app
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import apiClient, { ApiResponse } from "./client";

// Firebase authentication interfaces
export interface FirebaseLoginCredentials {
  email: string;
  password: string;
}

export interface FirebaseRegisterData {
  email: string;
  password: string;
  username?: string;
}

export interface FirebaseAuthUser {
  id: string;
  email: string;
  username?: string;
  token: string;
}

// Firebase authentication API - keeping for backward compatibility
export const firebaseAuthApi = {
  login: async (
    credentials: FirebaseLoginCredentials
  ): Promise<FirebaseAuthUser> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      const user = userCredential.user;

      if (!user) {
        throw new Error("Authentication failed - no user returned");
      }

      const token = await user.getIdToken();
      return {
        id: user.uid,
        email: user.email || credentials.email,
        token,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown authentication error";
      console.error("Firebase Login Error:", errorMessage);
      throw error;
    }
  },

  register: async (
    userData: FirebaseRegisterData
  ): Promise<FirebaseAuthUser> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      const user = userCredential.user;

      if (!user) {
        throw new Error("Registration failed - no user returned");
      }

      // Save additional user data to Firestore
      await setDoc(
        doc(firestore, "users", user.uid),
        {
          email: user.email,
          username: userData.username || user.email?.split("@")[0],
          createdAt: new Date(),
        },
        { merge: true }
      );

      const token = await user.getIdToken();
      return {
        id: user.uid,
        email: user.email || userData.email,
        username: userData.username,
        token,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown registration error";
      console.error("Firebase Register Error:", errorMessage);
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      console.log("User signed out from Firebase.");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sign out error";
      console.error("Firebase Sign Out Error:", errorMessage);
      throw error;
    }
  },
};

export interface SignUpRequest {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  permissions?: string[];
  profile?: Record<string, unknown>;
  preferences?: Partial<UserPreferences>;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
  };
  privacy?: {
    profileVisibility?: "public" | "private" | "friends";
    showEmail?: boolean;
    showActivity?: boolean;
  };
}

export interface UserSettings {
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  autoSave?: boolean;
  twoFactorEnabled?: boolean;
}

export interface UserActivity {
  id: string;
  type:
    | "login"
    | "profile_update"
    | "session_booked"
    | "prototype_uploaded"
    | "comment_posted";
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UserNotification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface UserAnalytics {
  period: string;
  totalSessions: number;
  activeHours: number;
  prototypesCreated: number;
  mentoringSessions: number;
  communityEngagement: number;
  skillProgress: Record<string, number>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  profile?: Record<string, unknown>;
  preferences?: Partial<UserPreferences>;
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
  profile?: Record<string, unknown>;
  stats?: UserStats;
  createdAt: Date;
  lastLoginAt?: Date;
}

class AuthApi {
  private basePath = "/users";

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
  async updateUser(
    uid: string,
    data: UpdateUserRequest
  ): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<UserProfile>(`${this.basePath}/${uid}`, data);
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(
    data: UpdateUserRequest
  ): Promise<ApiResponse<UserProfile>> {
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
  async updateUserRole(
    uid: string,
    data: UpdateUserRoleRequest
  ): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<UserProfile>(`${this.basePath}/${uid}/role`, data);
  }

  /**
   * Get users by role (admin only)
   */
  async getUsersByRole(
    role: string,
    limit: number = 50
  ): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/role/${role}`, {
      params: { limit },
    });
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(
    query: string,
    limit: number = 20
  ): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/search`, {
      params: { query, limit },
    });
  }

  /**
   * Update user stats
   */
  async updateUserStats(
    uid: string,
    stats: Partial<UserStats>
  ): Promise<ApiResponse<void>> {
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
  async uploadAvatar(
    uid: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ photoURL: string }>> {
    const formData = new FormData();
    formData.append("avatar", file);

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
  async getUserActivity(
    uid: string,
    limit: number = 20
  ): Promise<ApiResponse<UserActivity[]>> {
    return apiClient.get<UserActivity[]>(`${this.basePath}/${uid}/activity`, {
      params: { limit },
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    uid: string,
    limit: number = 20
  ): Promise<ApiResponse<UserNotification[]>> {
    return apiClient.get<UserNotification[]>(
      `${this.basePath}/${uid}/notifications`,
      {
        params: { limit },
      }
    );
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    uid: string,
    notificationId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.put<void>(
      `${this.basePath}/${uid}/notifications/${notificationId}/read`
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(uid: string): Promise<ApiResponse<void>> {
    return apiClient.put<void>(
      `${this.basePath}/${uid}/notifications/read-all`
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    uid: string,
    notificationId: string
  ): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(
      `${this.basePath}/${uid}/notifications/${notificationId}`
    );
  }

  /**
   * Get user settings
   */
  async getUserSettings(uid: string): Promise<ApiResponse<UserSettings>> {
    return apiClient.get<UserSettings>(`${this.basePath}/${uid}/settings`);
  }

  /**
   * Update user settings
   */
  async updateUserSettings(
    uid: string,
    settings: Partial<UserSettings>
  ): Promise<ApiResponse<UserSettings>> {
    return apiClient.put<UserSettings>(
      `${this.basePath}/${uid}/settings`,
      settings
    );
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(uid: string): Promise<ApiResponse<UserPreferences>> {
    return apiClient.get<UserPreferences>(
      `${this.basePath}/${uid}/preferences`
    );
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    uid: string,
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    return apiClient.put<UserPreferences>(
      `${this.basePath}/${uid}/preferences`,
      preferences
    );
  }

  /**
   * Get user privacy settings
   */
  async getUserPrivacy(
    uid: string
  ): Promise<ApiResponse<UserPreferences["privacy"]>> {
    return apiClient.get<UserPreferences["privacy"]>(
      `${this.basePath}/${uid}/privacy`
    );
  }

  /**
   * Update user privacy settings
   */
  async updateUserPrivacy(
    uid: string,
    privacy: UserPreferences["privacy"]
  ): Promise<ApiResponse<UserPreferences["privacy"]>> {
    return apiClient.put<UserPreferences["privacy"]>(
      `${this.basePath}/${uid}/privacy`,
      privacy
    );
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
  async unblockUser(
    uid: string,
    targetUid: string
  ): Promise<ApiResponse<void>> {
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
  async unfollowUser(
    uid: string,
    targetUid: string
  ): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(
      `${this.basePath}/${uid}/follow/${targetUid}`
    );
  }

  /**
   * Get followers
   */
  async getFollowers(
    uid: string,
    limit: number = 20
  ): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/${uid}/followers`, {
      params: { limit },
    });
  }

  /**
   * Get following
   */
  async getFollowing(
    uid: string,
    limit: number = 20
  ): Promise<ApiResponse<UserProfile[]>> {
    return apiClient.get<UserProfile[]>(`${this.basePath}/${uid}/following`, {
      params: { limit },
    });
  }

  /**
   * Check if following user
   */
  async isFollowing(
    uid: string,
    targetUid: string
  ): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(
      `${this.basePath}/${uid}/following/${targetUid}`
    );
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    uid: string,
    period: string = "30d"
  ): Promise<ApiResponse<UserAnalytics>> {
    return apiClient.get<UserAnalytics>(`${this.basePath}/${uid}/analytics`, {
      params: { period },
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
  async requestAccountDeletion(
    uid: string,
    reason?: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${uid}/delete-request`, {
      reason,
    });
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
