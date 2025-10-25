import { Response } from 'express';
import WalletService, { RechargeRequest } from '../services/walletService';
import { AuthenticatedRequest } from '@shared/types';

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
  getWalletBalance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const balance = await this.getWalletService().getWalletBalance(userId);

      res.status(200).json({
        success: true,
        data: balance
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'WALLET_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to get wallet balance'
        }
      });
    }
  };

  /**
   * Recharge wallet
   */
  rechargeWallet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const { amount, paymentMethod, paymentReference, description } = req.body;

      // Validate required fields
      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Amount must be greater than zero' }
        });
        return;
      }

      if (!paymentMethod || !['CARD', 'BANK_TRANSFER', 'MOBILE_MONEY'].includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid payment method' }
        });
        return;
      }

      const rechargeRequest: RechargeRequest = {
        userId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentReference,
        description
      };

      const transaction = await this.getWalletService().rechargeWallet(rechargeRequest);

      res.status(200).json({
        success: true,
        data: {
          transaction,
          message: 'Wallet recharged successfully'
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RECHARGE_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to recharge wallet'
        }
      });
    }
  };

  /**
   * Get transaction history
   */
  getTransactionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit > 100) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Limit cannot exceed 100' }
        });
        return;
      }

      const transactions = await this.getWalletService().getTransactionHistory(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            limit,
            offset,
            count: transactions.length
          }
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSACTION_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to get transaction history'
        }
      });
    }
  };

  /**
   * Reserve commission (Driver only)
   */
  reserveCommission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      if (userType !== 'DRIVER') {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only drivers can reserve commission' }
        });
        return;
      }

      const { tripId, tripAmount } = req.body;

      if (!tripId || !tripAmount || tripAmount <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Trip ID and valid trip amount are required' }
        });
        return;
      }

      const reservation = await this.getWalletService().reserveCommission(userId, tripId, parseFloat(tripAmount));

      res.status(200).json({
        success: true,
        data: {
          reservation,
          message: 'Commission reserved successfully'
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'COMMISSION_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to reserve commission'
        }
      });
    }
  };

  /**
   * Release commission reservation
   */
  releaseCommission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      if (userType !== 'DRIVER') {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only drivers can release commission' }
        });
        return;
      }

      const { reservationId, status } = req.body;

      if (!reservationId || !status || !['CONFIRMED', 'CANCELLED'].includes(status)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid reservation ID and status are required' }
        });
        return;
      }

      await this.getWalletService().releaseCommission(reservationId, status);

      res.status(200).json({
        success: true,
        data: {
          message: `Commission reservation ${status.toLowerCase()} successfully`
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'COMMISSION_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to release commission'
        }
      });
    }
  };

  /**
   * Get low balance notifications
   */
  getLowBalanceNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const notifications = await this.getWalletService().getLowBalanceNotifications(userId);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          count: notifications.length
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to get low balance notifications'
        }
      });
    }
  };

  /**
   * Calculate commission (for testing/display purposes)
   */
  calculateCommission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tripAmount } = req.body;

      if (!tripAmount || tripAmount <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid trip amount is required' }
        });
        return;
      }

      const commission = this.getWalletService().calculateCommission(parseFloat(tripAmount));

      res.status(200).json({
        success: true,
        data: {
          tripAmount: parseFloat(tripAmount),
          commissionAmount: commission,
          commissionPercentage: 30,
          driverAmount: parseFloat(tripAmount) - commission
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to calculate commission'
        }
      });
    }
  };

  /**
   * Admin: Process expired reservations
   */
  processExpiredReservations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userType = req.user?.userType;

      if (userType !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        });
        return;
      }

      const processedCount = await this.getWalletService().processExpiredReservations();

      res.status(200).json({
        success: true,
        data: {
          processedCount,
          message: `Processed ${processedCount} expired reservations`
        }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: _error instanceof Error ? _error.message : 'Failed to process expired reservations'
        }
      });
    }
  };
}

export default WalletController;
