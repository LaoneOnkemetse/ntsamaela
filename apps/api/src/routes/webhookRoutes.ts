import express, { Request, Response } from "express";
import crypto from "crypto";
import { getPrismaClient } from "@database/index";
import { fcmService } from "../services/fcmService";
import { notificationService } from "../services/notificationService";

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
        reference: reference,
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

        // Send notification using notificationService
        if (dbTransaction.wallet.user) {
          await notificationService.sendNotification({
            userId: dbTransaction.wallet.user.id,
            type: "PAYMENT_SUCCESS",
            title: "Payment Successful",
            message: `Your payment of ${amount} has been processed successfully`,
            data: {
              transactionId: dbTransaction.id,
              type: "PAYMENT_SUCCESS",
            },
          });
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

      // Send notification using notificationService
      if (dbTransaction.wallet?.user) {
        await notificationService.sendNotification({
          userId: dbTransaction.wallet.user.id,
          type: "PAYMENT_FAILED",
          title: "Payment Failed",
          message: `Your payment failed: ${reason}`,
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
          userId: originalTransaction.userId,
          type: "REFUND",
          amount: amount,
          status: "COMPLETED",
          description: `Refund for transaction ${originalTransaction.id}`,
          reference: refund.reference || transactionReference,
          metadata: JSON.stringify({
            originalTransactionId: originalTransaction.id,
            refundId: refund.id,
            provider: "PAYSTACK",
            transactionId: refund.id?.toString() || `refund_${Date.now()}`,
          }),
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
 * Verify Stripe webhook signature
 */
function verifyStripeSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return !!event;
  } catch (error) {
    console.error("Stripe signature verification error:", error);
    return false;
  }
}

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 */
router.post("/stripe", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (!webhookSecret || webhookSecret === "whsec_your-stripe-webhook-secret") {
      if (!isDevelopment) {
        return res
          .status(500)
          .json({ error: "Stripe webhook secret not configured" });
      }
      console.warn(
        "⚠️  Development mode: Stripe webhook secret not configured. Signature verification skipped.",
      );
    }

    // Get payload and signature
    const payload = req.body;
    const signature = req.headers["stripe-signature"] as string;

    // Verify signature if secret is configured
    if (webhookSecret && webhookSecret !== "whsec_your-stripe-webhook-secret") {
      if (!signature) {
        console.warn("Stripe webhook: Missing signature header");
        if (!isDevelopment) {
          return res.status(400).json({ error: "Missing signature" });
        }
      } else {
        const isValid = verifyStripeSignature(payload, signature, webhookSecret);
        if (!isValid) {
          console.error("Invalid Stripe webhook signature");
          if (!isDevelopment) {
            return res.status(401).json({ error: "Invalid signature" });
          }
          console.warn(
            "⚠️  Development mode: Continuing despite invalid signature",
          );
        }
      }
    }

    // Parse webhook event
    let event: any;
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(
        payload,
        signature || "",
        webhookSecret || "",
      );
    } catch (error: any) {
      // If signature verification failed but we're in dev mode, try to parse JSON
      if (isDevelopment && !webhookSecret) {
        try {
          event = typeof payload === "string" ? JSON.parse(payload) : payload;
        } catch (parseError) {
          console.error("Failed to parse Stripe webhook payload:", parseError);
          return res.status(400).json({ error: "Invalid payload" });
        }
      } else {
        throw error;
      }
    }

    console.log("Stripe webhook received:", event.type);

    const prisma = getPrismaClient();

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object, prisma);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object, prisma);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object, prisma);
        break;

      case "refund.created":
        await handleRefundCreated(event.data.object, prisma);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    // Still return 200 to prevent Stripe from retrying
    res.status(200).json({ error: "Webhook processing failed" });
  }
});

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: any,
  prisma: any,
): Promise<void> {
  try {
    const paymentIntentId = paymentIntent.id;
    const amount = paymentIntent.amount / 100; // Convert from cents
    const currency = paymentIntent.currency.toUpperCase();
    const metadata = paymentIntent.metadata || {};

    console.log(
      `Processing successful payment: ${paymentIntentId}, Amount: ${amount} ${currency}`,
    );

    // Find transaction in database by payment intent ID (stored in reference or metadata)
    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { reference: paymentIntentId },
          {
            metadata: {
              contains: paymentIntentId,
            },
          },
        ],
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
      const existingMetadata = dbTransaction.metadata
        ? JSON.parse(dbTransaction.metadata)
        : {};
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "COMPLETED",
          metadata: JSON.stringify({
            ...existingMetadata,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: paymentIntent.latest_charge,
            currency: currency,
            providerStatus: "succeeded",
            completedAt: new Date().toISOString(),
          }),
        },
      });

      // Update wallet balance if it's a deposit
      if (dbTransaction.type === "DEPOSIT" && dbTransaction.wallet) {
        const newBalance = dbTransaction.wallet.balance + amount;
        await prisma.wallet.update({
          where: { id: dbTransaction.wallet.id },
          data: { balance: newBalance },
        });

        // Send notification using notificationService
        if (dbTransaction.wallet.user) {
          await notificationService.sendNotification({
            userId: dbTransaction.wallet.user.id,
            type: "PAYMENT_SUCCESS",
            title: "Payment Successful",
            message: `Your payment of ${amount} ${currency} has been processed successfully`,
            data: {
              transactionId: dbTransaction.id,
              amount: amount.toString(),
              currency: currency,
              type: "PAYMENT_SUCCESS",
            },
          });
        }
      }
    } else {
      console.warn(
        `Transaction not found in database for payment intent: ${paymentIntentId}`,
      );
    }
  } catch (error: any) {
    console.error("Error handling payment_intent.succeeded:", error);
    throw error;
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(
  paymentIntent: any,
  prisma: any,
): Promise<void> {
  try {
    const paymentIntentId = paymentIntent.id;
    const amount = paymentIntent.amount / 100;
    const failureReason =
      paymentIntent.last_payment_error?.message || "Payment failed";

    console.log(
      `Processing failed payment: ${paymentIntentId}, Reason: ${failureReason}`,
    );

    const dbTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { reference: paymentIntentId },
          {
            metadata: {
              contains: paymentIntentId,
            },
          },
        ],
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
      const existingMetadata = dbTransaction.metadata
        ? JSON.parse(dbTransaction.metadata)
        : {};
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: "FAILED",
          metadata: JSON.stringify({
            ...existingMetadata,
            stripePaymentIntentId: paymentIntentId,
            providerStatus: "failed",
            failureReason: failureReason,
            error: paymentIntent.last_payment_error,
          }),
        },
      });

      // Send notification
      if (dbTransaction.wallet?.user) {
        await notificationService.sendNotification({
          userId: dbTransaction.wallet.user.id,
          type: "PAYMENT_FAILED",
          title: "Payment Failed",
          message: `Your payment of ${amount} failed: ${failureReason}`,
          data: {
            transactionId: dbTransaction.id,
            amount: amount.toString(),
            type: "PAYMENT_FAILED",
            reason: failureReason,
          },
        });
      }
    } else {
      console.warn(
        `Transaction not found in database for payment intent: ${paymentIntentId}`,
      );
    }
  } catch (error: any) {
    console.error("Error handling payment_intent.payment_failed:", error);
    throw error;
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: any, prisma: any): Promise<void> {
  try {
    const chargeId = charge.id;
    const refundAmount = charge.amount_refunded / 100;
    const paymentIntentId = charge.payment_intent;

    console.log(
      `Processing refund: ${chargeId}, Amount: ${refundAmount}, Payment Intent: ${paymentIntentId}`,
    );

    // Find original transaction
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { transactionId: paymentIntentId },
          { reference: paymentIntentId },
        ],
      },
      include: {
        wallet: {
          include: {
            user: true,
          },
        },
      },
    });

    if (originalTransaction) {
      // Create refund transaction
      await prisma.transaction.create({
        data: {
          userId: originalTransaction.userId,
          type: "REFUND",
          amount: refundAmount,
          status: "COMPLETED",
          description: `Refund for transaction ${originalTransaction.id}`,
          reference: `refund_${chargeId}`,
          metadata: JSON.stringify({
            originalTransactionId: originalTransaction.id,
            chargeId: chargeId,
            paymentIntentId: paymentIntentId,
            refundId: charge.refunds?.data?.[0]?.id,
            transactionId: `refund_${chargeId}`,
          }),
        },
      });

      // Update wallet balance
      if (originalTransaction.wallet) {
        const wallet = await prisma.wallet.findUnique({
          where: { id: originalTransaction.wallet.id },
        });

        if (wallet) {
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: wallet.balance + refundAmount,
            },
          });

          // Send notification
          if (originalTransaction.wallet.user) {
            await notificationService.sendNotification({
              userId: originalTransaction.wallet.user.id,
              type: "REFUND_PROCESSED",
              title: "Refund Processed",
              message: `Your refund of ${refundAmount} has been processed`,
              data: {
                originalTransactionId: originalTransaction.id,
                amount: refundAmount.toString(),
                type: "REFUND_PROCESSED",
              },
            });
          }
        }
      }
    } else {
      console.warn(
        `Original transaction not found for refund: ${paymentIntentId}`,
      );
    }
  } catch (error: any) {
    console.error("Error handling charge.refunded:", error);
    throw error;
  }
}

/**
 * Handle refund created
 */
async function handleRefundCreated(refund: any, prisma: any): Promise<void> {
  try {
    const refundId = refund.id;
    const chargeId = refund.charge;
    const amount = refund.amount / 100;

    console.log(
      `Processing refund created: ${refundId}, Amount: ${amount}, Charge: ${chargeId}`,
    );

    // Find the charge to get payment intent
    // Note: In a real implementation, you might want to store charge IDs
    // For now, we'll try to find by charge ID in metadata
    const transactions = await prisma.transaction.findMany({
      where: {
        metadata: {
          contains: chargeId,
        },
      },
      include: {
        wallet: {
          include: {
            user: true,
          },
        },
      },
    });

    if (transactions.length > 0) {
      const originalTransaction = transactions[0];

      // Check if refund transaction already exists
      const existingRefund = await prisma.transaction.findFirst({
        where: {
          reference: `refund_${refundId}`,
        },
      });

      if (!existingRefund) {
        // Create refund transaction
        await prisma.transaction.create({
          data: {
            userId: originalTransaction.userId,
            type: "REFUND",
            amount: amount,
            status: "COMPLETED",
            description: `Refund for transaction ${originalTransaction.id}`,
            reference: `refund_${refundId}`,
            metadata: JSON.stringify({
              originalTransactionId: originalTransaction.id,
              chargeId: chargeId,
              refundId: refundId,
              transactionId: `refund_${refundId}`,
            }),
          },
        });

        // Update wallet balance
        if (originalTransaction.wallet) {
          const wallet = await prisma.wallet.findUnique({
            where: { id: originalTransaction.wallet.id },
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
    } else {
      console.warn(`Original transaction not found for refund: ${chargeId}`);
    }
  } catch (error: any) {
    console.error("Error handling refund.created:", error);
    throw error;
  }
}

export default router;
