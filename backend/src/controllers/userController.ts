import { Request, Response } from 'express';
import { userModel, User, UserRole, UserPermission } from '../models/User';
import { getAuth } from 'firebase-admin/auth';
import logger from '../services/loggerService';
import { updateUserSettingsService, updateUserPrivacySettingsService, followUserService, unfollowUserService, addNotificationService, getNotificationsService, markNotificationAsReadService, updateUserAvatarService } from '../services/userService';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { uid, email, firstName, lastName, role = UserRole.USER, permissions = [] } = req.body;

    // Validate required fields
    if (!uid || !email || !firstName || !lastName) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: uid, email, firstName, lastName'
      });
    }

    // Check if user already exists
    const existingUser = await userModel.getUserById(uid);
    if (existingUser) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'User already exists'
      });
    }

    // Get Firebase user data
    const firebaseUser = await getAuth().getUser(uid);
    
    // Create user object
    const userData = {
      uid,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      role,
      permissions,
      isEmailVerified: firebaseUser.emailVerified,
      isActive: true,
      profile: req.body.profile,
      preferences: req.body.preferences
    };

    const user = await userModel.createUser(userData);

    // Set custom claims in Firebase Auth
    await getAuth().setCustomUserClaims(uid, { role, permissions });

    logger.info(`User created successfully: ${uid}`);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create user'
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
  const { uid } = req.params;
    const requestingUser = req.user;

    // Check if user is requesting their own data or has admin permissions
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to access this user data'
      });
    }

    const user = await userModel.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    // Remove sensitive data for non-admin users
    const userData = requestingUser?.role === UserRole.ADMIN ? user : {
      uid: user.uid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      bio: user.bio,
      photoURL: user.photoURL,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      profile: user.profile,
      stats: user.stats,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    res.json({
      message: 'User retrieved successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch user'
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const updates = req.body;

    // Check if user is updating their own data or has admin permissions
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to update this user'
      });
    }

    // Prevent non-admin users from updating sensitive fields
    if (requestingUser?.role !== UserRole.ADMIN) {
      delete updates.role;
      delete updates.permissions;
      delete updates.isActive;
    }

    // Validate email if being updated
    if (updates.email) {
      const existingUser = await userModel.getUserByEmail(updates.email);
      if (existingUser && existingUser.uid !== uid) {
        return res.status(409).json({
          error: 'ConflictError',
          message: 'Email already in use'
        });
      }
    }

    const updatedUser = await userModel.updateUser(uid, updates);

    logger.info(`User updated successfully: ${uid}`);

    res.json({
      message: 'User updated successfully',
      user: {
        uid: updatedUser.uid,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        photoURL: updatedUser.photoURL,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        isActive: updatedUser.isActive,
        profile: updatedUser.profile,
        preferences: updatedUser.preferences,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update user'
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;

    // Only admins can delete users
    if (requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to delete user'
      });
    }

    const user = await userModel.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    // Prevent deletion of admin users
    if (user.role === UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Cannot delete admin users'
      });
    }

    await userModel.deleteUser(uid);

    // Delete from Firebase Auth
    await getAuth().deleteUser(uid);

    logger.info(`User deleted successfully: ${uid}`);

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete user'
    });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { role, permissions } = req.body;
    const requestingUser = req.user;

    // Only admins can update user roles
    if (requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to update user role'
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid role'
      });
    }

    const user = await userModel.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const updatedUser = await userModel.updateUserRole(uid, role, permissions || []);

    logger.info(`User role updated: ${uid} -> ${role}`);

    res.json({
      message: 'User role updated successfully',
      user: {
        uid: updatedUser.uid,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        permissions: updatedUser.permissions,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update user role'
    });
  }
};

export const getUsersByRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { limit = 50 } = req.query;
    const requestingUser = req.user;

    // Only admins can view users by role
    if (requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to view users by role'
      });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid role'
      });
    }

    const users = await userModel.getUsersByRole(role as UserRole, Number(limit));

    res.json({
      message: 'Users retrieved successfully',
      users: users.map(user => ({
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      })),
      count: users.length
    });
  } catch (error) {
    logger.error('Error fetching users by role:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch users by role'
    });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query, limit = 20 } = req.query;
    const requestingUser = req.user;

    // Only admins can search users
    if (requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to search users'
      });
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Search query is required'
      });
    }

    const users = await userModel.searchUsers(query, Number(limit));

    res.json({
      message: 'Users search completed',
      users: users.map(user => ({
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      })),
      count: users.length,
      query
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to search users'
    });
  }
};

export const updateUserStats = async (req: Request, res: Response) => {
  try {
  const { uid } = req.params;
    const { stats } = req.body;
    const requestingUser = req.user;

    // Check if user is updating their own stats or has admin permissions
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to update user stats'
      });
    }

    await userModel.updateUserStats(uid, stats);

    logger.info(`User stats updated: ${uid}`);

    res.json({
      message: 'User stats updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user stats:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update user stats'
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;

    // Users can view their own profile or public profiles
    if (requestingUser?.uid !== uid) {
      const user = await userModel.getUserById(uid);
      if (!user || !user.isActive) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'User not found or inactive'
        });
      }

      // Return public profile data only
      return res.json({
        message: 'User profile retrieved successfully',
        user: {
          uid: user.uid,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          bio: user.bio,
          photoURL: user.photoURL,
          profile: user.profile,
          stats: user.stats,
          createdAt: user.createdAt
        }
      });
    }

    // Return full profile for own user
    const user = await userModel.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        bio: user.bio,
        photoURL: user.photoURL,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        profile: user.profile,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch user profile'
    });
  }
}; 

export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const settings = req.body;

    if (requestingUser?.uid !== uid) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'You can only update your own settings'
      });
    }

    await updateUserSettingsService(uid, settings);
    logger.info(`User settings updated for user: ${uid}`);
    res.json({ message: 'User settings updated successfully' });
  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user settings' });
  }
};

export const updateUserPrivacySettings = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const privacySettings = req.body;

    if (requestingUser?.uid !== uid) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'You can only update your own privacy settings'
      });
    }

    await updateUserPrivacySettingsService(uid, privacySettings);
    logger.info(`User privacy settings updated for user: ${uid}`);
    res.json({ message: 'User privacy settings updated successfully' });
  } catch (error) {
    logger.error('Error updating user privacy settings:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user privacy settings' });
  }
};

export const followUser = async (req: Request, res: Response) => {
  try {
    const { id: followingId } = req.params; // ID of the user to follow
    const requestingUser = req.user; // The user who is initiating the follow

    if (!requestingUser) {
      return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
    }

    if (requestingUser.uid === followingId) {
      return res.status(400).json({ error: 'BadRequestError', message: 'Cannot follow yourself' });
    }

    const targetUser = await userModel.getUserById(followingId);
    if (!targetUser) {
      return res.status(404).json({ error: 'NotFoundError', message: 'User to follow not found' });
    }

    await followUserService(requestingUser.uid, followingId);
    logger.info(`User ${requestingUser.uid} followed ${followingId}`);
    res.json({ message: 'User followed successfully' });
  } catch (error) {
    logger.error('Error following user:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to follow user' });
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { id: followingId } = req.params; // ID of the user to unfollow
    const requestingUser = req.user; // The user who is initiating the unfollow

    if (!requestingUser) {
      return res.status(401).json({ error: 'UnauthorizedError', message: 'Authentication required' });
    }

    if (requestingUser.uid === followingId) {
      return res.status(400).json({ error: 'BadRequestError', message: 'Cannot unfollow yourself' });
    }

    const targetUser = await userModel.getUserById(followingId);
    if (!targetUser) {
      return res.status(404).json({ error: 'NotFoundError', message: 'User to unfollow not found' });
    }

    await unfollowUserService(requestingUser.uid, followingId);
    logger.info(`User ${requestingUser.uid} unfollowed ${followingId}`);
    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    logger.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to unfollow user' });
  }
};

export const addNotification = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const notification = req.body;

    // Only allow users to add notifications for themselves or admins for any user
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'ForbiddenError', message: 'Insufficient permissions' });
    }

    await addNotificationService(uid, notification);
    logger.info(`Notification added for user: ${uid}`);
    res.status(201).json({ message: 'Notification added successfully' });
  } catch (error) {
    logger.error('Error adding notification:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to add notification' });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;

    // Only allow users to get their own notifications or admins for any user
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'ForbiddenError', message: 'Insufficient permissions' });
    }

    const notifications = await getNotificationsService(uid);
    logger.info(`Notifications retrieved for user: ${uid}`);
    res.json({ message: 'Notifications retrieved successfully', notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { uid, notificationId } = req.params;
    const requestingUser = req.user;

    // Only allow users to mark their own notifications as read or admins for any user
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'ForbiddenError', message: 'Insufficient permissions' });
    }

    await markNotificationAsReadService(uid, notificationId);
    logger.info(`Notification ${notificationId} marked as read for user ${uid}`);
    res.json({ message: 'Notification marked as read successfully' });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to mark notification as read' });
  }
}; 

export const updateUserAvatar = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const { photoURL } = req.body; // Assuming photoURL is sent in the request body

    if (requestingUser?.uid !== uid) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'You can only update your own avatar'
      });
    }

    if (!photoURL) {
      return res.status(400).json({ error: 'BadRequestError', message: 'Photo URL is required' });
    }

    await updateUserAvatarService(uid, photoURL);
    logger.info(`User ${uid} avatar updated.`);
    res.json({ message: 'User avatar updated successfully', photoURL });
  } catch (error) {
    logger.error('Error updating user avatar:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to update user avatar' });
  }
}; 