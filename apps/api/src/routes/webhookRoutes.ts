import express, { Request, Response } from "express";
import crypto from "crypto";
import { getPrismaClient } from "@database/index";
import { fcmService } from "../services/fcmService";

const router = express.Router();

// Middleware to parse raw body for webhook signature verification
router.use("/paystack", express.raw({ type: "application/json" }));
router.use("/stripe", express.raw({ type: "application/json" }));

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", secret)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

/**
 * Paystack Webhook Handler
 * POST /api/webhooks/paystack
 */
router.post("/paystack", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const isDevelopment = process.env.NODE_ENV !== "production";

    // Get payload and signature
    const payload = req.body.toString();
    const signature = req.headers["x-paystack-signature"] as string;

    // Verify signature if secret is configured
    if (webhookSecret && webhookSecret !== "hsk_your-paystack-webhook-secret") {
      if (!signature) {
        console.warn("Paystack webhook: Missing signature header");
        if (!isDevelopment) {
          return res.status(400).json({ error: "Missing signature" });
        }
      } else {
        const isValid = verifyPaystackSignature(
          payload,
          signature,
          webhookSecret,
        );

        if (!isValid) {
          console.error("Invalid Paystack webhook signature");
          if (!isDevelopment) {
            return res.status(401).json({ error: "Invalid signature" });
          }
          console.warn(
            "⚠️  Development mode: Continuing despite invalid signature",
          );
        }
      }
    } else {
      // No secret configured - allow in development for testing
      if (!isDevelopment) {
        console.error("Paystack webhook secret not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }
      console.warn(
        "⚠️  Development mode: Webhook secret not configured. Signature verification skipped.",
      );
    }

    // Parse webhook event
    const event = JSON.parse(payload);
    console.log("Paystack webhook received:", event.event);

    const prisma = getPrismaClient();

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data, prisma);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data, prisma);
        break;

      case "transfer.success":
        await handleTransferSuccess(event.data, prisma);
        break;

      case "transfer.failed":
        await handleTransferFailed(event.data, prisma);
        break;

      case "refund.processed":
        await handleRefundProcessed(event.data, prisma);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event.event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    // Still return 200 to prevent Paystack from retrying
    res.status(200).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle successful charge
 */
async function handleChargeSuccess(data: any, prisma: any) {
  try {
    const transaction = data;
    const reference = transaction.reference;
    const amount = transaction.amount / 100; // Convert from kobo

    console.log(
      `Processing successful charge: ${reference}, Amount: ${amount}`,
    );

    // Extract metadata for potential future use
    const _customerEmail = transaction.customer?.email;
    const _metadata = transaction.metadata || {};

    // Find transaction in database by reference
    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ transactionId: reference }, { reference: reference }],
      },
      include: {
        wallet: {
          include: {
            user: true,
          },
        },
      },
    });

    if (dbTransaction) {
      // Update transaction status
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "COMPLETED",
          providerStatus: "success",
          completedAt: new Date(),
        },
      });

      // Update wallet balance if it's a deposit
      if (dbTransaction.type === "DEPOSIT" && dbTransaction.wallet) {
        const newBalance = dbTransaction.wallet.balance + amount;
        await prisma.wallet.update({
          where: { id: dbTransaction.wallet.id },
          data: { balance: newBalance },
        });

        // Send notification
        if (dbTransaction.wallet.user) {
          await fcmService.sendToDevice(
            dbTransaction.wallet.user.id, // This should be FCM token, not user ID
            {
              title: "Payment Successful",
              body: `Your payment of ${amount} has been processed successfully`,
              data: {
                transactionId: dbTransaction.id,
                type: "PAYMENT_SUCCESS",
              },
            },
          );
        }
      }
    } else {
      console.warn(`Transaction not found in database: ${reference}`);
    }
  } catch (error: any) {
    console.error("Error handling charge.success:", error);
    throw error;
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(data: any, prisma: any) {
  try {
    const transaction = data;
    const reference = transaction.reference;
    const reason = transaction.gateway_response || "Payment failed";

    console.log(`Processing failed charge: ${reference}, Reason: ${reason}`);

    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ transactionId: reference }, { reference: reference }],
      },
      include: {
        wallet: {
          include: {
            user: true,
          },
        },
      },
    });

    if (dbTransaction) {
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "FAILED",
          providerStatus: "failed",
          failureReason: reason,
        },
      });

      // Send notification
      if (dbTransaction.wallet?.user) {
        await fcmService.sendToDevice(dbTransaction.wallet.user.id, {
          title: "Payment Failed",
          body: `Your payment failed: ${reason}`,
          data: {
            transactionId: dbTransaction.id,
            type: "PAYMENT_FAILED",
          },
        });
      }
    }
  } catch (error: any) {
    console.error("Error handling charge.failed:", error);
    throw error;
  }
}

/**
 * Handle successful transfer
 */
async function handleTransferSuccess(data: any, prisma: any) {
  try {
    const transfer = data;
    const reference = transfer.reference;
    const amount = transfer.amount / 100;

    console.log(
      `Processing successful transfer: ${reference}, Amount: ${amount}`,
    );

    // Update related transaction if exists
    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ transactionId: reference }, { reference: reference }],
      },
    });

    if (dbTransaction && dbTransaction.type === "WITHDRAWAL") {
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "COMPLETED",
          providerStatus: "success",
          completedAt: new Date(),
        },
      });
    }
  } catch (error: any) {
    console.error("Error handling transfer.success:", error);
    throw error;
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: any, prisma: any) {
  try {
    const transfer = data;
    const reference = transfer.reference;
    const reason = transfer.gateway_response || "Transfer failed";

    console.log(`Processing failed transfer: ${reference}, Reason: ${reason}`);

    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [{ transactionId: reference }, { reference: reference }],
      },
    });

    if (dbTransaction && dbTransaction.type === "WITHDRAWAL") {
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "FAILED",
          providerStatus: "failed",
          failureReason: reason,
        },
      });
    }
  } catch (error: any) {
    console.error("Error handling transfer.failed:", error);
    throw error;
  }
}

/**
 * Handle processed refund
 */
async function handleRefundProcessed(data: any, prisma: any) {
  try {
    const refund = data;
    const transactionReference = refund.transaction?.reference;
    const amount = refund.amount / 100;

    console.log(
      `Processing refund: ${transactionReference}, Amount: ${amount}`,
    );

    // Find original transaction
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { transactionId: transactionReference },
          { reference: transactionReference },
        ],
      },
    });

    if (originalTransaction) {
      // Create refund transaction
      await prisma.transaction.create({
        data: {
          walletId: originalTransaction.walletId,
          type: "REFUND",
          amount: amount,
          status: "COMPLETED",
          transactionId: refund.id?.toString() || `refund_${Date.now()}`,
          reference: refund.reference || transactionReference,
          provider: "PAYSTACK",
          metadata: {
            originalTransactionId: originalTransaction.id,
            refundId: refund.id,
          },
        },
      });

      // Update wallet balance
      if (originalTransaction.walletId) {
        const wallet = await prisma.wallet.findUnique({
          where: { id: originalTransaction.walletId },
        });

        if (wallet) {
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: wallet.balance + amount,
            },
          });
        }
      }
    }
  } catch (error: any) {
    console.error("Error handling refund.processed:", error);
    throw error;
  }
}

/**
 * Stripe Webhook Handler (placeholder for future implementation)
 * POST /api/webhooks/stripe
 */
router.post("/stripe", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res
        .status(500)
        .json({ error: "Stripe webhook secret not configured" });
    }

    // TODO: Implement Stripe webhook handler
    res
      .status(200)
      .json({
        received: true,
        message: "Stripe webhook handler not yet implemented",
      });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    res.status(200).json({ error: "Webhook processing failed" });
  }
});

export default router;
