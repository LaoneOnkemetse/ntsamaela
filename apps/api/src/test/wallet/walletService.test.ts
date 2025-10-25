import WalletService from '../../services/walletService';
import { getPrismaClient } from '@database/index';

// Mock the database
jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn()
}));

describe('WalletService', () => {
  let walletService: WalletService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      },
      transaction: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
      },
      commissionReservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      lowBalanceNotification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      },
      $transaction: jest.fn()
    };

    (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
    walletService = new WalletService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance for existing user', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 100.50,
        reservedBalance: 25.00,
        currency: 'USD',
        updatedAt: new Date('2023-01-01'),
        user: { userType: 'CUSTOMER' }
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await walletService.getWalletBalance('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        availableBalance: 100.50,
        reservedBalance: 25.00,
        totalBalance: 125.50,
        currency: 'USD',
        lastUpdated: mockWallet.updatedAt
      });
    });

    it('should create wallet if it does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.create.mockResolvedValue({
        userId: 'user-1',
        availableBalance: 0,
        reservedBalance: 0,
        currency: 'USD',
        updatedAt: new Date('2023-01-01')
      });

      const result = await walletService.getWalletBalance('user-1');

      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          availableBalance: 0,
          reservedBalance: 0,
          currency: 'USD'
        }
      });
      expect(result.availableBalance).toBe(0);
    });

    it('should throw error if database operation fails', async () => {
      mockPrisma.wallet.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(walletService.getWalletBalance('user-1')).rejects.toThrow('Failed to get wallet balance: Database error');
    });
  });

  describe('rechargeWallet', () => {
    it('should successfully recharge wallet', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD' as const,
        paymentReference: 'ref-123',
        description: 'Test recharge'
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'RECHARGE',
        amount: 100,
        status: 'COMPLETED',
        description: 'Test recharge',
        reference: 'ref-123',
        metadata: { paymentMethod: 'CARD', originalAmount: 100 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.wallet.upsert.mockResolvedValue({});
      mockPrisma.transaction.update.mockResolvedValue(mockTransaction);

      const result = await walletService.rechargeWallet(rechargeRequest);

      expect(result.amount).toBe(100);
      expect(result.type).toBe('RECHARGE');
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject recharge with zero amount', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 0,
        paymentMethod: 'CARD' as const
      };

      await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Recharge amount must be greater than zero');
    });

    it('should reject recharge with negative amount', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: -50,
        paymentMethod: 'CARD' as const
      };

      await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Recharge amount must be greater than zero');
    });

    it('should reject recharge exceeding maximum limit', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 15000,
        paymentMethod: 'CARD' as const
      };

      await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Recharge amount cannot exceed $10,000');
    });

    it('should handle database transaction failure', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD' as const
      };

      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Failed to recharge wallet: Transaction failed');
    });
  });

  describe('deductFunds', () => {
    it('should successfully deduct funds', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 100,
        reservedBalance: 0
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'DEBIT',
        amount: -50,
        status: 'COMPLETED',
        description: 'Test deduction',
        reference: 'ref-123',
        metadata: { originalAmount: 50 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.update.mockResolvedValue(mockTransaction);

      const result = await walletService.deductFunds('user-1', 50, 'Test deduction', 'ref-123');

      expect(result.amount).toBe(-50);
      expect(result.type).toBe('DEBIT');
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject deduction with zero amount', async () => {
      await expect(walletService.deductFunds('user-1', 0, 'Test')).rejects.toThrow('Deduction amount must be greater than zero');
    });

    it('should reject deduction with negative amount', async () => {
      await expect(walletService.deductFunds('user-1', -50, 'Test')).rejects.toThrow('Deduction amount must be greater than zero');
    });

    it('should reject deduction when wallet not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(walletService.deductFunds('user-1', 50, 'Test')).rejects.toThrow('Wallet not found');
    });

    it('should reject deduction with insufficient funds', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 25,
        reservedBalance: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(walletService.deductFunds('user-1', 50, 'Test')).rejects.toThrow('Insufficient funds');
    });
  });

  describe('calculateCommission', () => {
    it('should calculate 30% commission correctly', () => {
      const result = walletService.calculateCommission(100);
      expect(result).toBe(30);
    });

    it('should calculate commission with decimal amounts', () => {
      const result = walletService.calculateCommission(33.33);
      expect(result).toBe(9.99);
    });

    it('should floor commission to 2 decimal places', () => {
      const result = walletService.calculateCommission(33.33);
      expect(result).toBe(9.99);
    });

    it('should reject zero trip amount', () => {
      expect(() => walletService.calculateCommission(0)).toThrow('Trip amount must be greater than zero');
    });

    it('should reject negative trip amount', () => {
      expect(() => walletService.calculateCommission(-100)).toThrow('Trip amount must be greater than zero');
    });
  });

  describe('reserveCommission', () => {
    it('should successfully reserve commission', async () => {
      const mockWallet = {
        userId: 'driver-1',
        availableBalance: 100,
        reservedBalance: 0
      };

      const mockReservation = {
        id: 'res-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        amount: 30,
        percentage: 0.30,
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'driver-1',
        type: 'COMMISSION_RESERVATION',
        amount: -30,
        status: 'COMPLETED',
        description: 'Commission reservation for trip trip-1',
        reference: 'trip-1',
        metadata: {
          tripId: 'trip-1',
          commissionPercentage: 0.30,
          reservationId: 'res-1'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      const result = await walletService.reserveCommission('driver-1', 'trip-1', 100);

      expect(result.amount).toBe(30);
      expect(result.percentage).toBe(0.30);
      expect(result.status).toBe('PENDING');
    });

    it('should reject reservation when wallet not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(walletService.reserveCommission('driver-1', 'trip-1', 100)).rejects.toThrow('Driver wallet not found');
    });

    it('should reject reservation with insufficient funds', async () => {
      const mockWallet = {
        userId: 'driver-1',
        availableBalance: 20,
        reservedBalance: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(walletService.reserveCommission('driver-1', 'trip-1', 100)).rejects.toThrow('Insufficient funds for commission reservation');
    });
  });

  describe('releaseCommission', () => {
    it('should successfully release confirmed commission', async () => {
      const mockReservation = {
        id: 'res-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        amount: 30,
        status: 'PENDING'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.commissionReservation.update.mockResolvedValue({});

      await walletService.releaseCommission('res-1', 'CONFIRMED');

      expect(mockPrisma.commissionReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'CONFIRMED' }
      });
    });

    it('should refund cancelled commission', async () => {
      const mockReservation = {
        id: 'res-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        amount: 30,
        status: 'PENDING'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.commissionReservation.update.mockResolvedValue({});
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      await walletService.releaseCommission('res-1', 'CANCELLED');

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver-1' },
        data: {
          availableBalance: { increment: 30 },
          reservedBalance: { decrement: 30 }
        }
      });
    });

    it('should reject release when reservation not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(null);

      await expect(walletService.releaseCommission('res-1', 'CONFIRMED')).rejects.toThrow('Commission reservation not found');
    });

    it('should reject release when reservation not pending', async () => {
      const mockReservation = {
        id: 'res-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        amount: 30,
        status: 'CONFIRMED'
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(mockReservation);

      await expect(walletService.releaseCommission('res-1', 'CONFIRMED')).rejects.toThrow('Commission reservation is not in pending status');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history with pagination', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          userId: 'user-1',
          type: 'RECHARGE',
          amount: 100,
          status: 'COMPLETED',
          description: 'Test recharge',
          reference: 'ref-1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await walletService.getTransactionHistory('user-1', 10, 0);

      expect(result).toHaveLength(1);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
    });

    it('should handle database error', async () => {
      mockPrisma.transaction.findMany.mockRejectedValue(new Error('Database error'));

      await expect(walletService.getTransactionHistory('user-1')).rejects.toThrow('Failed to get transaction history: Database error');
    });
  });

  describe('processExpiredReservations', () => {
    it('should process expired reservations', async () => {
      const mockExpiredReservations = [
        {
          id: 'res-1',
          driverId: 'driver-1',
          tripId: 'trip-1',
          amount: 30,
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 1000)
        }
      ];

      mockPrisma.commissionReservation.findMany.mockResolvedValue(mockExpiredReservations);

      // Mock the releaseCommission method
      const releaseCommissionSpy = jest.spyOn(walletService, 'releaseCommission').mockResolvedValue();

      const result = await walletService.processExpiredReservations();

      expect(result).toBe(1);
      expect(releaseCommissionSpy).toHaveBeenCalledWith('res-1', 'CANCELLED');

      releaseCommissionSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockExpiredReservations = [
        {
          id: 'res-1',
          driverId: 'driver-1',
          tripId: 'trip-1',
          amount: 30,
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 1000)
        }
      ];

      mockPrisma.commissionReservation.findMany.mockResolvedValue(mockExpiredReservations);

      // Mock the releaseCommission method to throw error
      const releaseCommissionSpy = jest.spyOn(walletService, 'releaseCommission').mockRejectedValue(new Error('Release failed'));

      const result = await walletService.processExpiredReservations();

      expect(result).toBe(0); // Should return 0 processed due to error

      releaseCommissionSpy.mockRestore();
    });
  });
});
