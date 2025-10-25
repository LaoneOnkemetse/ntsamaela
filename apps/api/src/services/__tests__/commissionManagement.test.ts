import bidService from '../bidService';
import { getPrismaClient } from '@database/index';
import { AppError } from '../../utils/errors';

// Mock Prisma client
jest.mock('@database/index');
const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  commissionReservation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  transaction: {
    create: jest.fn()
  }
};

(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

describe('Commission Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('preAuthorizeCommission', () => {
    const mockWallet = {
      id: 'wallet1',
      userId: 'driver1',
      availableBalance: 100,
      reservedBalance: 0,
      currency: 'USD'
    };

    it('should pre-authorize commission successfully', async () => {
      const mockReservation = {
        id: 'reservation1',
        driverId: 'driver1',
        tripId: 'trip1',
        amount: 15,
        percentage: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        reservedBalance: 15
      });

      const result = await bidService.preAuthorizeCommission('driver1', 'trip1', 15);

      expect(result.id).toBe('reservation1');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          reservedBalance: {
            increment: 15
          }
        }
      });
    });

    it('should throw error if wallet not found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(
        bidService.preAuthorizeCommission('driver1', 'trip1', 15)
      ).rejects.toThrow(
        new AppError('Driver wallet not found', 'WALLET_NOT_FOUND', 404)
      );
    });

    it('should throw error for insufficient balance', async () => {
      const lowBalanceWallet = {
        ...mockWallet,
        availableBalance: 10 // Less than required 15
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(lowBalanceWallet);

      await expect(
        bidService.preAuthorizeCommission('driver1', 'trip1', 15)
      ).rejects.toThrow(
        new AppError('Insufficient wallet balance for commission', 'INSUFFICIENT_BALANCE', 400)
      );
    });

    it('should handle existing reserved balance', async () => {
      const walletWithReserved = {
        ...mockWallet,
        reservedBalance: 20
      };

      const mockReservation = {
        id: 'reservation1',
        driverId: 'driver1',
        tripId: 'trip1',
        amount: 15,
        percentage: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(walletWithReserved);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({
        ...walletWithReserved,
        reservedBalance: 35
      });

      const result = await bidService.preAuthorizeCommission('driver1', 'trip1', 15);

      expect(result.id).toBe('reservation1');
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          reservedBalance: {
            increment: 15
          }
        }
      });
    });
  });

  describe('confirmCommissionReservation', () => {
    const mockReservation = {
      id: 'reservation1',
      driverId: 'driver1',
      tripId: 'trip1',
      amount: 15,
      percentage: 30,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    it('should confirm commission reservation successfully', async () => {
      mockPrisma.commissionReservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.commissionReservation.update.mockResolvedValue({
        ...mockReservation,
        status: 'CONFIRMED'
      });
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      await bidService.confirmCommissionReservation('reservation1');

      expect(mockPrisma.commissionReservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation1' },
        data: { status: 'CONFIRMED' }
      });

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          reservedBalance: {
            decrement: 15
          }
        }
      });

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'driver1',
          type: 'COMMISSION',
          amount: 15,
          status: 'COMPLETED',
          description: 'Commission payment for trip trip1',
          reference: 'reservation1'
        }
      });
    });

    it('should throw error if reservation not found', async () => {
      mockPrisma.commissionReservation.findUnique.mockResolvedValue(null);

      await expect(
        bidService.confirmCommissionReservation('nonexistent')
      ).rejects.toThrow(
        new AppError('Commission reservation not found', 'RESERVATION_NOT_FOUND', 404)
      );
    });

    it('should throw error if reservation not pending', async () => {
      const confirmedReservation = {
        ...mockReservation,
        status: 'CONFIRMED'
      };

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(confirmedReservation);

      await expect(
        bidService.confirmCommissionReservation('reservation1')
      ).rejects.toThrow(
        new AppError('Commission reservation is not pending', 'INVALID_RESERVATION_STATUS', 400)
      );
    });
  });

  describe('releaseCommissionReservation', () => {
    const mockReservation = {
      id: 'reservation1',
      driverId: 'driver1',
      tripId: 'trip1',
      amount: 15,
      percentage: 30,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    it('should release commission reservation successfully', async () => {
      mockPrisma.commissionReservation.findUnique.mockResolvedValue(mockReservation);
      mockPrisma.commissionReservation.update.mockResolvedValue({
        ...mockReservation,
        status: 'RELEASED'
      });
      mockPrisma.wallet.update.mockResolvedValue({});

      await bidService.releaseCommissionReservation('reservation1');

      expect(mockPrisma.commissionReservation.update).toHaveBeenCalledWith({
        where: { id: 'reservation1' },
        data: { status: 'RELEASED' }
      });

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          reservedBalance: {
            decrement: 15
          }
        }
      });
    });

    it('should handle already released reservation', async () => {
      const releasedReservation = {
        ...mockReservation,
        status: 'RELEASED'
      };

      mockPrisma.commissionReservation.findUnique.mockResolvedValue(releasedReservation);

      await bidService.releaseCommissionReservation('reservation1');

      // Should not update anything if already released
      expect(mockPrisma.commissionReservation.update).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    });

    it('should throw error if reservation not found', async () => {
      mockPrisma.commissionReservation.findUnique.mockResolvedValue(null);

      await expect(
        bidService.releaseCommissionReservation('nonexistent')
      ).rejects.toThrow(
        new AppError('Commission reservation not found', 'RESERVATION_NOT_FOUND', 404)
      );
    });
  });

  describe('cleanupExpiredReservations', () => {
    it('should cleanup expired reservations', async () => {
      const expiredReservations = [
        {
          id: 'reservation1',
          driverId: 'driver1',
          tripId: 'trip1',
          amount: 15,
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          id: 'reservation2',
          driverId: 'driver2',
          tripId: 'trip2',
          amount: 20,
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 7200000) // 2 hours ago
        }
      ];

      mockPrisma.commissionReservation.findMany.mockResolvedValue(expiredReservations);
      mockPrisma.commissionReservation.findUnique
        .mockResolvedValueOnce(expiredReservations[0])
        .mockResolvedValueOnce(expiredReservations[1]);
      mockPrisma.commissionReservation.update.mockResolvedValue({});
      mockPrisma.wallet.update.mockResolvedValue({});

      const cleanedCount = await bidService.cleanupExpiredReservations();

      expect(cleanedCount).toBe(2);
      expect(mockPrisma.commissionReservation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });

    it('should handle no expired reservations', async () => {
      mockPrisma.commissionReservation.findMany.mockResolvedValue([]);

      const cleanedCount = await bidService.cleanupExpiredReservations();

      expect(cleanedCount).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Suppress console.error for this test since we're testing error handling
      const originalConsoleError = console.error;
      console.error = jest.fn();

      mockPrisma.commissionReservation.findMany.mockRejectedValue(new Error('Database error'));

      const cleanedCount = await bidService.cleanupExpiredReservations();

      expect(cleanedCount).toBe(0);

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('Edge Cases and Concurrency', () => {
    it('should handle concurrent commission reservations', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'driver1',
        availableBalance: 100,
        reservedBalance: 0,
        currency: 'USD'
      };

      const mockReservation = {
        id: 'reservation1',
        driverId: 'driver1',
        tripId: 'trip1',
        amount: 15,
        percentage: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        reservedBalance: 15
      });

      // Simulate concurrent reservations
      const promises = Array(3).fill(null).map((_, i) => 
        bidService.preAuthorizeCommission('driver1', `trip${i}`, 15)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.status).toBe('PENDING');
      });
    });

    it('should handle database transaction failures', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'driver1',
        availableBalance: 100,
        reservedBalance: 0,
        currency: 'USD'
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockRejectedValue(new Error('Database error'));

      await expect(
        bidService.preAuthorizeCommission('driver1', 'trip1', 15)
      ).rejects.toThrow(
        new AppError('Failed to pre-authorize commission', 'COMMISSION_AUTHORIZATION_FAILED', 500)
      );
    });

    it('should handle very large commission amounts', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'driver1',
        availableBalance: 1000000,
        reservedBalance: 0,
        currency: 'USD'
      };

      const mockReservation = {
        id: 'reservation1',
        driverId: 'driver1',
        tripId: 'trip1',
        amount: 100000,
        percentage: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        reservedBalance: 100000
      });

      const result = await bidService.preAuthorizeCommission('driver1', 'trip1', 100000);

      expect(result.id).toBe('reservation1');
      expect(result.status).toBe('PENDING');
    });

    it('should handle decimal precision correctly', async () => {
      const mockWallet = {
        id: 'wallet1',
        userId: 'driver1',
        availableBalance: 100,
        reservedBalance: 0,
        currency: 'USD'
      };

      const mockReservation = {
        id: 'reservation1',
        driverId: 'driver1',
        tripId: 'trip1',
        amount: 15.33,
        percentage: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.commissionReservation.create.mockResolvedValue(mockReservation);
      mockPrisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        reservedBalance: 15.33
      });

      const result = await bidService.preAuthorizeCommission('driver1', 'trip1', 15.33);

      expect(result.id).toBe('reservation1');
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'driver1' },
        data: {
          reservedBalance: {
            increment: 15.33
          }
        }
      });
    });
  });
});
