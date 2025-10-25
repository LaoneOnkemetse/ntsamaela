import WalletService from '../../services/walletService';
import { getPrismaClient } from '@database/index';

// Mock the database
jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn()
}));

describe('WalletService Edge Cases', () => {
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

  describe('Edge Values and Boundary Testing', () => {
    describe('Commission Calculation Edge Cases', () => {
      it('should handle very small amounts correctly', () => {
        const result = walletService.calculateCommission(0.01);
        expect(result).toBe(0.00); // 0.01 * 0.30 = 0.003, rounded to 0.00
      });

      it('should handle amounts that result in rounding', () => {
        const result = walletService.calculateCommission(0.33);
        expect(result).toBe(0.09); // 0.33 * 0.30 = 0.099, floored to 0.09
      });

      it('should handle very large amounts', () => {
        const result = walletService.calculateCommission(999999.99);
        expect(result).toBe(299999.99); // 999999.99 * 0.30 = 299999.997, floored to 299999.99
      });

      it('should handle amounts with many decimal places', () => {
        const result = walletService.calculateCommission(33.333333);
        expect(result).toBe(9.99); // 33.333333 * 0.30 = 9.9999999, floored to 9.99
      });
    });

    describe('Recharge Amount Edge Cases', () => {
      it('should accept minimum valid amount', async () => {
        const rechargeRequest = {
          userId: 'user-1',
          amount: 0.01,
          paymentMethod: 'CARD' as const
        };

        const mockTransaction = {
          id: 'tx-1',
          userId: 'user-1',
          type: 'RECHARGE',
          amount: 0.01,
          status: 'COMPLETED',
          description: 'Wallet recharge via CARD',
          reference: undefined,
          metadata: { paymentMethod: 'CARD', originalAmount: 0.01 },
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
        expect(result.amount).toBe(0.01);
      });

      it('should accept maximum valid amount', async () => {
        const rechargeRequest = {
          userId: 'user-1',
          amount: 10000,
          paymentMethod: 'CARD' as const
        };

        const mockTransaction = {
          id: 'tx-1',
          userId: 'user-1',
          type: 'RECHARGE',
          amount: 10000,
          status: 'COMPLETED',
          description: 'Wallet recharge via CARD',
          reference: undefined,
          metadata: { paymentMethod: 'CARD', originalAmount: 10000 },
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
        expect(result.amount).toBe(10000);
      });

      it('should reject amount just above maximum', async () => {
        const rechargeRequest = {
          userId: 'user-1',
          amount: 10000.01,
          paymentMethod: 'CARD' as const
        };

        await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Recharge amount cannot exceed $10,000');
      });

      it('should reject amount just below minimum', async () => {
        const rechargeRequest = {
          userId: 'user-1',
          amount: -0.001,
          paymentMethod: 'CARD' as const
        };

        await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Recharge amount must be greater than zero');
      });
    });

    describe('Balance Edge Cases', () => {
      it('should handle zero balance correctly', async () => {
        const mockWallet = {
          userId: 'user-1',
          availableBalance: 0,
          reservedBalance: 0,
          currency: 'USD',
          updatedAt: new Date('2023-01-01'),
          user: { userType: 'CUSTOMER' }
        };

        mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

        const result = await walletService.getWalletBalance('user-1');

        expect(result.availableBalance).toBe(0);
        expect(result.reservedBalance).toBe(0);
        expect(result.totalBalance).toBe(0);
      });

      it('should handle very large balance correctly', async () => {
        const mockWallet = {
          userId: 'user-1',
          availableBalance: 999999.99,
          reservedBalance: 500000.00,
          currency: 'USD',
          updatedAt: new Date('2023-01-01'),
          user: { userType: 'CUSTOMER' }
        };

        mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

        const result = await walletService.getWalletBalance('user-1');

        expect(result.availableBalance).toBe(999999.99);
        expect(result.reservedBalance).toBe(500000.00);
        expect(result.totalBalance).toBe(1499999.99);
      });

      it('should handle precision in balance calculations', async () => {
        const mockWallet = {
          userId: 'user-1',
          availableBalance: 0.01,
          reservedBalance: 0.02,
          currency: 'USD',
          updatedAt: new Date('2023-01-01'),
          user: { userType: 'CUSTOMER' }
        };

        mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

        const result = await walletService.getWalletBalance('user-1');

        expect(result.totalBalance).toBe(0.03);
      });
    });
  });

  describe('Insufficient Funds Scenarios', () => {
    it('should handle exact balance deduction', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 50.00,
        reservedBalance: 0
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'DEBIT',
        amount: -50.00,
        status: 'COMPLETED',
        description: 'Exact balance deduction',
        reference: 'ref-123',
        metadata: { originalAmount: 50.00 },
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

      const result = await walletService.deductFunds('user-1', 50.00, 'Exact balance deduction', 'ref-123');

      expect(result.amount).toBe(-50.00);
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject deduction when balance is just insufficient', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 49.99,
        reservedBalance: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(walletService.deductFunds('user-1', 50.00, 'Test')).rejects.toThrow('Insufficient funds');
    });

    it('should handle commission reservation with exact available balance', async () => {
      const mockWallet = {
        userId: 'driver-1',
        availableBalance: 30.00,
        reservedBalance: 0
      };

      const mockReservation = {
        id: 'res-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        amount: 30.00,
        percentage: 0.30,
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'driver-1',
        type: 'COMMISSION_RESERVATION',
        amount: -30.00,
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

      const result = await walletService.reserveCommission('driver-1', 'trip-1', 100.00);

      expect(result.amount).toBe(30.00);
      expect(result.status).toBe('PENDING');
    });

    it('should reject commission reservation when balance is just insufficient', async () => {
      const mockWallet = {
        userId: 'driver-1',
        availableBalance: 29.99,
        reservedBalance: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(walletService.reserveCommission('driver-1', 'trip-1', 100.00)).rejects.toThrow('Insufficient funds for commission reservation');
    });
  });

  describe('Concurrent Transaction Handling', () => {
    it('should handle concurrent recharge attempts', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD' as const
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'RECHARGE',
        amount: 100,
        status: 'COMPLETED',
        description: 'Wallet recharge via CARD',
        reference: undefined,
        metadata: { paymentMethod: 'CARD', originalAmount: 100 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Simulate concurrent transactions
      let transactionCallCount = 0;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCallCount++;
        // Simulate some delay for concurrent testing
        await new Promise(resolve => setTimeout(resolve, 10));
        return callback(mockPrisma);
      });

      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.wallet.upsert.mockResolvedValue({});
      mockPrisma.transaction.update.mockResolvedValue(mockTransaction);

      // Execute multiple concurrent recharges
      const promises = Array(5).fill(null).map(() => 
        walletService.rechargeWallet(rechargeRequest)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(transactionCallCount).toBe(5);
      results.forEach(result => {
        expect(result.amount).toBe(100);
        expect(result.status).toBe('COMPLETED');
      });
    });

    it('should handle concurrent deduction attempts', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 100,
        reservedBalance: 0
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'DEBIT',
        amount: -20,
        status: 'COMPLETED',
        description: 'Concurrent deduction',
        reference: 'ref-123',
        metadata: { originalAmount: 20 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Simulate concurrent transactions
      let transactionCallCount = 0;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCallCount++;
        // Simulate some delay for concurrent testing
        await new Promise(resolve => setTimeout(resolve, 10));
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.update.mockResolvedValue(mockTransaction);

      // Execute multiple concurrent deductions
      const promises = Array(3).fill(null).map((_, index) => 
        walletService.deductFunds('user-1', 20, `Concurrent deduction ${index}`, `ref-${index}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(transactionCallCount).toBe(3);
      results.forEach(result => {
        expect(result.amount).toBe(-20);
        expect(result.status).toBe('COMPLETED');
      });
    });

    it('should handle race condition in commission reservation', async () => {
      const mockWallet = {
        userId: 'driver-1',
        availableBalance: 30, // Just enough for 1 reservation of 30
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

      // Simulate concurrent transactions with realistic behavior
      let transactionCallCount = 0;
      let walletBalance = 30; // Track balance changes
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCallCount++;
        // Simulate some delay for concurrent testing
        await new Promise(resolve => setTimeout(resolve, 10));
        return callback(mockPrisma);
      });

      // Mock wallet to simulate balance changes
      mockPrisma.wallet.findUnique.mockImplementation(() => {
        if (walletBalance >= 30) {
          walletBalance -= 30; // Reserve the commission
          return Promise.resolve(mockWallet);
        } else {
          return Promise.resolve({ ...mockWallet, availableBalance: walletBalance });
        }
      });

      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

      // Execute multiple concurrent commission reservations
      const promises = Array(3).fill(null).map((_, index) => 
        walletService.reserveCommission('driver-1', `trip-${index}`, 100)
      );

      // Some should succeed, some should fail due to insufficient funds
      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(3);
      expect(transactionCallCount).toBe(3);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      // At least one should succeed, at least one should fail
      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.wallet.findUnique.mockRejectedValue(new Error('Connection timeout'));

      await expect(walletService.getWalletBalance('user-1')).rejects.toThrow('Failed to get wallet balance: Connection timeout');
    });

    it('should handle transaction rollback scenarios', async () => {
      const rechargeRequest = {
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD' as const
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        // Simulate transaction failure
        throw new Error('Transaction rollback');
      });

      await expect(walletService.rechargeWallet(rechargeRequest)).rejects.toThrow('Failed to recharge wallet: Transaction rollback');
    });

    it('should handle partial transaction failures', async () => {
      const mockWallet = {
        userId: 'user-1',
        availableBalance: 100,
        reservedBalance: 0
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        type: 'DEBIT',
        amount: -50,
        status: 'PENDING',
        description: 'Test deduction',
        reference: 'ref-123',
        metadata: { originalAmount: 50 },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Simulate wallet update failure
      mockPrisma.wallet.update.mockRejectedValue(new Error('Wallet update failed'));

      await expect(walletService.deductFunds('user-1', 50, 'Test deduction', 'ref-123')).rejects.toThrow('Failed to deduct funds: Wallet update failed');
    });
  });

  describe('Data Type and Format Edge Cases', () => {
    it('should handle very long user IDs', async () => {
      const longUserId = 'a'.repeat(1000);
      
      const mockWallet = {
        userId: longUserId,
        availableBalance: 100,
        reservedBalance: 0,
        currency: 'USD',
        updatedAt: new Date('2023-01-01'),
        user: { userType: 'CUSTOMER' }
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await walletService.getWalletBalance(longUserId);

      expect(result.userId).toBe(longUserId);
    });

    it('should handle special characters in descriptions', async () => {
      const specialDescription = 'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      
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
        description: specialDescription,
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

      const result = await walletService.deductFunds('user-1', 50, specialDescription, 'ref-123');

      expect(result.description).toBe(specialDescription);
    });

    it('should handle unicode characters in metadata', async () => {
      const unicodeMetadata = {
        description: 'Test with unicode: 🚀💰💳',
        emoji: '🎉',
        chinese: '测试',
        arabic: 'اختبار'
      };

      const rechargeRequest = {
        userId: 'user-1',
        amount: 100,
        paymentMethod: 'CARD' as const,
        description: unicodeMetadata.description
      };

      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'RECHARGE',
        amount: 100,
        status: 'COMPLETED',
        description: unicodeMetadata.description,
        reference: undefined,
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

      expect(result.description).toBe(unicodeMetadata.description);
    });
  });
});
