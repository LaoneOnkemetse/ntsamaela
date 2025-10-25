import { getPrismaClient } from '@database/index';
import { TransactionType, TransactionStatus, UserType } from '@shared/types';

export interface WalletBalance {
  userId: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
  currency: string;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionReservation {
  id: string;
  driverId: string;
  tripId: string;
  amount: number;
  percentage: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'CANCELLED';
  createdAt: Date;
  expiresAt: Date;
}

export interface RechargeRequest {
  userId: string;
  amount: number;
  paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  paymentReference?: string;
  description?: string;
}

export interface LowBalanceNotification {
  userId: string;
  currentBalance: number;
  threshold: number;
  userType: UserType;
  notifiedAt: Date;
}

export class WalletService {
  private get prisma() {
    try {
      const client = getPrismaClient();
      if (!client) {
        throw new Error('Prisma client is null');
      }
      return client;
    } catch (_error) {
      console.error('Failed to get Prisma client:', _error);
      throw new Error('Database connection not available');
    }
  }

  private readonly COMMISSION_PERCENTAGE = 0.30; // 30%
  private readonly LOW_BALANCE_THRESHOLD = {
    DRIVER: 100.00
  };

  /**
   * Get wallet balance for a driver
   */
  async getWalletBalance(userId: string): Promise<WalletBalance> {
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        include: {
          user: {
            select: { userType: true }
          }
        }
      });

      if (!wallet) {
        // Create wallet if it doesn't exist
        return await this.createWallet(userId);
      }

      return {
        userId: wallet.userId,
        availableBalance: wallet.availableBalance,
        reservedBalance: wallet.reservedBalance,
        totalBalance: wallet.availableBalance + wallet.reservedBalance,
        currency: wallet.currency,
        lastUpdated: wallet.updatedAt
      };
    } catch (_error) {
      throw new Error(`Failed to get wallet balance: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string, initialBalance: number = 0): Promise<WalletBalance> {
    try {
      const wallet = await this.prisma.wallet.create({
        data: {
          userId,
          availableBalance: initialBalance,
          reservedBalance: 0,
          currency: 'USD'
        }
      });

      return {
        userId: wallet.userId,
        availableBalance: wallet.availableBalance,
        reservedBalance: wallet.reservedBalance,
        totalBalance: wallet.availableBalance + wallet.reservedBalance,
        currency: wallet.currency,
        lastUpdated: wallet.updatedAt
      };
    } catch (_error) {
      throw new Error(`Failed to create wallet: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add funds to wallet (recharge)
   */
  async rechargeWallet(rechargeRequest: RechargeRequest): Promise<Transaction> {
    const { userId, amount, paymentMethod, paymentReference, description } = rechargeRequest;

    if (amount <= 0) {
      throw new Error('Recharge amount must be greater than zero');
    }

    if (amount > 10000) {
      throw new Error('Recharge amount cannot exceed $10,000');
    }

    try {
      // Start transaction
      const result = await this.prisma.$transaction(async (tx: any) => {
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'RECHARGE',
            amount,
            status: 'PENDING',
            description: description || `Wallet recharge via ${paymentMethod}`,
            reference: paymentReference,
            metadata: {
              paymentMethod,
              originalAmount: amount
            }
          }
        });

        // Update wallet balance
        await tx.wallet.upsert({
          where: { userId },
          update: {
            availableBalance: {
              increment: amount
            }
          },
          create: {
            userId,
            availableBalance: amount,
            reservedBalance: 0,
            currency: 'USD'
          }
        });

        // Update transaction status
        const updatedTransaction = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED'
          }
        });

        return updatedTransaction;
      });

      // Check for low balance notification
      await this.checkLowBalanceNotification(userId);

      return {
        id: result.id,
        userId: result.userId,
        type: result.type as TransactionType,
        amount: result.amount,
        status: result.status as TransactionStatus,
        description: result.description,
        reference: result.reference || undefined,
        metadata: result.metadata as Record<string, any> || undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (_error) {
      throw new Error(`Failed to recharge wallet: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deduct funds from wallet
   */
  async deductFunds(userId: string, amount: number, description: string, reference?: string): Promise<Transaction> {
    if (amount <= 0) {
      throw new Error('Deduction amount must be greater than zero');
    }

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        // Check if user has sufficient balance
        const wallet = await tx.wallet.findUnique({
          where: { userId }
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        if (wallet.availableBalance < amount) {
          throw new Error('Insufficient funds');
        }

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            userId,
            type: 'DEBIT',
            amount: -amount,
            status: 'PENDING',
            description,
            reference,
            metadata: {
              originalAmount: amount
            }
          }
        });

        // Update wallet balance
        await tx.wallet.update({
          where: { userId },
          data: {
            availableBalance: {
              decrement: amount
            }
          }
        });

        // Update transaction status
        const updatedTransaction = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED'
          }
        });

        return updatedTransaction;
      });

      // Check for low balance notification
      await this.checkLowBalanceNotification(userId);

      return {
        id: result.id,
        userId: result.userId,
        type: result.type as TransactionType,
        amount: result.amount,
        status: result.status as TransactionStatus,
        description: result.description,
        reference: result.reference || undefined,
        metadata: result.metadata as Record<string, any> || undefined,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };
    } catch (_error) {
      throw new Error(`Failed to deduct funds: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reserve funds for commission
   */
  async reserveCommission(driverId: string, tripId: string, tripAmount: number): Promise<CommissionReservation> {
    const commissionAmount = this.calculateCommission(tripAmount);

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        // Check if driver has sufficient balance
        const wallet = await tx.wallet.findUnique({
          where: { userId: driverId }
        });

        if (!wallet) {
          throw new Error('Driver wallet not found');
        }

        if (wallet.availableBalance < commissionAmount) {
          throw new Error('Insufficient funds for commission reservation');
        }

        // Create commission reservation
        const reservation = await tx.commissionReservation.create({
          data: {
            driverId,
            tripId,
            amount: commissionAmount,
            percentage: this.COMMISSION_PERCENTAGE,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });

        // Reserve funds in wallet
        await tx.wallet.update({
          where: { userId: driverId },
          data: {
            availableBalance: {
              decrement: commissionAmount
            },
            reservedBalance: {
              increment: commissionAmount
            }
          }
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: driverId,
            type: 'COMMISSION_RESERVATION',
            amount: -commissionAmount,
            status: 'COMPLETED',
            description: `Commission reservation for trip ${tripId}`,
            reference: tripId,
            metadata: {
              tripId,
              commissionPercentage: this.COMMISSION_PERCENTAGE,
              reservationId: reservation.id
            }
          }
        });

        return reservation;
      });

      return {
        id: result.id,
        driverId: result.driverId,
        tripId: result.tripId,
        amount: result.amount,
        percentage: result.percentage,
        status: result.status as 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'CANCELLED',
        createdAt: result.createdAt,
        expiresAt: result.expiresAt
      };
    } catch (_error) {
      throw new Error(`Failed to reserve commission: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release reserved commission
   */
  async releaseCommission(reservationId: string, status: 'CONFIRMED' | 'CANCELLED'): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: any) => {
        const reservation = await tx.commissionReservation.findUnique({
          where: { id: reservationId }
        });

        if (!reservation) {
          throw new Error('Commission reservation not found');
        }

        if (reservation.status !== 'PENDING') {
          throw new Error('Commission reservation is not in pending status');
        }

        // Update reservation status
        await tx.commissionReservation.update({
          where: { id: reservationId },
          data: { status }
        });

        if (status === 'CANCELLED') {
          // Release reserved funds back to available balance
          await tx.wallet.update({
            where: { userId: reservation.driverId },
            data: {
              availableBalance: {
                increment: reservation.amount
              },
              reservedBalance: {
                decrement: reservation.amount
              }
            }
          });

          // Create transaction record for refund
          await tx.transaction.create({
            data: {
              userId: reservation.driverId,
              type: 'COMMISSION_REFUND',
              amount: reservation.amount,
              status: 'COMPLETED',
              description: `Commission refund for cancelled trip ${reservation.tripId}`,
              reference: reservation.tripId,
              metadata: {
                tripId: reservation.tripId,
                reservationId: reservation.id
              }
            }
          });
        }
      });
    } catch (_error) {
      throw new Error(`Failed to release commission: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate commission amount
   */
  calculateCommission(tripAmount: number): number {
    if (tripAmount <= 0) {
      throw new Error('Trip amount must be greater than zero');
    }
    return Math.floor(tripAmount * this.COMMISSION_PERCENTAGE * 100) / 100; // Floor to 2 decimal places
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return transactions.map((tx: any) => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type as TransactionType,
        amount: tx.amount,
        status: tx.status as TransactionStatus,
        description: tx.description,
        reference: tx.reference || undefined,
        metadata: tx.metadata as Record<string, any> || undefined,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt
      }));
    } catch (_error) {
      throw new Error(`Failed to get transaction history: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check and send low balance notification
   */
  private async checkLowBalanceNotification(userId: string): Promise<void> {
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        include: {
          user: {
            select: { userType: true }
          }
        }
      });

      if (!wallet || !wallet.user) {
        return;
      }

      // Only check low balance for drivers
      if (wallet.user.userType !== 'DRIVER') {
        return;
      }
      
      const threshold = this.LOW_BALANCE_THRESHOLD.DRIVER;
      
      if (wallet.availableBalance <= threshold) {
        // Check if we've already notified recently (within last 24 hours)
        const recentNotification = await this.prisma.lowBalanceNotification.findFirst({
          where: {
            userId,
            notifiedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        if (!recentNotification) {
          // Create notification record
          await this.prisma.lowBalanceNotification.create({
            data: {
              userId,
              currentBalance: wallet.availableBalance,
              threshold,
              userType: wallet.user.userType as UserType
            }
          });

          // Here you would integrate with your notification service
          // For now, we'll just log it
          console.log(`Low balance notification sent to user ${userId}: Balance $${wallet.availableBalance} is below threshold $${threshold}`);
        }
      }
    } catch (_error) {
      console.error('Failed to check low balance notification:', _error);
    }
  }

  /**
   * Get low balance notifications
   */
  async getLowBalanceNotifications(userId: string): Promise<LowBalanceNotification[]> {
    try {
      const notifications = await this.prisma.lowBalanceNotification.findMany({
        where: { userId },
        orderBy: { notifiedAt: 'desc' }
      });

      return notifications.map((notification: any) => ({
        userId: notification.userId,
        currentBalance: notification.currentBalance,
        threshold: notification.threshold,
        userType: notification.userType as UserType,
        notifiedAt: notification.notifiedAt
      }));
    } catch (_error) {
      throw new Error(`Failed to get low balance notifications: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process expired commission reservations
   */
  async processExpiredReservations(): Promise<number> {
    try {
      const expiredReservations = await this.prisma.commissionReservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: new Date()
          }
        }
      });

      let processedCount = 0;

      for (const reservation of expiredReservations) {
        try {
          await this.releaseCommission(reservation.id, 'CANCELLED');
          processedCount++;
        } catch (_error) {
          // Log error in test environment but don't output to console
          if (process.env.NODE_ENV !== 'test') {
            console.error(`Failed to process expired reservation ${reservation.id}:`, _error);
          }
        }
      }

      return processedCount;
    } catch (_error) {
      throw new Error(`Failed to process expired reservations: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    }
  }
}

export default WalletService;
