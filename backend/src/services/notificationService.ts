import { firestore } from '../config/firebaseAdmin';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { WebSocketService } from './websocketService';
import logger from './loggerService';
import { config } from '../config/environment';

export interface NotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  sendPush?: boolean;
  sendRealtime?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  channels: {
    email?: {
      sent: boolean;
      sentAt?: Date;
    };
    sms?: {
      sent: boolean;
      sentAt?: Date;
    };
    push?: {
      sent: boolean;
      sentAt?: Date;
    };
    realtime?: {
      sent: boolean;
      sentAt?: Date;
    };
  };
}

export class NotificationService {
  /**
   * Send notification through multiple channels
   */
  static async sendNotification(options: NotificationOptions): Promise<Notification | null> {
    try {
      const {
        userId,
        title,
        message,
        type,
        priority = 'normal',
        data,
        actionUrl,
        actionText,
        sendEmail = true,
        sendSms = priority === 'urgent',
        sendPush = true,
        sendRealtime = true
      } = options;

      // Get user data for personalization
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        logger.warn(`Cannot send notification: User ${userId} not found`);
        return null;
      }

      const userData = userDoc.data();
      const userEmail = userData?.email;
      const userName = userData?.displayName || userData?.firstName || 'User';
      const userPhone = userData?.phoneNumber;
      const userPreferences = userData?.notificationPreferences || {
        email: true,
        sms: true,
        push: true,
        realtime: true
      };

      // Create notification object
      const notification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title,
        message,
        type,
        priority,
        data,
        actionUrl,
        actionText,
        read: false,
        createdAt: new Date(),
        channels: {}
      };

      // Save notification to database
      await firestore.collection('notifications').doc(notification.id).set(notification);

      // Send through different channels based on priority and user preferences
      const channels: Promise<boolean>[] = [];

      // Send via email
      if (sendEmail && userPreferences.email && userEmail) {
        const emailPromise = emailService.sendNotificationEmail(
          userEmail,
          userName,
          {
            title,
            message,
            actionUrl,
            actionText
          }
        ).then(success => {
          if (success) {
            notification.channels.email = {
              sent: true,
              sentAt: new Date()
            };
          }
          return success;
        });
        
        channels.push(emailPromise);
      }

      // Send via SMS for high priority notifications
      if (sendSms && userPreferences.sms && userPhone && (priority === 'high' || priority === 'urgent')) {
        const smsPromise = smsService.sendImportantNotification(
          userPhone,
          { title, message }
        ).then(success => {
          if (success) {
            notification.channels.sms = {
              sent: true,
              sentAt: new Date()
            };
          }
          return success;
        });
        
        channels.push(smsPromise);
      }

      // Send via WebSocket for real-time updates
      if (sendRealtime && userPreferences.realtime) {
        const realtimePromise = Promise.resolve().then(() => {
          WebSocketService.sendToUser(userId, 'notification', notification);
          notification.channels.realtime = {
            sent: true,
            sentAt: new Date()
          };
          return true;
        });
        
        channels.push(realtimePromise);
      }

      // Wait for all channels to complete
      await Promise.all(channels);

      // Update notification with channel statuses
      await firestore.collection('notifications').doc(notification.id).update({
        channels: notification.channels
      });

      logger.info(`Notification sent to user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Send session reminder notifications
   */
  static async sendSessionReminder(
    sessionId: string,
    userId: string,
    mentorId: string,
    sessionDetails: {
      title: string;
      date: string;
      time: string;
      joinUrl: string;
    }
  ): Promise<void> {
    try {
      // Get user data
      const [userDoc, mentorDoc] = await Promise.all([
        firestore.collection('users').doc(userId).get(),
        firestore.collection('users').doc(mentorId).get()
      ]);

      if (!userDoc.exists || !mentorDoc.exists) {
        logger.warn(`Cannot send session reminder: User or mentor not found`);
        return;
      }

      const userData = userDoc.data();
      const mentorData = mentorDoc.data();

      // Send reminder to user
      await this.sendNotification({
        userId,
        title: 'Your Session Starts Soon',
        message: `Your session "${sessionDetails.title}" with ${mentorData?.displayName || 'your mentor'} starts at ${sessionDetails.time}`,
        type: 'info',
        priority: 'high',
        actionUrl: sessionDetails.joinUrl,
        actionText: 'Join Session',
        data: {
          sessionId,
          type: 'session_reminder'
        }
      });

      // Send reminder to mentor
      await this.sendNotification({
        userId: mentorId,
        title: 'Your Session Starts Soon',
        message: `Your session "${sessionDetails.title}" with ${userData?.displayName || 'your student'} starts at ${sessionDetails.time}`,
        type: 'info',
        priority: 'high',
        actionUrl: sessionDetails.joinUrl,
        actionText: 'Join Session',
        data: {
          sessionId,
          type: 'session_reminder'
        }
      });

      // Send email reminders
      if (userData?.email) {
        await emailService.sendSessionReminder(
          userData.email,
          userData.displayName || userData.firstName || 'User',
          {
            id: sessionId,
            title: sessionDetails.title,
            date: sessionDetails.date,
            time: sessionDetails.time,
            mentorName: mentorData?.displayName || 'Your Mentor',
            joinUrl: sessionDetails.joinUrl
          }
        );
      }

      if (mentorData?.email) {
        await emailService.sendSessionReminder(
          mentorData.email,
          mentorData.displayName || mentorData.firstName || 'Mentor',
          {
            id: sessionId,
            title: sessionDetails.title,
            date: sessionDetails.date,
            time: sessionDetails.time,
            mentorName: userData?.displayName || 'Your Student',
            joinUrl: sessionDetails.joinUrl
          }
        );
      }

      // Send SMS reminders for users with phone numbers
      if (userData?.phoneNumber) {
        await smsService.sendSessionReminder(
          userData.phoneNumber,
          {
            title: sessionDetails.title,
            time: sessionDetails.time,
            joinUrl: sessionDetails.joinUrl
          }
        );
      }

      if (mentorData?.phoneNumber) {
        await smsService.sendSessionReminder(
          mentorData.phoneNumber,
          {
            title: sessionDetails.title,
            time: sessionDetails.time,
            joinUrl: sessionDetails.joinUrl
          }
        );
      }

      logger.info(`Session reminders sent for session ${sessionId}`);
    } catch (error) {
      logger.error('Error sending session reminders:', error);
    }
  }

  /**
   * Send security alert notification
   */
  static async sendSecurityAlert(
    userId: string,
    alertDetails: {
      type: string;
      location?: string;
      device?: string;
      time?: string;
    }
  ): Promise<void> {
    try {
      // Get user data
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        logger.warn(`Cannot send security alert: User ${userId} not found`);
        return;
      }

      const userData = userDoc.data();
      const userEmail = userData?.email;
      const userName = userData?.displayName || userData?.firstName || 'User';
      const userPhone = userData?.phoneNumber;

      // Create alert message
      const { type, location, device, time } = alertDetails;
      const timeStr = time || new Date().toLocaleTimeString();
      
      let message = `Security Alert: ${type} detected`;
      
      if (location) {
        message += ` from ${location}`;
      }
      
      if (device) {
        message += ` on ${device}`;
      }
      
      message += ` at ${timeStr}. If this wasn't you, please secure your account immediately.`;

      // Send high-priority notification
      await this.sendNotification({
        userId,
        title: 'Security Alert',
        message,
        type: 'error',
        priority: 'urgent',
        actionUrl: `${config.APP_URL}/account/security`,
        actionText: 'Secure Account',
        data: {
          type: 'security_alert',
          alertDetails
        }
      });

      // Always send security alerts via SMS if phone number is available
      if (userPhone) {
        await smsService.sendSecurityAlert(userPhone, alertDetails);
      }

      // Log security alert
      logger.warn(`Security alert for user ${userId}: ${type}`);
    } catch (error) {
      logger.error('Error sending security alert:', error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationDoc = await firestore.collection('notifications').doc(notificationId).get();
      
      if (!notificationDoc.exists) {
        return false;
      }

      const notification = notificationDoc.data() as Notification;
      
      // Verify the notification belongs to the user
      if (notification.userId !== userId) {
        return false;
      }

      // Update notification
      await firestore.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: new Date()
      });

      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let query = firestore.collection('notifications')
        .where('userId', '==', userId);
      
      if (unreadOnly) {
        query = query.where('read', '==', false);
      }
      
      // Get total count
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Get paginated results
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      const notifications = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Notification[];

      return { notifications, total };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notificationDoc = await firestore.collection('notifications').doc(notificationId).get();
      
      if (!notificationDoc.exists) {
        return false;
      }

      const notification = notificationDoc.data() as Notification;
      
      // Verify the notification belongs to the user
      if (notification.userId !== userId) {
        return false;
      }

      // Delete notification
      await firestore.collection('notifications').doc(notificationId).delete();

      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Send welcome notification and email
   */
  static async sendWelcomeNotification(userId: string, email: string, name: string): Promise<void> {
    try {
      // Send welcome notification
      await this.sendNotification({
        userId,
        title: `Welcome to ${config.APP_NAME}!`,
        message: `Thank you for joining ${config.APP_NAME}. We're excited to have you on board!`,
        type: 'success',
        priority: 'normal',
        actionUrl: `${config.APP_URL}/getting-started`,
        actionText: 'Get Started',
        data: {
          type: 'welcome'
        }
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(email, name);

      logger.info(`Welcome notification and email sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending welcome notification:', error);
    }
  }
}

export default NotificationService;