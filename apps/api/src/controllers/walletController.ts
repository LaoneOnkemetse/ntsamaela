import { Request, Response } from "express";
import WalletService, { RechargeRequest } from "../services/walletService";
import { AuthenticatedRequest } from "@shared/types";
import { getPrismaClient } from "@database/index";

export class WalletController {
  private walletService: WalletService | null = null;

  constructor() {
    // Don't initialize wallet service in constructor
  }

  private getWalletService(): WalletService {
    if (!this.walletService) {
      this.walletService = new WalletService();
    }
    return this.walletService;
  }

  /**
   * Get wallet balance
   */
  getWalletBalance = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      const balance = await this.getWalletService().getWalletBalance(userId);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "WALLET_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to get wallet balance",
        },
      });
    }
  };

  /**
   * Recharge wallet
   */
  rechargeWallet = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      const { amount, paymentMethod, paymentReference, description } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Amount must be greater than zero",
          },
        });
        return;
      }

      const allowedMethods = ["CARD", "BANK_TRANSFER", "MOBILE_MONEY", "DPO"];
      if (!paymentMethod || !allowedMethods.includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payment method",
          },
        });
        return;
      }

      const rechargeRequest: RechargeRequest = {
        userId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentReference,
        description,
      };

      const provider = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();

      if (provider === "dpo") {
        const prisma = getPrismaClient();
        const user = prisma
          ? await prisma.user.findUnique({
              where: { id: userId },
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            })
          : null;

        const initiation = await this.getWalletService().initiateDpoRecharge(
          rechargeRequest,
          {
            firstName: user?.firstName || undefined,
            lastName: user?.lastName || undefined,
            email: user?.email || undefined,
          },
        );

        res.status(200).json({
          success: true,
          data: {
            transaction: initiation.transaction,
            paymentUrl: initiation.paymentUrl,
            transToken: initiation.transToken,
            companyRef: initiation.companyRef,
            message: "Redirect to DPO to complete payment",
          },
        });
        return;
      }

      const transaction =
        await this.getWalletService().rechargeWallet(rechargeRequest);

      res.status(200).json({
        success: true,
        data: {
          transaction,
          message: "Wallet recharged successfully",
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "RECHARGE_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to recharge wallet",
        },
      });
    }
  };

  /**
   * Confirm a pending DPO wallet recharge (poll after customer returns).
   */
  confirmRecharge = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      const companyRef = req.query.companyRef as string | undefined;
      const transactionToken = req.query.transactionToken as string | undefined;

      const result = await this.getWalletService().confirmDpoRecharge(
        companyRef,
        transactionToken,
      );

      if (result.transaction && result.transaction.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Not your transaction" },
        });
        return;
      }

      res.status(200).json({
        success: result.completed || result.alreadyCompleted,
        data: result,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "CONFIRM_RECHARGE_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to confirm recharge",
        },
      });
    }
  };

  /**
   * Browser return URL after DPO hosted checkout (public).
   */
  rechargeReturn = async (req: Request, res: Response): Promise<void> => {
    try {
      const companyRef =
        (req.query.CompanyRef as string) ||
        (req.query.companyRef as string) ||
        undefined;
      const transactionToken =
        (req.query.TransactionToken as string) ||
        (req.query.transactionToken as string) ||
        undefined;

      let message = "Payment received. You can return to the Ntsamaela app.";
      if (companyRef || transactionToken) {
        const result = await this.getWalletService().confirmDpoRecharge(
          companyRef,
          transactionToken,
        );
        message = result.message;
      }

      res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ntsamaela Payment</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 48px auto; padding: 0 16px; color: #1a1a1a; }
    h1 { font-size: 1.25rem; }
    p { line-height: 1.5; color: #444; }
  </style>
</head>
<body>
  <h1>Payment status</h1>
  <p>${message.replace(/</g, "&lt;")}</p>
  <p>Close this page and refresh your wallet in the app.</p>
</body>
</html>`);
    } catch (_error) {
      res.status(200).send(`<!DOCTYPE html>
<html lang="en"><body><p>Payment received. Return to the app and refresh your wallet.</p></body></html>`);
    }
  };

  /**
   * Get transaction history
   */
  getTransactionHistory = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Limit cannot exceed 100",
          },
        });
        return;
      }

      const transactions = await this.getWalletService().getTransactionHistory(
        userId,
        limit,
        offset,
      );

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            count: transactions.length,
          },
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "TRANSACTION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to get transaction history",
        },
      });
    }
  };

  /**
   * Reserve commission (Driver only)
   */
  reserveCommission = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      if (userType !== "DRIVER") {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only drivers can reserve commission",
          },
        });
        return;
      }

      const { tripId, tripAmount } = req.body;

      if (!tripId || !tripAmount || tripAmount <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Trip ID and valid trip amount are required",
          },
        });
        return;
      }

      const reservation = await this.getWalletService().reserveCommission(
        userId,
        tripId,
        parseFloat(tripAmount),
      );

      res.status(200).json({
        success: true,
        data: {
          reservation,
          message: "Commission reserved successfully",
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "COMMISSION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to reserve commission",
        },
      });
    }
  };

  /**
   * Release commission reservation
   */
  releaseCommission = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      if (userType !== "DRIVER") {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only drivers can release commission",
          },
        });
        return;
      }

      const { reservationId, status } = req.body;

      if (
        !reservationId ||
        !status ||
        !["CONFIRMED", "CANCELLED"].includes(status)
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid reservation ID and status are required",
          },
        });
        return;
      }

      await this.getWalletService().releaseCommission(reservationId, status);

      res.status(200).json({
        success: true,
        data: {
          message: `Commission reservation ${status.toLowerCase()} successfully`,
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "COMMISSION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to release commission",
        },
      });
    }
  };

  /**
   * Get commission breakdown (Driver only)
   */
  getCommissionBreakdown = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      if (userType !== "DRIVER") {
        res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only drivers can access commission breakdown",
          },
        });
        return;
      }

      const breakdown =
        await this.getWalletService().getCommissionBreakdown(userId);

      res.status(200).json({
        success: true,
        data: breakdown,
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "COMMISSION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to get commission breakdown",
        },
      });
    }
  };

  /**
   * Get low balance notifications
   */
  getLowBalanceNotifications = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
        return;
      }

      const notifications =
        await this.getWalletService().getLowBalanceNotifications(userId);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          count: notifications.length,
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "NOTIFICATION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to get low balance notifications",
        },
      });
    }
  };

  /**
   * Calculate commission (for testing/display purposes)
   */
  calculateCommission = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { tripAmount } = req.body;

      if (!tripAmount || tripAmount <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid trip amount is required",
          },
        });
        return;
      }

      const commission = this.getWalletService().calculateCommission(
        parseFloat(tripAmount),
      );

      res.status(200).json({
        success: true,
        data: {
          tripAmount: parseFloat(tripAmount),
          commissionAmount: commission,
          commissionPercentage: 30,
          driverAmount: parseFloat(tripAmount) - commission,
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "CALCULATION_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to calculate commission",
        },
      });
    }
  };

  /**
   * Admin: Process expired reservations
   */
  processExpiredReservations = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const userType = req.user?.userType;

      if (userType !== "ADMIN") {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Admin access required" },
        });
        return;
      }

      const processedCount =
        await this.getWalletService().processExpiredReservations();

      res.status(200).json({
        success: true,
        data: {
          processedCount,
          message: `Processed ${processedCount} expired reservations`,
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: "PROCESSING_ERROR",
          message:
            _error instanceof Error
              ? _error.message
              : "Failed to process expired reservations",
        },
      });
    }
  };
}

export default WalletController;
