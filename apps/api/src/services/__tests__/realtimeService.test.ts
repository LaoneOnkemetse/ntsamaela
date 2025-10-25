import { RealtimeService } from '../realtimeService';
import { getPrismaClient } from '@database/index';
// import { AppError } from '../../utils/AppError';

// Mock the database client
const mockPrisma = {
  chatRoom: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn()
  },
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  packageTracking: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  package: {
    findUnique: jest.fn()
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('@database/index', () => ({
  getPrismaClient: jest.fn(() => mockPrisma)
}));

// Mock Socket.IO
const mockSocket = {
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis()
};

const mockIo = {
  to: jest.fn().mockReturnValue({
    emit: jest.fn()
  }),
  emit: jest.fn(),
  sockets: {
    sockets: new Map()
  }
};

describe('RealtimeService', () => {
  let realtimeService: RealtimeService;

  beforeEach(() => {
    const mockServer = {} as any;
    realtimeService = new RealtimeService(mockServer);
    (realtimeService as any).io = mockIo;
    (realtimeService as any).prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('Chat Room Management', () => {
    it('should create a chat room successfully', async () => {
      const packageId = 'package-123';
      const customerId = 'customer-123';
      const driverId = 'driver-123';

      const mockChatRoom = {
        id: 'chat-room-123',
        packageId,
        customerId,
        driverId,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        package: null,
        customer: null,
        driver: null,
        messages: []
      };

      mockPrisma.chatRoom.create.mockResolvedValue(mockChatRoom);

      const result = await realtimeService.createChatRoom(packageId, customerId, driverId);

      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith({
        data: {
          packageId,
          customerId,
          driverId,
          status: 'ACTIVE'
        },
        include: {
          package: true,
          customer: true,
          driver: {
            include: { user: true }
          }
        }
      });
      expect(result).toEqual({
        ...mockChatRoom,
        createdAt: mockChatRoom.createdAt.toISOString(),
        updatedAt: mockChatRoom.updatedAt.toISOString()
      });
    });

    it('should throw error when chat room creation fails', async () => {
      const packageId = 'package-123';
      const customerId = 'customer-123';
      const driverId = 'driver-123';

      mockPrisma.chatRoom.create.mockRejectedValue(new Error('Database error'));

      await expect(realtimeService.createChatRoom(packageId, customerId, driverId))
        .rejects.toThrow('Failed to create chat room');
    });
  });

  describe('Chat Messages', () => {
    it('should send a message successfully', async () => {
      const chatRoomId = 'chat-room-123';
      const senderId = 'user-123';
      const message = 'Hello, how are you?';

      const mockMessage = {
        id: 'message-123',
        chatRoomId,
        senderId,
        senderType: 'CUSTOMER',
        message,
        messageType: 'TEXT',
        isRead: false,
        createdAt: new Date()
      };

      mockPrisma.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await realtimeService.sendMessage(chatRoomId, senderId, 'CUSTOMER', message, 'TEXT');

      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          chatRoomId,
          senderId,
          senderType: 'CUSTOMER',
          message,
          messageType: 'TEXT',
          isRead: false
        }
      });
      expect(result).toEqual({
        ...mockMessage,
        createdAt: mockMessage.createdAt.toISOString()
      });
    });

    it('should get chat messages successfully', async () => {
      const chatRoomId = 'chat-room-123';
      const mockMessages = [
        {
          id: 'message-1',
          chatRoomId,
          senderId: 'user-1',
          senderType: 'CUSTOMER',
          message: 'Hello',
          messageType: 'TEXT',
          isRead: false,
          createdAt: new Date()
        },
        {
          id: 'message-2',
          chatRoomId,
          senderId: 'user-2',
          senderType: 'DRIVER',
          message: 'Hi there',
          messageType: 'TEXT',
          isRead: false,
          createdAt: new Date()
        }
      ];

      mockPrisma.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await realtimeService.getChatMessages(chatRoomId);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith({
        where: { chatRoomId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });
      expect(result).toEqual(mockMessages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString()
      })));
    });

    it('should mark message as read successfully', async () => {
      const messageId = 'message-123';
      const userId = 'user-123';

      mockPrisma.chatMessage.update.mockResolvedValue({});

      await realtimeService.markMessageAsRead(messageId);

      expect(mockPrisma.chatMessage.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          isRead: true
        }
      });
    });
  });

  describe('Package Tracking', () => {
    it('should create tracking update successfully', async () => {
      const packageId = 'package-123';
      const status = 'IN_TRANSIT';
      const location = { lat: 40.7128, lng: -74.0060 };

      const mockTrackingUpdate = {
        id: 'tracking-123',
        packageId,
        status,
        location,
        latitude: location.lat,
        longitude: location.lng,
        timestamp: new Date(),
        notes: null
      };

      mockPrisma.packageTracking.create.mockResolvedValue(mockTrackingUpdate);
      
      // Mock the package lookup
      mockPrisma.package.findUnique.mockResolvedValue({
        id: packageId,
        customerId: 'customer-123',
        customer: { id: 'customer-123' }
      });
      
      // Mock the notification creation
      const mockNotification = {
        id: 'notification-123',
        userId: 'customer-123',
        type: 'PACKAGE_STATUS',
        title: 'Package Status Update',
        message: `Your package status has been updated to: ${status}`,
        data: JSON.stringify({ packageId, status, tracking: mockTrackingUpdate }),
        isRead: false,
        createdAt: new Date()
      };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await realtimeService.createTrackingUpdate(packageId, status, location);

      expect(mockPrisma.packageTracking.create).toHaveBeenCalledWith({
        data: {
          packageId,
          status,
          location
        }
      });
      expect(result).toEqual({
        ...mockTrackingUpdate,
        timestamp: mockTrackingUpdate.timestamp.toISOString()
      });
    });

    it('should get package tracking successfully', async () => {
      const packageId = 'package-123';
      const mockTrackingUpdates = [
        {
          id: 'tracking-1',
          packageId,
          status: 'PICKED_UP',
          location: { lat: 40.7128, lng: -74.0060 },
          latitude: null,
          longitude: null,
          notes: null,
          timestamp: new Date()
        },
        {
          id: 'tracking-2',
          packageId,
          status: 'IN_TRANSIT',
          location: { lat: 40.7589, lng: -73.9851 },
          latitude: null,
          longitude: null,
          notes: null,
          timestamp: new Date()
        }
      ];

      mockPrisma.packageTracking.findMany.mockResolvedValue(mockTrackingUpdates);

      const result = await realtimeService.getPackageTracking(packageId);

      expect(mockPrisma.packageTracking.findMany).toHaveBeenCalledWith({
        where: { packageId },
        orderBy: { timestamp: 'desc' }
      });
      expect(result).toEqual(mockTrackingUpdates.map(tracking => ({
        ...tracking,
        timestamp: tracking.timestamp.toISOString()
      })));
    });
  });

  describe('Notifications', () => {
    it('should create notification successfully', async () => {
      const userId = 'user-123';
      const type = 'PACKAGE_UPDATE';
      const title = 'Package Update';
      const message = 'Your package has been picked up';
      const data = { packageId: 'package-123' };

      const mockNotification = {
        id: 'notification-123',
        userId,
        type,
        title,
        message,
        data: JSON.stringify(data),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await realtimeService.createNotification(userId, type, title, message, data);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          title,
          message,
          data: JSON.stringify(data),
          isRead: false
        }
      });
      expect(result).toEqual({
        ...mockNotification,
        body: mockNotification.message,
        read: false,
        data: JSON.parse(mockNotification.data),
        createdAt: mockNotification.createdAt.toISOString()
      });
    });

    it('should get user notifications successfully', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        {
          id: 'notification-1',
          userId,
          type: 'PACKAGE_UPDATE',
          title: 'Package Update',
          message: 'Your package has been picked up',
          body: 'Your package has been picked up',
          data: null,
          read: false,
          isRead: false,
          createdAt: new Date()
        },
        {
          id: 'notification-2',
          userId,
          type: 'BID_RECEIVED',
          title: 'New Bid',
          message: 'You received a new bid',
          body: 'You received a new bid',
          data: null,
          read: true,
          isRead: true,
          createdAt: new Date()
        }
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await realtimeService.getUserNotifications(userId);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });
      expect(result).toEqual(mockNotifications.map(notification => ({
        ...notification,
        createdAt: notification.createdAt.toISOString()
      })));
    });

    it('should mark notification as read successfully', async () => {
      const notificationId = 'notification-123';

      const mockUpdatedNotification = {
        id: notificationId,
        read: true,
        readAt: new Date()
      };

      mockPrisma.notification.update.mockResolvedValue(mockUpdatedNotification);

      await realtimeService.markNotificationAsRead(notificationId);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          isRead: true
        }
      });
    });
  });

  describe('Bid Notifications', () => {
    it('should notify bid received successfully', async () => {
      const packageId = 'package-123';
      const customerId = 'customer-123';
      const bid = {
        id: 'bid-123',
        amount: 25.00,
        driverName: 'John Doe'
      };

      // Mock the package lookup
      mockPrisma.package.findUnique.mockResolvedValue({
        id: packageId,
        customerId,
        customer: { id: customerId }
      });

      const mockNotification = {
        id: 'notification-123',
        userId: customerId,
        type: 'BID_RECEIVED',
        title: 'New Bid Received',
        message: `You have received a new bid of $${bid.amount} for your package`,
        data: JSON.stringify({ packageId, bidId: bid.id, amount: bid.amount }),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await realtimeService.notifyBidReceived(packageId, bid);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: customerId,
          type: 'BID_RECEIVED',
          title: 'New Bid Received',
          message: `You have received a new bid of $${bid.amount} for your package`,
          data: JSON.stringify({ packageId, bidId: bid.id, amount: bid.amount }),
          isRead: false
        }
      });
    });

    it('should notify bid accepted successfully', async () => {
      const packageId = 'package-123';
      const bidId = 'bid-123';
      const driverId = 'driver-123';

      const mockNotification = {
        id: 'notification-123',
        userId: driverId,
        type: 'BID_ACCEPTED',
        title: 'Bid Accepted',
        message: 'Your bid has been accepted!',
        data: JSON.stringify({ packageId, bidId }),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await realtimeService.notifyBidAccepted(packageId, bidId, driverId);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: driverId,
          type: 'BID_ACCEPTED',
          title: 'Bid Accepted',
          message: 'Your bid has been accepted!',
          data: JSON.stringify({ packageId, bidId }),
          isRead: false
        }
      });
    });

    it('should notify bid rejected successfully', async () => {
      const packageId = 'package-123';
      const bidId = 'bid-123';
      const driverId = 'driver-123';

      const mockNotification = {
        id: 'notification-123',
        userId: driverId,
        type: 'BID_REJECTED',
        title: 'Bid Rejected',
        message: 'Your bid was not selected for this package',
        data: JSON.stringify({ packageId, bidId }),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await realtimeService.notifyBidRejected(packageId, bidId, driverId);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: driverId,
          type: 'BID_REJECTED',
          title: 'Bid Rejected',
          message: 'Your bid was not selected for this package',
          data: JSON.stringify({ packageId, bidId }),
          isRead: false
        }
      });
    });
  });

  describe('Delivery Notifications', () => {
    it('should notify delivery started successfully', async () => {
      const packageId = 'package-123';
      const driverId = 'driver-123';
      const customerId = 'customer-123';

      // Mock the package lookup
      mockPrisma.package.findUnique.mockResolvedValue({
        id: packageId,
        customerId,
        customer: { id: customerId }
      });

      const mockNotification = {
        id: 'notification-123',
        userId: customerId,
        type: 'DELIVERY_STARTED',
        title: 'Delivery Started',
        message: 'Your package delivery has started',
        data: JSON.stringify({ packageId, driverId }),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await realtimeService.notifyDeliveryStarted(packageId, driverId);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: customerId,
          type: 'DELIVERY_STARTED',
          title: 'Delivery Started',
          message: 'Your package delivery has started',
          data: JSON.stringify({ packageId, driverId }),
          isRead: false
        }
      });
    });

    it('should notify delivery completed successfully', async () => {
      const packageId = 'package-123';
      const driverId = 'driver-123';
      const customerId = 'customer-123';

      // Mock the package lookup
      mockPrisma.package.findUnique.mockResolvedValue({
        id: packageId,
        customerId,
        customer: { id: customerId }
      });

      const mockNotification = {
        id: 'notification-123',
        userId: customerId,
        type: 'DELIVERY_COMPLETED',
        title: 'Delivery Completed',
        message: 'Your package has been delivered successfully',
        data: JSON.stringify({ packageId, driverId }),
        isRead: false,
        read: false,
        createdAt: new Date()
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await realtimeService.notifyDeliveryCompleted(packageId, driverId);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: customerId,
          type: 'DELIVERY_COMPLETED',
          title: 'Delivery Completed',
          message: 'Your package has been delivered successfully',
          data: JSON.stringify({ packageId, driverId }),
          isRead: false
        }
      });
    });
  });

  describe('Socket.IO Methods', () => {
    it('should emit to user successfully', () => {
      const userId = 'user-123';
      const event = 'notification';
      const data = { message: 'Test notification' };

      realtimeService.emitToUser(userId, event, data);

      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockIo.to().emit).toHaveBeenCalledWith(event, data);
    });

    it('should emit to room successfully', () => {
      const roomId = 'chat-room-123';
      const event = 'message';
      const data = { message: 'Hello' };

      realtimeService.emitToRoom(roomId, event, data);

      expect(mockIo.to).toHaveBeenCalledWith(roomId);
      expect(mockIo.to().emit).toHaveBeenCalledWith(event, data);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const packageId = 'package-123';
      const customerId = 'customer-123';
      const driverId = 'driver-123';

      mockPrisma.chatRoom.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(realtimeService.createChatRoom(packageId, customerId, driverId))
        .rejects.toThrow('Failed to create chat room');
    });

    it('should handle invalid input parameters', async () => {
      const packageId = '';
      const customerId = 'customer-123';
      const driverId = 'driver-123';

      await expect(realtimeService.createChatRoom(packageId, customerId, driverId))
        .rejects.toThrow('Failed to create chat room');
    });
  });
});
