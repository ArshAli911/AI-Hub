import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { RealTimeNotification } from '../types/realtime';
import { WebSocketService } from './websocketService';
import { AuditService } from './auditService';
import logger from './loggerService';

export class NotificationService {
  private static db = getFirestore();
  private static messaging = getMessaging();

  /**
   * Send notification to specific device
   */
  static async sendToDevice(
    token: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<string> {
    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info(`Notification sent to device: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending notification to device:', error);
      throw error;
    }
  }

  /**
   * Send notification to topic
   */
  static async sendToTopic(
    topic: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<string> {
    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      logger.info(`Notification sent to topic ${topic}: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending notification to topic:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification to user
   */
  static async sendRealTimeNotification(
    userId: string,
    notification: Omit<RealTimeNotification, 'id' | 'timestamp' | 'read'>
  ): Promise<RealTimeNotification> {
    try {
      const realTimeNotification: RealTimeNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...notification,
        timestamp: Date.now(),
        read: false,
      };

      // Save to Firestore
      await this.db.collection('notifications').doc(realTimeNotification.id).set(realTimeNotification);

      // Send via WebSocket
      await WebSocketService.sendNotification(userId, realTimeNotification);

      // Log the notification
      await AuditService.logEvent(
        'system',
        'system@aihub.com',
        'REALTIME_NOTIFICATION_SENT',
        'notification',
        { userId, notificationId: realTimeNotification.id, type: notification.type },
        userId
      );

      logger.info(`Real-time notification sent to user ${userId}: ${notification.title}`);

      return realTimeNotification;
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    notification: Omit<RealTimeNotification, 'id' | 'timestamp' | 'read'>
  ): Promise<RealTimeNotification[]> {
    try {
      const notifications: RealTimeNotification[] = [];

      // Send to each user
      for (const userId of userIds) {
        try {
          const realTimeNotification = await this.sendRealTimeNotification(userId, notification);
          notifications.push(realTimeNotification);
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
        }
      }

      logger.info(`Sent notifications to ${notifications.length}/${userIds.length} users`);
      return notifications;
    } catch (error) {
      logger.error('Error sending notifications to multiple users:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<RealTimeNotification[]> {
    try {
      let query = this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .offset(offset);

      if (unreadOnly) {
        query = query.where('read', '==', false);
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as RealTimeNotification[];
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: Date.now(),
      });

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const batch = this.db.batch();
      const notificationsSnapshot = await this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      notificationsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: Date.now(),
        });
      });

      await batch.commit();

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await this.db.collection('notifications').doc(notificationId).delete();

      logger.info(`Notification ${notificationId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    try {
      const notificationsSnapshot = await this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .get();

      const notifications = notificationsSnapshot.docs.map(doc => doc.data() as RealTimeNotification);

      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<string, number>,
      };

      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to topic
   */
  static async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${response.successCount}/${tokens.length} tokens to topic ${topic}`);
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from topic
   */
  static async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed ${response.successCount}/${tokens.length} tokens from topic ${topic}`);
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }
} 