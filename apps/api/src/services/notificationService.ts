import { getPrismaClient } from "@database/index";
import { fcmService } from "./fcmService";

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, string>;
  userId?: string;
  userIds?: string[];
  packageId?: string;
  priority?: "high" | "normal";
}

export class NotificationService {
  /**
   * Send notification to a user (both push and in-app)
   */
  async sendNotification(
    notificationData: NotificationData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prismaClient = getPrismaClient();

      // Create in-app notification in database
      if (notificationData.userId) {
        await prismaClient.notification.create({
          data: {
            userId: notificationData.userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data
              ? JSON.stringify(notificationData.data)
              : null,
            isRead: false,
          },
        });
      }

      // Send push notification if FCM is available
      if (fcmService.isReady() && notificationData.userId) {
        // Get user's FCM tokens (you'll need to store these in your database)
        // For now, we'll try to send to the user ID as token (you should update this)
        // TODO: Get actual FCM token from user's device
        // For now, we'll just create the in-app notification
        // When you implement FCM token storage, uncomment below:
        /*
        const _fcmNotification: FCMNotification = {
          title: notificationData.title,
          body: notificationData.message,
          data: notificationData.data || {},
        };
        const user = await prismaClient.user.findUnique({
          where: { id: notificationData.userId },
          select: { fcmTokens: true } // You'll need to add this field to User model
        });

        if (user?.fcmTokens && user.fcmTokens.length > 0) {
          await sendPushNotificationToMultiple(user.fcmTokens, _fcmNotification);
        }
        */
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("Error sending notification:", error);
      return {
        success: false,
        error: error.message || "Failed to send notification",
      };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToMultiple(
    notificationData: NotificationData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prismaClient = getPrismaClient();

      if (!notificationData.userIds || notificationData.userIds.length === 0) {
        return {
          success: false,
          error: "No user IDs provided",
        };
      }

      // Create in-app notifications for all users
      const notifications = notificationData.userIds.map((userId) => ({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data
          ? JSON.stringify(notificationData.data)
          : null,
        isRead: false,
      }));

      await prismaClient.notification.createMany({
        data: notifications,
      });

      // Send push notifications if FCM is available
      if (fcmService.isReady()) {
        // TODO: Get FCM tokens for all users and send
        // For now, we'll just create in-app notifications
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("Error sending notifications to multiple users:", error);
      return {
        success: false,
        error: error.message || "Failed to send notifications",
      };
    }
  }

  /**
   * Send package status update notification
   */
  async sendPackageStatusUpdate(
    userId: string,
    packageId: string,
    status: string,
    message?: string,
  ): Promise<{ success: boolean }> {
    const statusMessages: Record<string, string> = {
      PENDING: "Your package is pending pickup",
      ACCEPTED: "A driver has accepted your package",
      PICKED_UP: "Your package has been picked up",
      IN_TRANSIT: "Your package is in transit",
      DELIVERED: "Your package has been delivered",
      CANCELLED: "Your package has been cancelled",
    };

    return await this.sendNotification({
      type: "PACKAGE_STATUS_UPDATE",
      title: "Package Status Update",
      message:
        message ||
        statusMessages[status] ||
        `Your package status has been updated to: ${status}`,
      userId,
      data: {
        packageId,
        status,
        type: "PACKAGE_STATUS_UPDATE",
      },
      priority: "high",
    });
  }

  /**
   * Send bid notification
   */
  async sendBidNotification(
    userId: string,
    packageId: string,
    bidId: string,
    amount: number,
    type: "RECEIVED" | "ACCEPTED" | "REJECTED",
  ): Promise<{ success: boolean }> {
    const messages: Record<string, string> = {
      RECEIVED: `You received a new bid of ${amount} for your package`,
      ACCEPTED: `Your bid of ${amount} has been accepted`,
      REJECTED: `Your bid of ${amount} has been rejected`,
    };

    return await this.sendNotification({
      type: `BID_${type}`,
      title: type === "RECEIVED" ? "New Bid Received" : `Bid ${type}`,
      message: messages[type],
      userId,
      data: {
        packageId,
        bidId,
        amount: amount.toString(),
        type: `BID_${type}`,
      },
      priority: "high",
    });
  }

  /**
   * Send delivery PIN notification
   */
  async sendDeliveryPinNotification(
    userId: string,
    packageId: string,
  ): Promise<{ success: boolean }> {
    return await this.sendNotification({
      type: "DELIVERY_PIN_SENT",
      title: "Delivery Confirmation PIN",
      message:
        "A delivery confirmation PIN has been sent to the recipient's phone number.",
      userId,
      data: {
        packageId,
        type: "DELIVERY_PIN_SENT",
      },
      priority: "high",
    });
  }

  /**
   * Send delivery completed notification
   */
  async sendDeliveryCompletedNotification(
    userId: string,
    packageId: string,
  ): Promise<{ success: boolean }> {
    return await this.sendNotification({
      type: "DELIVERY_COMPLETED",
      title: "Delivery Completed",
      message: "Your package has been successfully delivered and confirmed.",
      userId,
      data: {
        packageId,
        type: "DELIVERY_COMPLETED",
      },
      priority: "high",
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      const prismaClient = getPrismaClient();

      await prismaClient.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId, // Ensure user owns this notification
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      return { success: false };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      const prismaClient = getPrismaClient();

      await prismaClient.notification.updateMany({
        where: {
          userId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      return { success: false };
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      const prismaClient = getPrismaClient();

      const notifications = await prismaClient.notification.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      });

      return {
        success: true,
        data: notifications,
      };
    } catch (error: any) {
      console.error("Error getting user notifications:", error);
      return {
        success: false,
        error: error.message || "Failed to get notifications",
      };
    }
  }
}

export const notificationService = new NotificationService();
