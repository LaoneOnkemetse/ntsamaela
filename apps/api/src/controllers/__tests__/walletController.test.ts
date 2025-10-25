import { Request, Response } from 'express';
import { WalletController } from '../walletController';
import { WalletService } from '../../services/walletService';
import { AppError } from '../../utils/errors';

// Mock the WalletService
const mockWalletService = {
  getWalletBalance: jest.fn(),
  rechargeWallet: jest.fn(),
  deductFunds: jest.fn(),
  getTransactionHistory: jest.fn(),
  getTransactionById: jest.fn(),
  calculateCommission: jest.fn(),
  reserveCommission: jest.fn(),
  releaseCommission: jest.fn()
};

jest.mock('../../services/walletService', () => ({
  WalletService: jest.fn().mockImplementation(() => mockWalletService)
}));

describe('WalletController', () => {
  let walletController: WalletController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    walletController = new WalletController();
    // Mock the getWalletService method to return our mock
    (walletController as any).getWalletService = jest.fn().mockReturnValue(mockWalletService);
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123', userType: 'CUSTOMER' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletBalance', () => {
    it('should get wallet balance successfully', async () => {
      const balance = {
        userId: 'user-123',
        balance: 150.75,
        reservedBalance: 25.00,
        availableBalance: 125.75,
        currency: 'USD'
      };

      mockWalletService.getWalletBalance.mockResolvedValue(balance);

      await walletController.getWalletBalance(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getWalletBalance).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: balance
      });
    });

    it('should handle wallet not found', async () => {
      mockWalletService.getWalletBalance.mockRejectedValue(
        new AppError('Wallet not found', 404)
      );

      await walletController.getWalletBalance(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Wallet not found',
          code: 'WALLET_ERROR'
        }
      });
    });

    it('should handle service errors', async () => {
      mockWalletService.getWalletBalance.mockRejectedValue(
        new AppError('Database error', 500)
      );

      await walletController.getWalletBalance(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error',
          code: 'WALLET_ERROR'
        }
      });
    });
  });

  describe('rechargeWallet', () => {
    it('should recharge wallet successfully', async () => {
      const rechargeData = {
        amount: 100.00,
        paymentMethod: 'CARD',
        paymentReference: 'tok_123456789'
      };

      const rechargeResult = {
        transactionId: 'txn-123',
        amount: 100.00,
        newBalance: 250.75,
        status: 'COMPLETED'
      };

      mockRequest.body = rechargeData;
      mockWalletService.rechargeWallet.mockResolvedValue(rechargeResult);

      await walletController.rechargeWallet(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.rechargeWallet).toHaveBeenCalledWith({
        userId: 'user-123',
        amount: 100,
        paymentMethod: 'CARD',
        paymentReference: 'tok_123456789',
        description: undefined
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          transaction: rechargeResult,
          message: 'Wallet recharged successfully'
        }
      });
    });

    it('should handle validation errors', async () => {
      const rechargeData = {
        amount: -50.00, // Invalid: negative amount
        paymentMethod: 'credit_card',
        paymentToken: 'tok_123456789'
      };

      mockRequest.body = rechargeData;
      mockWalletService.rechargeWallet.mockRejectedValue(
        new AppError('Invalid amount', 400)
      );

      await walletController.rechargeWallet(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Amount must be greater than zero',
          code: 'VALIDATION_ERROR'
        }
      });
    });

    it('should handle payment processing errors', async () => {
      const rechargeData = {
        amount: 100.00,
        paymentMethod: 'CARD',
        paymentReference: 'invalid_token'
      };

      mockRequest.body = rechargeData;
      mockWalletService.rechargeWallet.mockRejectedValue(
        new AppError('Payment processing failed', 402)
      );

      await walletController.rechargeWallet(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Payment processing failed',
          code: 'RECHARGE_ERROR'
        }
      });
    });
  });


  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: 'RECHARGE',
          amount: 100.00,
          status: 'COMPLETED',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'txn-2',
          type: 'DEDUCTION',
          amount: -25.00,
          status: 'COMPLETED',
          createdAt: new Date('2024-01-14T15:30:00Z')
        }
      ];

      const query = { page: '1', limit: '10' };
      mockRequest.query = query;
      mockWalletService.getTransactionHistory.mockResolvedValue(transactions);

      await walletController.getTransactionHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(
        'user-123',
        10,
        0
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          transactions,
          pagination: {
            limit: 10,
            offset: 0,
            count: transactions.length
          }
        }
      });
    });

    it('should get transaction history with filters', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: 'RECHARGE',
          amount: 100.00,
          status: 'COMPLETED'
        }
      ];

      const query = {
        page: '1',
        limit: '5',
        type: 'RECHARGE',
        status: 'COMPLETED'
      };
      mockRequest.query = query;
      mockWalletService.getTransactionHistory.mockResolvedValue(transactions);

      await walletController.getTransactionHistory(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(
        'user-123',
        5,
        0
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          transactions,
          pagination: {
            limit: 5,
            offset: 0,
            count: transactions.length
          }
        }
      });
    });

    it('should handle service errors', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      mockWalletService.getTransactionHistory.mockRejectedValue(
        new AppError('Database error', 500)
      );

      await walletController.getTransactionHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database error',
          code: 'TRANSACTION_ERROR'
        }
      });
    });
  });


  describe('calculateCommission', () => {
    it('should calculate commission successfully', async () => {
      const commissionData = {
        tripAmount: 100.00,
        commissionRate: 0.30
      };

      const commissionResult = {
        tripAmount: 100.00,
        commissionRate: 0.30,
        commissionAmount: 30.00,
        netAmount: 70.00
      };

      mockRequest.body = commissionData;
      mockWalletService.calculateCommission.mockReturnValue(30);

      await walletController.calculateCommission(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.calculateCommission).toHaveBeenCalledWith(100);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          tripAmount: 100,
          commissionAmount: 30,
          commissionPercentage: 30,
          driverAmount: 70
        }
      });
    });

    it('should handle invalid trip amount', async () => {
      const commissionData = {
        tripAmount: -50.00, // Invalid: negative amount
        commissionRate: 0.30
      };

      mockRequest.body = commissionData;
      mockWalletService.calculateCommission.mockRejectedValue(
        new AppError('Invalid trip amount', 400)
      );

      await walletController.calculateCommission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Valid trip amount is required',
          code: 'VALIDATION_ERROR'
        }
      });
    });
  });

  describe('reserveCommission', () => {
    beforeEach(() => {
      // Set user type to DRIVER for commission tests
      mockRequest.user = { id: 'user-123', userType: 'DRIVER' };
    });

    it('should reserve commission successfully', async () => {
      const reservationData = {
        tripId: 'trip-123',
        tripAmount: 100.00
      };

      const reservationResult = {
        reservationId: 'res-123',
        amount: 30.00,
        status: 'PENDING',
        expiresAt: new Date('2024-01-16T10:00:00Z')
      };

      mockRequest.body = reservationData;
      mockWalletService.reserveCommission.mockResolvedValue(reservationResult);

      await walletController.reserveCommission(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.reserveCommission).toHaveBeenCalledWith(
        'user-123',
        'trip-123',
        100
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          reservation: reservationResult,
          message: 'Commission reserved successfully'
        }
      });
    });

    it('should handle insufficient funds for reservation', async () => {
      const reservationData = {
        tripId: 'trip-123',
        tripAmount: 1000.00 // More than available balance
      };

      mockRequest.body = reservationData;
      mockWalletService.reserveCommission.mockRejectedValue(
        new AppError('Insufficient funds', 400)
      );

      await walletController.reserveCommission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Insufficient funds',
          code: 'COMMISSION_ERROR'
        }
      });
    });
  });

  describe('releaseCommission', () => {
    beforeEach(() => {
      // Set user type to DRIVER for commission tests
      mockRequest.user = { id: 'user-123', userType: 'DRIVER' };
    });

    it('should release commission successfully', async () => {
      const releaseData = {
        reservationId: 'res-123',
        status: 'CONFIRMED'
      };

      const releaseResult = {
        reservationId: 'res-123',
        amount: 30.00,
        action: 'CONFIRM',
        status: 'RELEASED'
      };

      mockRequest.body = releaseData;
      mockWalletService.releaseCommission.mockResolvedValue(releaseResult);

      await walletController.releaseCommission(mockRequest as Request, mockResponse as Response);

      expect(mockWalletService.releaseCommission).toHaveBeenCalledWith(
        'res-123',
        'CONFIRMED'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Commission reservation confirmed successfully'
        }
      });
    });

    it('should handle reservation not found', async () => {
      const releaseData = {
        reservationId: 'non-existent',
        status: 'CONFIRMED'
      };

      mockRequest.body = releaseData;
      mockWalletService.releaseCommission.mockRejectedValue(
        new AppError('Reservation not found', 404)
      );

      await walletController.releaseCommission(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Reservation not found',
          code: 'COMMISSION_ERROR'
        }
      });
    });
  });

});
