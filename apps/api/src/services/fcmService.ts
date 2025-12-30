import * as admin from 'firebase-admin';
import { AppError } from '../utils/errors';

export interface FCMNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface FCMResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Firebase Cloud Messaging Service
 * Handles push notifications to mobile devices
 */
class FCMService {
  private app: admin.app.App | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (!projectId || !privateKey || !clientEmail) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Firebase credentials are required in production');
        }
        console.warn('⚠️  Firebase credentials not configured. Push notifications will be disabled.');
        return;
      }

      // Check if Firebase app already exists
      try {
        this.app = admin.app();
      } catch {
        // App doesn't exist, initialize it
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
      }

      this.isInitialized = true;

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Firebase Cloud Messaging initialized successfully');
        console.log(`   Project ID: ${projectId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Firebase initialization error:', errorMessage);
      
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          'FCM_INIT_ERROR',
          `Failed to initialize Firebase: ${errorMessage}`,
          500
        );
      }
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    deviceToken: string,
    notification: FCMNotification
  ): Promise<FCMResponse> {
    if (!this.app || !this.isInitialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'ntsamaela_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      console.error('FCM send error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(
    deviceTokens: string[],
    notification: FCMNotification
  ): Promise<FCMResponse> {
    if (!this.app || !this.isInitialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    if (deviceTokens.length === 0) {
      return {
        success: false,
        error: 'No device tokens provided',
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'ntsamaela_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      return {
        success: response.successCount > 0,
        messageId: response.responses
          .filter((r) => r.success)
          .map((r) => r.messageId)
          .join(', '),
        error:
          response.failureCount > 0
            ? `${response.failureCount} notifications failed`
            : undefined,
      };
    } catch (error: any) {
      console.error('FCM multicast error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notifications',
      };
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    notification: FCMNotification
  ): Promise<FCMResponse> {
    if (!this.app || !this.isInitialized) {
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'ntsamaela_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        messageId: response,
      };
    } catch (error: any) {
      console.error('FCM topic send error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Subscribe device token to a topic
   */
  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    if (!this.app || !this.isInitialized) {
      return false;
    }

    try {
      const response = await admin.messaging().subscribeToTopic([deviceToken], topic);
      return response.successCount > 0;
    } catch (error) {
      console.error('FCM subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe device token from a topic
   */
  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    if (!this.app || !this.isInitialized) {
      return false;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic([deviceToken], topic);
      return response.successCount > 0;
    } catch (error) {
      console.error('FCM unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.app !== null;
  }
}

// Export singleton instance
export const fcmService = new FCMService();

// Export convenience functions
export const sendPushNotification = async (
  deviceToken: string,
  notification: FCMNotification
): Promise<FCMResponse> => {
  return fcmService.sendToDevice(deviceToken, notification);
};

export const sendPushNotificationToMultiple = async (
  deviceTokens: string[],
  notification: FCMNotification
): Promise<FCMResponse> => {
  return fcmService.sendToDevices(deviceTokens, notification);
};

export const sendPushNotificationToTopic = async (
  topic: string,
  notification: FCMNotification
): Promise<FCMResponse> => {
  return fcmService.sendToTopic(topic, notification);
};

