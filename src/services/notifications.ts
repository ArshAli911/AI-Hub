import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import firebaseAuthService from './firebaseService';
import apiClient from '../api/client';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  categoryId?: string;
  sticky?: boolean;
  autoDismiss?: boolean;
  vibrate?: number[];
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  channelId?: string;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
  collapseKey?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: Notifications.AndroidImportance;
  sound?: string;
  vibrationPattern?: number[];
  lightColor?: string;
  lockscreenVisibility?: Notifications.AndroidNotificationVisibility;
  bypassDnd?: boolean;
}

export interface NotificationCategory {
  id: string;
  actions: Notifications.NotificationAction[];
  options?: {
    allowAnnouncement?: boolean;
    allowInCarPlay?: boolean;
    showTitle?: boolean;
    showSubtitle?: boolean;
    allowResponse?: boolean;
  };
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  categories: {
    messages: boolean;
    sessions: boolean;
    marketplace: boolean;
    prototypes: boolean;
    system: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private channels: Map<string, NotificationChannel> = new Map();
  private categories: Map<string, NotificationCategory> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  private async initialize(): Promise<void> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      // Set up notification categories
      await this.setupNotificationCategories();

      // Request permissions
      await this.requestPermissions();

      // Get push token
      await this.getPushToken();

      // Set up listeners
      this.setupListeners();

    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get push token for device
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID,
      });

      this.expoPushToken = token.data;
      
      // Register token with backend
      if (this.expoPushToken) {
        await this.registerPushToken(this.expoPushToken);
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      const user = firebaseAuthService.getCurrentUser();
      if (user) {
        await apiClient.post('/notifications/register-token', {
          userId: user.uid,
          token,
          platform: Platform.OS,
          deviceId: Device.osInternalBuildId || Device.deviceName
        });
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Setup notification channels for Android
   */
  private async setupNotificationChannels(): Promise<void> {
    const channels: NotificationChannel[] = [
      {
        id: 'default',
        name: 'Default',
        description: 'Default notification channel',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'messages',
        name: 'Messages',
        description: 'Chat and messaging notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      },
      {
        id: 'sessions',
        name: 'Sessions',
        description: 'Mentor session notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 500, 250, 500],
      },
      {
        id: 'marketplace',
        name: 'Marketplace',
        description: 'Marketplace and order notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'prototypes',
        name: 'Prototypes',
        description: 'Prototype and feedback notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        id: 'system',
        name: 'System',
        description: 'System and account notifications',
        importance: Notifications.AndroidImportance.LOW,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        sound: channel.sound,
        vibrationPattern: channel.vibrationPattern,
        lightColor: channel.lightColor,
        lockscreenVisibility: channel.lockscreenVisibility,
        bypassDnd: channel.bypassDnd,
      });
      this.channels.set(channel.id, channel);
    }
  }

  /**
   * Setup notification categories
   */
  private async setupNotificationCategories(): Promise<void> {
    const categories: NotificationCategory[] = [
      {
        id: 'message',
        actions: [
          {
            identifier: 'reply',
            buttonTitle: 'Reply',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
            textInput: {
              submitButtonTitle: 'Send',
              placeholder: 'Type your reply...',
            },
          },
          {
            identifier: 'mark_read',
            buttonTitle: 'Mark as Read',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
        ],
      },
      {
        id: 'session',
        actions: [
          {
            identifier: 'join',
            buttonTitle: 'Join Session',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
          {
            identifier: 'reschedule',
            buttonTitle: 'Reschedule',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
          {
            identifier: 'cancel',
            buttonTitle: 'Cancel',
            options: {
              isDestructive: true,
              isAuthenticationRequired: false,
            },
          },
        ],
      },
      {
        id: 'order',
        actions: [
          {
            identifier: 'view_order',
            buttonTitle: 'View Order',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
          {
            identifier: 'download',
            buttonTitle: 'Download',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
            },
          },
        ],
      },
    ];

    for (const category of categories) {
      await Notifications.setNotificationCategoryAsync(
        category.id,
        category.actions,
        category.options
      );
      this.categories.set(category.id, category);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      this.handleNotificationReceived(notification);
    });

    // Listen for notification responses
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle incoming notification
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    console.log('Notification received:', notification);
    // Handle notification received while app is running
  }

  /**
   * Handle notification response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    console.log('Notification response:', response);
    
    const { actionIdentifier, userText } = response;
    const data = response.notification.request.content.data;

    // Handle different action types
    switch (actionIdentifier) {
      case 'reply':
        this.handleReplyAction(data, userText);
        break;
      case 'join':
        this.handleJoinSessionAction(data);
        break;
      case 'reschedule':
        this.handleRescheduleAction(data);
        break;
      case 'cancel':
        this.handleCancelAction(data);
        break;
      case 'view_order':
        this.handleViewOrderAction(data);
        break;
      case 'download':
        this.handleDownloadAction(data);
        break;
      default:
        this.handleDefaultAction(data);
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleNotification(notification: NotificationData, trigger?: Notifications.NotificationTriggerInput): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound,
          priority: notification.priority,
        },
        trigger: trigger || null,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Send immediate local notification
   */
  async sendNotification(notification: NotificationData): Promise<string> {
    return this.scheduleNotification(notification);
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Send push notification to specific user
   */
  async sendPushNotification(userId: string, notification: PushNotificationData): Promise<void> {
    try {
      await apiClient.post('/notifications/send', {
        userId,
        notification,
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendPushNotificationToUsers(userIds: string[], notification: PushNotificationData): Promise<void> {
    try {
      await apiClient.post('/notifications/send-bulk', {
        userIds,
        notification,
      });
    } catch (error) {
      console.error('Error sending bulk push notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification settings
   */
  async getUserNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await apiClient.get('/notifications/settings');
      return response.data;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  /**
   * Update user notification settings
   */
  async updateUserNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      await apiClient.put('/notifications/settings', settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  /**
   * Handle reply action
   */
  private handleReplyAction(data: any, userText?: string): void {
    // Handle message reply
    console.log('Handling reply action:', { data, userText });
  }

  /**
   * Handle join session action
   */
  private handleJoinSessionAction(data: any): void {
    // Handle joining a session
    console.log('Handling join session action:', data);
  }

  /**
   * Handle reschedule action
   */
  private handleRescheduleAction(data: any): void {
    // Handle rescheduling a session
    console.log('Handling reschedule action:', data);
  }

  /**
   * Handle cancel action
   */
  private handleCancelAction(data: any): void {
    // Handle cancellation
    console.log('Handling cancel action:', data);
  }

  /**
   * Handle view order action
   */
  private handleViewOrderAction(data: any): void {
    // Handle viewing an order
    console.log('Handling view order action:', data);
  }

  /**
   * Handle download action
   */
  private handleDownloadAction(data: any): void {
    // Handle downloading a file
    console.log('Handling download action:', data);
  }

  /**
   * Handle default action
   */
  private handleDefaultAction(data: any): void {
    // Handle default notification tap
    console.log('Handling default action:', data);
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService; 