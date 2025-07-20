// src/services/firebaseService.ts

// Placeholder for Firebase initialization and related functions
// Example: Firebase analytics, crash reporting, etc.

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  updateEmail,
  deleteUser,
  User as FirebaseUser,
  UserCredential,
  AuthError
} from 'firebase/auth';
import { getApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime: string | null;
    lastSignInTime: string | null;
  };
  customClaims?: {
    role?: string;
    permissions?: string[];
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface FirebaseAuthError {
  code: string;
  message: string;
  email?: string;
  credential?: Record<string, unknown>;
}

class FirebaseAuthService {
  private auth = getAuth(getApp());
  private currentUser: AuthUser | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth() {
    try {
      // Check for stored user data
      const storedUser = await this.getStoredUser();
      if (storedUser) {
        this.currentUser = storedUser;
      }

      // Listen for auth state changes
      onAuthStateChanged(this.auth, async (firebaseUser) => {
        if (firebaseUser) {
          const user = await this.convertFirebaseUser(firebaseUser);
          this.currentUser = user;
          await this.storeUser(user);
        } else {
          this.currentUser = null;
          await this.clearStoredUser();
        }

        // Notify listeners
        this.authStateListeners.forEach(listener => listener(this.currentUser));
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  /**
   * Convert Firebase user to our AuthUser format
   */
  private async convertFirebaseUser(firebaseUser: FirebaseUser): Promise<AuthUser> {
    try {
      // Get custom claims
      const token = await firebaseUser.getIdTokenResult();
      const customClaims = token.claims;

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,
        metadata: {
          creationTime: firebaseUser.metadata.creationTime,
          lastSignInTime: firebaseUser.metadata.lastSignInTime
        },
        customClaims: {
          role: customClaims.role,
          permissions: customClaims.permissions
        }
      };
    } catch (error) {
      console.error('Error converting Firebase user:', error);
      throw error;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<AuthUser> {
    try {
      const { email, password, firstName, lastName, displayName } = data;

      // Create user
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      // Update profile
      const fullDisplayName = displayName || `${firstName} ${lastName}`;
      await updateProfile(userCredential.user, {
        displayName: fullDisplayName
      });

      // Convert to our format
      const user = await this.convertFirebaseUser(userCredential.user);
      this.currentUser = user;
      await this.storeUser(user);

      return user;
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthUser> {
    try {
      const { email, password } = data;

      const userCredential: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      const user = await this.convertFirebaseUser(userCredential.user);
      this.currentUser = user;
      await this.storeUser(user);

      return user;
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUser = null;
      await this.clearStoredUser();
    } catch (error: unknown) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUser?.customClaims?.role === role;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const permissions = this.currentUser?.customClaims?.permissions || [];
    return permissions.includes(permission);
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    displayName?: string;
    photoURL?: string;
  }): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await updateProfile(this.auth.currentUser, updates);

      // Update local user data
      if (this.currentUser) {
        this.currentUser = {
          ...this.currentUser,
          ...updates
        };
        await this.storeUser(this.currentUser);
      }
    } catch (error: unknown) {
      console.error('Update profile error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail: string): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await updateEmail(this.auth.currentUser, newEmail);

      // Update local user data
      if (this.currentUser) {
        this.currentUser.email = newEmail;
        await this.storeUser(this.currentUser);
      }
    } catch (error: unknown) {
      console.error('Update email error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await updatePassword(this.auth.currentUser, newPassword);
    } catch (error: unknown) {
      console.error('Update password error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: unknown) {
      console.error('Send password reset email error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      await confirmPasswordReset(this.auth, code, newPassword);
    } catch (error: unknown) {
      console.error('Confirm password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      if (!this.auth.currentUser) {
        throw new Error('No authenticated user');
      }

      await deleteUser(this.auth.currentUser);
      this.currentUser = null;
      await this.clearStoredUser();
    } catch (error: unknown) {
      console.error('Delete account error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get ID token
   */
  async getIdToken(forceRefresh: boolean = false): Promise<string> {
    try {
      if (!this.auth.currentUser) {
        throw new Error('No authenticated user');
      }

      return await this.auth.currentUser.getIdToken(forceRefresh);
    } catch (error: unknown) {
      console.error('Get ID token error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Add auth state listener
   */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Store user data locally
   */
  private async storeUser(user: AuthUser): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
    }
  }

  /**
   * Get stored user data
   */
  private async getStoredUser(): Promise<AuthUser | null> {
    try {
      const userData = await AsyncStorage.getItem('auth_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  /**
   * Clear stored user data
   */
  private async clearStoredUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_user');
    } catch (error) {
      console.error('Error clearing stored user:', error);
    }
  }

  /**
   * Handle Firebase auth errors
   */
  private handleAuthError(error: unknown): FirebaseAuthError {
    let message = 'An authentication error occurred';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection';
        break;
      case 'auth/requires-recent-login':
        message = 'Please sign in again to perform this action';
        break;
      default:
        message = error.message || message;
    }

    return {
      code: error.code || 'auth/unknown',
      message,
      email: error.email,
      credential: error.credential
    };
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService; 