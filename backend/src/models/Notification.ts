import { firestore } from '../config/firebaseAdmin';
import logger from '../services/loggerService';

export interface NotificationData {
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'session' | 'prototype' | 'community' | 'system' | 'marketing' | 'reminder';
  subtype: string; // e.g., 'new_message', 'session_reminder', 'prototype_liked', etc.
  title: string;
  body: string;
  data: NotificationData;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channel: string; // Notification channel ID
  category: string; // For grouping notifications
  read: boolean;
  clicked: boolean;
  dismissed: boolean;
  actionTaken?: string; // Action taken from notification (if any)
  deliveryStatus: {
    push: 'pending' | 'sent' | 'delivered' | 'failed' | 'not_applicable';
    email: 'pending' | 'sent' | 'delivered' | 'failed' | 'not_applicable';
    sms: 'pending' | 'sent' | 'delivered' | 'failed' | 'not_applicable';
    inApp: 'pending' | 'sent' | 'delivered' | 'failed' | 'not_applicable';
  };
  scheduledFor?: Date; // For scheduled notifications
  expiresAt?: Date; // When notification expires
  metadata: {
    sourceUserId?: string; // User who triggered the notification
    relatedEntityId?: string; // ID of related entity (post, prototype, etc.)
    relatedEntityType?: string; // Type of related entity
    campaignId?: string; // For marketing notifications
    batchId?: string; // For bulk notifications
    retryCount?: number;
    lastRetryAt?: Date;
    deviceTokens?: string[]; // Push notification tokens used
    emailAddress?: string; // Email address used
    phoneNumber?: string; // Phone number used
  };
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  clickedAt?: Date;
  dismissedAt?: Date;
  deliveredAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: Notification['type'];
  subtype: string;
  title: string; // Can contain placeholders like {{userName}}
  body: string; // Can contain placeholders
  defaultData: NotificationData;
  priority: Notification['priority'];
  channel: string;
  category: string;
  settings: {
    allowCustomization: boolean;
    requiresAuth: boolean;
    maxRetries: number;
    retryDelay: number; // in minutes
    expiryHours: number;
  };
  localization: {
    [locale: string]: {
      title: string;
      body: string;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: Notification['type'];
  subtype?: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
  keywords?: string[]; // Keywords to filter notifications
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  name: string;
  templateId: string;
  targetUsers: string[]; // User IDs
  targetCriteria?: {
    roles?: string[];
    tags?: string[];
    locations?: string[];
    lastActiveAfter?: Date;
    customQuery?: any;
  };
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';
  scheduledFor?: Date;
  progress: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  };
  settings: {
    respectQuietHours: boolean;
    respectPreferences: boolean;
    maxRetries: number;
    batchSize: number; // Number of notifications to send at once
    delayBetweenBatches: number; // in seconds
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface NotificationStats {
  userId: string;
  period: 'day' | 'week' | 'month';
  date: Date;
  stats: {
    total: number;
    read: number;
    clicked: number;
    dismissed: number;
    byType: Record<Notification['type'], number>;
    byChannel: Record<string, number>;
    byPriority: Record<Notification['priority'], number>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationModel {
  private static notificationsCollection = 'notifications';
  private static templatesCollection = 'notificationTemplates';
  private static preferencesCollection = 'notificationPreferences';
  private static batchesCollection = 'notificationBatches';
  private static statsCollection = 'notificationStats';

  /**
   * Create a new notification
   */
  static async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    try {
      const now = new Date();
      const notification = {
        ...notificationData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.notificationsCollection).add(notification);
      
      const createdNotification: Notification = {
        id: docRef.id,
        ...notification
      };

      logger.info(`Notification created: ${createdNotification.id} for user ${createdNotification.userId}`);
      return createdNotification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get notification by ID
   */
  static async getNotificationById(notificationId: string): Promise<Notification | null> {
    try {
      const notificationDoc = await firestore.collection(this.notificationsCollection).doc(notificationId).get();
      
      if (!notificationDoc.exists) {
        return null;
      }

      return {
        id: notificationDoc.id,
        ...notificationDoc.data()
      } as Notification;
    } catch (error) {
      logger.error(`Error getting notification ${notificationId}:`, error);
      return null;
    }
  }

  /**
   * Update notification
   */
  static async updateNotification(notificationId: string, updates: Partial<Notification>): Promise<Notification | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await firestore.collection(this.notificationsCollection).doc(notificationId).update(updateData);
      
      return await this.getNotificationById(notificationId);
    } catch (error) {
      logger.error(`Error updating notification ${notificationId}:`, error);
      throw new Error('Failed to update notification');
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await firestore.collection(this.notificationsCollection).doc(notificationId).delete();
      logger.info(`Notification deleted: ${notificationId}`);
    } catch (error) {
      logger.error(`Error deleting notification ${notificationId}:`, error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    filters: {
      type?: Notification['type'];
      read?: boolean;
      priority?: Notification['priority'];
      category?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    try {
      let query = firestore.collection(this.notificationsCollection)
        .where('userId', '==', userId);

      // Apply filters
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.read !== undefined) {
        query = query.where('read', '==', filters.read);
      }

      if (filters.priority) {
        query = query.where('priority', '==', filters.priority);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.startDate) {
        query = query.where('createdAt', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('createdAt', '<=', filters.endDate);
      }

      // Get notifications with pagination
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Get total count
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      // Get unread count
      const unreadSnapshot = await firestore
        .collection(this.notificationsCollection)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .count()
        .get();
      
      const unreadCount = unreadSnapshot.data().count;

      return { notifications, total, unreadCount };
    } catch (error) {
      logger.error(`Error getting notifications for user ${userId}:`, error);
      throw new Error('Failed to get user notifications');
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await firestore.collection(this.notificationsCollection).doc(notificationId).update({
        read: true,
        readAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error marking notification as read ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Mark notification as clicked
   */
  static async markAsClicked(notificationId: string, actionTaken?: string): Promise<void> {
    try {
      const updates: any = {
        clicked: true,
        clickedAt: new Date(),
        updatedAt: new Date()
      };

      if (actionTaken) {
        updates.actionTaken = actionTaken;
      }

      await firestore.collection(this.notificationsCollection).doc(notificationId).update(updates);
    } catch (error) {
      logger.error(`Error marking notification as clicked ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   */
  static async markAsDismissed(notificationId: string): Promise<void> {
    try {
      await firestore.collection(this.notificationsCollection).doc(notificationId).update({
        dismissed: true,
        dismissedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error marking notification as dismissed ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const unreadNotifications = await firestore
        .collection(this.notificationsCollection)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      if (unreadNotifications.empty) {
        return;
      }

      const batch = firestore.batch();
      const now = new Date();

      unreadNotifications.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: now,
          updatedAt: now
        });
      });

      await batch.commit();
      logger.info(`Marked ${unreadNotifications.size} notifications as read for user ${userId}`);
    } catch (error) {
      logger.error(`Error marking all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(
    notificationId: string,
    channel: keyof Notification['deliveryStatus'],
    status: Notification['deliveryStatus'][keyof Notification['deliveryStatus']]
  ): Promise<void> {
    try {
      const updates: any = {
        [`deliveryStatus.${channel}`]: status,
        updatedAt: new Date()
      };

      if (status === 'delivered') {
        updates.deliveredAt = new Date();
      }

      await firestore.collection(this.notificationsCollection).doc(notificationId).update(updates);
    } catch (error) {
      logger.error(`Error updating delivery status for notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Create notification template
   */
  static async createTemplate(templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    try {
      const now = new Date();
      const template = {
        ...templateData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.templatesCollection).add(template);
      
      const createdTemplate: NotificationTemplate = {
        id: docRef.id,
        ...template
      };

      logger.info(`Notification template created: ${createdTemplate.id}`);
      return createdTemplate;
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw new Error('Failed to create notification template');
    }
  }

  /**
   * Get notification template
   */
  static async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const templateDoc = await firestore.collection(this.templatesCollection).doc(templateId).get();
      
      if (!templateDoc.exists) {
        return null;
      }

      return {
        id: templateDoc.id,
        ...templateDoc.data()
      } as NotificationTemplate;
    } catch (error) {
      logger.error(`Error getting notification template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Get templates by type
   */
  static async getTemplatesByType(type: Notification['type']): Promise<NotificationTemplate[]> {
    try {
      const snapshot = await firestore
        .collection(this.templatesCollection)
        .where('type', '==', type)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationTemplate[];
    } catch (error) {
      logger.error(`Error getting templates for type ${type}:`, error);
      return [];
    }
  }

  /**
   * Create notification from template
   */
  static async createFromTemplate(
    templateId: string,
    userId: string,
    placeholders: Record<string, string> = {},
    customData: NotificationData = {}
  ): Promise<Notification> {
    try {
      const template = await this.getTemplate(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Replace placeholders in title and body
      let title = template.title;
      let body = template.body;

      Object.entries(placeholders).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      });

      // Merge template data with custom data
      const data = { ...template.defaultData, ...customData };

      const notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        type: template.type,
        subtype: template.subtype,
        title,
        body,
        data,
        priority: template.priority,
        channel: template.channel,
        category: template.category,
        read: false,
        clicked: false,
        dismissed: false,
        deliveryStatus: {
          push: 'pending',
          email: 'pending',
          sms: 'pending',
          inApp: 'pending'
        },
        expiresAt: template.settings.expiryHours > 0 
          ? new Date(Date.now() + template.settings.expiryHours * 60 * 60 * 1000)
          : undefined,
        metadata: {
          templateId
        }
      };

      return await this.createNotification(notificationData);
    } catch (error) {
      logger.error('Error creating notification from template:', error);
      throw error;
    }
  }

  /**
   * Get/Create user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const snapshot = await firestore
        .collection(this.preferencesCollection)
        .where('userId', '==', userId)
        .get();

      if (snapshot.empty) {
        // Create default preferences
        return await this.createDefaultPreferences(userId);
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationPreference[];
    } catch (error) {
      logger.error(`Error getting notification preferences for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    type: Notification['type'],
    preferences: Partial<NotificationPreference>
  ): Promise<void> {
    try {
      const existingPrefs = await firestore
        .collection(this.preferencesCollection)
        .where('userId', '==', userId)
        .where('type', '==', type)
        .limit(1)
        .get();

      const updateData = {
        ...preferences,
        updatedAt: new Date()
      };

      if (existingPrefs.empty) {
        // Create new preference
        await firestore.collection(this.preferencesCollection).add({
          userId,
          type,
          ...updateData,
          createdAt: new Date()
        });
      } else {
        // Update existing preference
        await existingPrefs.docs[0].ref.update(updateData);
      }
    } catch (error) {
      logger.error(`Error updating notification preferences for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create notification batch
   */
  static async createBatch(batchData: Omit<NotificationBatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationBatch> {
    try {
      const now = new Date();
      const batch = {
        ...batchData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.batchesCollection).add(batch);
      
      const createdBatch: NotificationBatch = {
        id: docRef.id,
        ...batch
      };

      logger.info(`Notification batch created: ${createdBatch.id}`);
      return createdBatch;
    } catch (error) {
      logger.error('Error creating notification batch:', error);
      throw new Error('Failed to create notification batch');
    }
  }

  /**
   * Get expired notifications for cleanup
   */
  static async getExpiredNotifications(limit: number = 100): Promise<Notification[]> {
    try {
      const now = new Date();
      
      const snapshot = await firestore
        .collection(this.notificationsCollection)
        .where('expiresAt', '<', now)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
    } catch (error) {
      logger.error('Error getting expired notifications:', error);
      return [];
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const expiredNotifications = await this.getExpiredNotifications(500);
      
      if (expiredNotifications.length === 0) {
        return 0;
      }

      const batch = firestore.batch();
      
      expiredNotifications.forEach(notification => {
        const notificationRef = firestore.collection(this.notificationsCollection).doc(notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();
      
      logger.info(`Cleaned up ${expiredNotifications.length} expired notifications`);
      return expiredNotifications.length;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStatistics(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    read: number;
    clicked: number;
    dismissed: number;
    byType: Record<Notification['type'], number>;
    byChannel: Record<string, number>;
    byPriority: Record<Notification['priority'], number>;
  }> {
    try {
      let query = firestore.collection(this.notificationsCollection);

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      if (startDate) {
        query = query.where('createdAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('createdAt', '<=', endDate);
      }

      const snapshot = await query.get();
      const notifications = snapshot.docs.map(doc => doc.data() as Notification);

      const stats = {
        total: notifications.length,
        read: notifications.filter(n => n.read).length,
        clicked: notifications.filter(n => n.clicked).length,
        dismissed: notifications.filter(n => n.dismissed).length,
        byType: {} as Record<Notification['type'], number>,
        byChannel: {} as Record<string, number>,
        byPriority: {} as Record<Notification['priority'], number>
      };

      // Group by type
      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byChannel[notification.channel] = (stats.byChannel[notification.channel] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting notification statistics:', error);
      throw new Error('Failed to get notification statistics');
    }
  }

  /**
   * Create default notification preferences for a user
   */
  private static async createDefaultPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const defaultPreferences: Omit<NotificationPreference, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          userId,
          type: 'message',
          channels: { push: true, email: true, sms: false, inApp: true },
          frequency: 'immediate',
          quietHours: { enabled: true, startTime: '22:00', endTime: '08:00', timezone: 'UTC' }
        },
        {
          userId,
          type: 'session',
          channels: { push: true, email: true, sms: true, inApp: true },
          frequency: 'immediate',
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC' }
        },
        {
          userId,
          type: 'community',
          channels: { push: true, email: false, sms: false, inApp: true },
          frequency: 'hourly',
          quietHours: { enabled: true, startTime: '22:00', endTime: '08:00', timezone: 'UTC' }
        },
        {
          userId,
          type: 'system',
          channels: { push: true, email: true, sms: false, inApp: true },
          frequency: 'immediate',
          quietHours: { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC' }
        }
      ];

      const createdPreferences: NotificationPreference[] = [];
      
      for (const prefData of defaultPreferences) {
        const now = new Date();
        const preference = {
          ...prefData,
          createdAt: now,
          updatedAt: now
        };

        const docRef = await firestore.collection(this.preferencesCollection).add(preference);
        
        createdPreferences.push({
          id: docRef.id,
          ...preference
        });
      }

      return createdPreferences;
    } catch (error) {
      logger.error(`Error creating default preferences for user ${userId}:`, error);
      return [];
    }
  }
}

export const notificationModel = NotificationModel;
export default NotificationModel;