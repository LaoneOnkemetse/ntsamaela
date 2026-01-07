import { getPrismaClient } from "@database/index";
import { sendDeliveryPin } from "./smsService";

export class DeliveryService {
  /**
   * Generate and send delivery PIN to recipient
   */
  async generateAndSendDeliveryPin(
    packageId: string,
  ): Promise<{
    success: boolean;
    pin?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const prismaClient = getPrismaClient();

      // Get package details
      const packageData = await prismaClient.package.findUnique({
        where: { id: packageId },
        include: { customer: true },
      });

      if (!packageData) {
        return {
          success: false,
          error: "Package not found",
        };
      }

      // Check if package is in a state that allows PIN generation
      // PIN is generated automatically when package is picked up
      if (
        packageData.status !== "PICKED_UP" &&
        packageData.status !== "IN_TRANSIT"
      ) {
        return {
          success: false,
          error: `Delivery PIN can only be generated for picked up packages. Current status: ${packageData.status}`,
        };
      }

      // Check if PIN already exists and is still valid
      if (
        packageData.deliveryPin &&
        packageData.deliveryPinExpires &&
        packageData.deliveryPinExpires > new Date()
      ) {
        // PIN already exists and is valid, just resend it
        const recipientPhone =
          packageData.recipientPhone || packageData.customer.phone;
        const smsResult = await sendDeliveryPin(
          recipientPhone,
          packageData.deliveryPin,
          packageId,
        );

        if (smsResult.success) {
          await prismaClient.package.update({
            where: { id: packageId },
            data: {
              deliveryPinSent: true,
            },
          });
          return {
            success: true,
            message: "Existing delivery PIN has been resent",
          };
        }
      }

      // Generate 6-digit PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Update package with delivery PIN
      await prismaClient.package.update({
        where: { id: packageId },
        data: {
          deliveryPin: pin,
          deliveryPinExpires: expiresAt,
          deliveryPinSent: false, // Will be set to true after SMS is sent
        },
      });

      // Get recipient phone (use recipientPhone if available, otherwise customer phone)
      const recipientPhone =
        packageData.recipientPhone || packageData.customer.phone;

      // Send PIN via SMS
      const smsResult = await sendDeliveryPin(recipientPhone, pin, packageId);

      if (smsResult.success) {
        // Mark PIN as sent
        await prismaClient.package.update({
          where: { id: packageId },
          data: {
            deliveryPinSent: true,
          },
        });

        // Send push notification to customer
        // Note: This requires FCM token from user's device
        // For now, we'll create an in-app notification
        await prismaClient.notification.create({
          data: {
            userId: packageData.customerId,
            type: "DELIVERY_PIN_SENT",
            title: "Delivery Confirmation PIN",
            message: `A delivery confirmation PIN has been sent to ${recipientPhone}. Please provide this PIN to the driver.`,
            data: JSON.stringify({ packageId, pinSent: true }),
            isRead: false,
          },
        });

        return {
          success: true,
          pin, // Return PIN for testing/debugging (remove in production)
        };
      } else {
        return {
          success: false,
          error: smsResult.error || "Failed to send delivery PIN",
        };
      }
    } catch (error: any) {
      console.error("Error generating delivery PIN:", error);
      return {
        success: false,
        error: error.message || "Failed to generate delivery PIN",
      };
    }
  }

  /**
   * Verify delivery PIN and complete delivery
   */
  async verifyDeliveryPin(
    packageId: string,
    pin: string,
    driverId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prismaClient = getPrismaClient();

      // Get package details
      const packageData = await prismaClient.package.findUnique({
        where: { id: packageId },
        include: { customer: true },
      });

      if (!packageData) {
        return {
          success: false,
          error: "Package not found",
        };
      }

      // Check if PIN matches
      if (packageData.deliveryPin !== pin) {
        return {
          success: false,
          error: "Invalid delivery PIN",
        };
      }

      // Check if PIN has expired
      if (
        !packageData.deliveryPinExpires ||
        packageData.deliveryPinExpires < new Date()
      ) {
        return {
          success: false,
          error: "Delivery PIN has expired. Please request a new PIN.",
        };
      }

      // Verify driver has access to this package
      // Check if driver has an accepted bid for this package
      const acceptedBid = await prismaClient.bid.findFirst({
        where: {
          packageId: packageId,
          driverId: driverId,
          status: "ACCEPTED",
        },
      });

      if (!acceptedBid) {
        return {
          success: false,
          error: "You are not authorized to deliver this package",
        };
      }

      // Update package status to DELIVERED
      await prismaClient.package.update({
        where: { id: packageId },
        data: {
          status: "DELIVERED",
          deliveryPin: null, // Clear PIN after successful verification
          deliveryPinExpires: null,
          deliveryPinSent: false,
        },
      });

      // Create tracking update
      await prismaClient.packageTracking.create({
        data: {
          packageId: packageId,
          status: "DELIVERED",
          location: packageData.deliveryAddress,
          latitude: packageData.deliveryLat,
          longitude: packageData.deliveryLng,
          notes: "Delivery confirmed with PIN verification",
        },
      });

      // Send push notification to customer
      await prismaClient.notification.create({
        data: {
          userId: packageData.customerId,
          type: "DELIVERY_COMPLETED",
          title: "Delivery Completed",
          message:
            "Your package has been successfully delivered and confirmed.",
          data: JSON.stringify({ packageId, driverId, confirmed: true }),
          isRead: false,
        },
      });

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("Error verifying delivery PIN:", error);
      return {
        success: false,
        error: error.message || "Failed to verify delivery PIN",
      };
    }
  }

  /**
   * Resend delivery PIN if expired or not received
   */
  async resendDeliveryPin(
    packageId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prismaClient = getPrismaClient();

      const packageData = await prismaClient.package.findUnique({
        where: { id: packageId },
      });

      if (!packageData) {
        return {
          success: false,
          error: "Package not found",
        };
      }

      // Check if PIN exists and is expired, or if it was never sent
      const shouldResend =
        !packageData.deliveryPin ||
        !packageData.deliveryPinExpires ||
        packageData.deliveryPinExpires < new Date() ||
        !packageData.deliveryPinSent;

      if (
        !shouldResend &&
        packageData.deliveryPinExpires &&
        packageData.deliveryPinExpires > new Date()
      ) {
        return {
          success: false,
          error:
            "A valid delivery PIN already exists. Please wait for it to expire before requesting a new one.",
        };
      }

      // Generate and send new PIN
      return await this.generateAndSendDeliveryPin(packageId);
    } catch (error: any) {
      console.error("Error resending delivery PIN:", error);
      return {
        success: false,
        error: error.message || "Failed to resend delivery PIN",
      };
    }
  }
}

export const deliveryService = new DeliveryService();
