import { Router } from "express";
import WalletController from "../controllers/walletController";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware";
import { requireUserType } from "../middleware/roleAuth";
import { validateRequest } from "../middleware/validationMiddleware";

const router = Router();
const walletController = new WalletController();

/**
 * @route GET /api/wallet/balance
 * @desc Get wallet balance
 * @access Private
 */
router.get(
  "/balance",
  authenticateToken,
  requireUserType(["DRIVER", "CUSTOMER"]),
  walletController.getWalletBalance,
);

/**
 * @route GET /api/wallet/commission-breakdown
 * @desc Get driver commission breakdown
 * @access Private (Driver only)
 */
router.get(
  "/commission-breakdown",
  authenticateToken,
  requireUserType(["DRIVER"]),
  walletController.getCommissionBreakdown,
);

// Backward compatible typo route (some clients used "commision")
router.get(
  "/commision-breakdown",
  authenticateToken,
  requireUserType(["DRIVER"]),
  walletController.getCommissionBreakdown,
);

/**
 * @route POST /api/wallet/recharge
 * @desc Recharge wallet
 * @access Private
 */
router.post(
  "/recharge",
  authenticateToken,
  requireUserType(["DRIVER", "CUSTOMER"]),
  validateRequest({
    body: {
      amount: { type: "number", required: true, min: 0.01, max: 10000 },
      paymentMethod: {
        type: "string",
        enum: ["CARD", "BANK_TRANSFER", "MOBILE_MONEY", "DPO"],
        required: true,
      },
      paymentReference: { type: "string", required: false },
      description: { type: "string", required: false },
    },
  }),
  walletController.rechargeWallet,
);

/**
 * @route GET /api/wallet/recharge/confirm
 * @desc Confirm a pending DPO recharge
 * @access Private
 */
router.get(
  "/recharge/confirm",
  authenticateToken,
  requireUserType(["DRIVER", "CUSTOMER"]),
  walletController.confirmRecharge,
);

/**
 * @route GET /api/wallet/recharge/return
 * @desc Browser redirect after DPO checkout
 * @access Public
 */
router.get("/recharge/return", walletController.rechargeReturn);

/**
 * @route GET /api/wallet/transactions
 * @desc Get transaction history
 * @access Private
 */
router.get(
  "/transactions",
  authenticateToken,
  requireUserType(["DRIVER", "CUSTOMER"]),
  validateRequest({
    query: {
      limit: { type: "number", required: false, min: 1, max: 100 },
      offset: { type: "number", required: false, min: 0 },
    },
  }),
  walletController.getTransactionHistory,
);

/**
 * @route POST /api/wallet/commission/reserve
 * @desc Reserve commission for trip
 * @access Private (Driver only)
 */
router.post(
  "/commission/reserve",
  authenticateToken,
  requireUserType(["DRIVER"]),
  validateRequest({
    body: {
      tripId: { type: "string", required: true },
      tripAmount: { type: "number", required: true, min: 0.01 },
    },
  }),
  walletController.reserveCommission,
);

/**
 * @route POST /api/wallet/commission/release
 * @desc Release commission reservation
 * @access Private (Driver only)
 */
router.post(
  "/commission/release",
  authenticateToken,
  requireUserType(["DRIVER"]),
  validateRequest({
    body: {
      reservationId: { type: "string", required: true },
      status: {
        type: "string",
        enum: ["CONFIRMED", "CANCELLED"],
        required: true,
      },
    },
  }),
  walletController.releaseCommission,
);

/**
 * @route GET /api/wallet/notifications
 * @desc Get low balance notifications
 * @access Private
 */
router.get(
  "/notifications",
  authenticateToken,
  requireUserType(["DRIVER"]),
  walletController.getLowBalanceNotifications,
);

/**
 * @route POST /api/wallet/commission/calculate
 * @desc Calculate commission amount
 * @access Private
 */
router.post(
  "/commission/calculate",
  authenticateToken,
  requireUserType(["DRIVER"]),
  validateRequest({
    body: {
      tripAmount: { type: "number", required: true, min: 0.01 },
    },
  }),
  walletController.calculateCommission,
);

/**
 * @route POST /api/wallet/admin/process-expired
 * @desc Process expired commission reservations
 * @access Private (Admin only)
 */
router.post(
  "/admin/process-expired",
  authenticateToken,
  requireAdmin,
  walletController.processExpiredReservations,
);

export default router;
