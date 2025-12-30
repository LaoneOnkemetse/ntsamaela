// Mock Real-time Service for development
import { Server as SocketIOServer } from 'socket.io';

export class MockRealtimeService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server?: any) {
    if (server) {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"]
        }
      });
      this.setupEventHandlers();
    }
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Mock: User connected: ${socket.id}`);

      // User joins with their ID
      socket.on('user:connect', (data: { userId: string; userType: string }) => {
        this.connectedUsers.set(data.userId, socket.id);
        socket.join(`user:${data.userId}`);
        console.log(`Mock: User ${data.userId} joined as ${data.userType}`);
      });

      // User disconnects
      socket.on('user:disconnect', (data: { userId: string }) => {
        this.connectedUsers.delete(data.userId);
        socket.leave(`user:${data.userId}`);
        console.log(`Mock: User ${data.userId} disconnected`);
      });

      // Chat events
      socket.on('chat:join', (data: { chatRoomId: string }) => {
        socket.join(`chat:${data.chatRoomId}`);
        console.log(`Mock: User joined chat room ${data.chatRoomId}`);
      });

      socket.on('chat:leave', (data: { chatRoomId: string }) => {
        socket.leave(`chat:${data.chatRoomId}`);
        console.log(`Mock: User left chat room ${data.chatRoomId}`);
      });

      socket.on('chat:message', (data: { chatRoomId: string; message: string; messageType?: string }) => {
        // Broadcast to all users in the chat room
        this.io?.to(`chat:${data.chatRoomId}`).emit('chat:message:received', {
          id: `msg_${Date.now()}`,
          chatRoomId: data.chatRoomId,
          senderId: 'mock_sender',
          senderType: 'CUSTOMER',
          message: data.message,
          messageType: data.messageType || 'TEXT',
          isRead: false,
          createdAt: new Date().toISOString()
        });
        console.log(`Mock: Message sent to chat room ${data.chatRoomId}`);
      });

      socket.on('chat:typing', (data: { chatRoomId: string; isTyping: boolean }) => {
        socket.to(`chat:${data.chatRoomId}`).emit('chat:typing', data);
      });

      // Bid events
      socket.on('bid:received', (data: { packageId: string; bid: any }) => {
        this.io?.emit('bid:received', data);
        console.log(`Mock: Bid received for package ${data.packageId}`);
      });

      socket.on('bid:accepted', (data: { packageId: string; bidId: string }) => {
        this.io?.emit('bid:accepted', data);
        console.log(`Mock: Bid ${data.bidId} accepted for package ${data.packageId}`);
      });

      socket.on('bid:rejected', (data: { packageId: string; bidId: string }) => {
        this.io?.emit('bid:rejected', data);
        console.log(`Mock: Bid ${data.bidId} rejected for package ${data.packageId}`);
      });

      // Package tracking events
      socket.on('package:status:update', (data: { packageId: string; status: string; tracking: any }) => {
        this.io?.emit('package:status:update', data);
        console.log(`Mock: Package ${data.packageId} status updated to ${data.status}`);
      });

      socket.on('package:location:update', (data: { packageId: string; latitude: number; longitude: number }) => {
        this.io?.emit('package:location:update', data);
        console.log(`Mock: Package ${data.packageId} location updated`);
      });

      // Notification events
      socket.on('notification:new', (data: { notification: any }) => {
        this.io?.emit('notification:new', data);
        console.log(`Mock: New notification sent`);
      });

      socket.on('notification:read', (data: { notificationId: string }) => {
        this.io?.emit('notification:read', data);
        console.log(`Mock: Notification ${data.notificationId} marked as read`);
      });

      // Delivery events
      socket.on('delivery:started', (data: { packageId: string; driverId: string }) => {
        this.io?.emit('delivery:started', data);
        console.log(`Mock: Delivery started for package ${data.packageId} by driver ${data.driverId}`);
      });

      socket.on('delivery:completed', (data: { packageId: string; driverId: string }) => {
        this.io?.emit('delivery:completed', data);
        console.log(`Mock: Delivery completed for package ${data.packageId} by driver ${data.driverId}`);
      });

      socket.on('delivery:failed', (data: { packageId: string; driverId: string; reason: string }) => {
        this.io?.emit('delivery:failed', data);
        console.log(`Mock: Delivery failed for package ${data.packageId}: ${data.reason}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Mock: User disconnected: ${socket.id}`);
        // Remove user from connected users map
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            break;
          }
        }
      });
    });
  }

  // Public methods for emitting events
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`Mock: Emitted ${event} to user ${userId}`);
  }

  emitToRoom(roomId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(roomId).emit(event, data);
    console.log(`Mock: Emitted ${event} to room ${roomId}`);
  }

  joinRoom(socketId: string, roomId: string) {
    if (!this.io) return;
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomId);
      console.log(`Mock: Socket ${socketId} joined room ${roomId}`);
    }
  }

  leaveRoom(socketId: string, roomId: string) {
    if (!this.io) return;
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
      console.log(`Mock: Socket ${socketId} left room ${roomId}`);
    }
  }

  // Chat methods
  async createChatRoom(packageId: string, customerId: string, driverId?: string) {
    const chatRoom = {
      id: `chat_${Date.now()}`,
      packageId,
      customerId,
      driverId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    console.log(`Mock: Created chat room ${chatRoom.id}`);
    return chatRoom;
  }

  async sendMessage(chatRoomId: string, senderId: string, senderType: string, message: string, messageType: string = 'TEXT') {
    const chatMessage = {
      id: `msg_${Date.now()}`,
      chatRoomId,
      senderId,
      senderType,
      message,
      messageType,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // Emit to all users in the chat room
    this.emitToRoom(`chat:${chatRoomId}`, 'chat:message:received', chatMessage);
    console.log(`Mock: Message sent in chat room ${chatRoomId}`);
    return chatMessage;
  }

  async getChatMessages(chatRoomId: string, limit: number = 50, offset: number = 0) {
    // Mock chat messages
    const messages = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `msg_${Date.now() - i * 1000}`,
      chatRoomId,
      senderId: i % 2 === 0 ? 'customer_1' : 'driver_1',
      senderType: i % 2 === 0 ? 'CUSTOMER' : 'DRIVER',
      message: `Mock message ${i + 1}`,
      messageType: 'TEXT',
      isRead: i < 5,
      createdAt: new Date(Date.now() - i * 1000).toISOString()
    }));

    console.log(`Mock: Retrieved ${messages.length} messages for chat room ${chatRoomId}`);
    return messages;
  }

  async markMessageAsRead(messageId: string) {
    console.log(`Mock: Message ${messageId} marked as read`);
  }

  // Tracking methods
  async createTrackingUpdate(packageId: string, status: string, location?: string, latitude?: number, longitude?: number, notes?: string) {
    const tracking = {
      id: `track_${Date.now()}`,
      packageId,
      status,
      location,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      notes
    };

    this.emitToRoom(`package:${packageId}`, 'package:status:update', {
      packageId,
      status,
      tracking
    });

    console.log(`Mock: Created tracking update for package ${packageId}`);
    return tracking;
  }

  async getPackageTracking(packageId: string) {
    // Mock tracking data
    const tracking = [
      {
        id: `track_${Date.now() - 3600000}`,
        packageId,
        status: 'PICKED_UP',
        location: 'Pickup Location',
        latitude: -24.6541,
        longitude: 25.9087,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        notes: 'Package picked up from customer'
      },
      {
        id: `track_${Date.now() - 1800000}`,
        packageId,
        status: 'IN_TRANSIT',
        location: 'On the way',
        latitude: -24.6541,
        longitude: 25.9087,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        notes: 'Package is on the way to destination'
      }
    ];

    console.log(`Mock: Retrieved tracking data for package ${packageId}`);
    return tracking;
  }

  // Notification methods
  async createNotification(userId: string, type: string, title: string, message: string, data?: any) {
    const notification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.emitToUser(userId, 'notification:new', { notification });
    console.log(`Mock: Created notification for user ${userId}`);
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    // Mock notifications
    const notifications = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `notif_${Date.now() - i * 1000}`,
      userId,
      type: ['BID_RECEIVED', 'PACKAGE_UPDATE', 'DELIVERY_UPDATE'][i % 3],
      title: `Mock Notification ${i + 1}`,
      message: `This is a mock notification message ${i + 1}`,
      data: { packageId: `pkg_${i + 1}` },
      isRead: i < 2,
      createdAt: new Date(Date.now() - i * 1000).toISOString()
    }));

    console.log(`Mock: Retrieved ${notifications.length} notifications for user ${userId}`);
    return notifications;
  }

  async markNotificationAsRead(notificationId: string) {
    this.io?.emit('notification:read', { notificationId });
    console.log(`Mock: Notification ${notificationId} marked as read`);
  }
}

// Export singleton instance
export const mockRealtimeService = new MockRealtimeService();
