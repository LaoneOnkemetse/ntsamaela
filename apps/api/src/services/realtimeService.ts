import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getPrismaClient } from '@database/index';
import { 
  ChatRoom, 
  ChatMessage, 
  PackageTracking, 
  Notification, 
  CreateChatMessageRequest,
  CreateNotificationRequest
} from '@ntsamaela/shared/types';
import { AppError } from '../utils/errors';

export class RealtimeService {
  private io: SocketIOServer;
  private prisma: any;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, Socket> = new Map(); // socketId -> socket

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    try {
      this.prisma = getPrismaClient();
    } catch (_error) {
      console.warn('Prisma client not available in test environment');
      this.prisma = null;
    }
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authentication middleware
      socket.use((packet, next) => {
        const token = packet[1]?.token || socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }
        // TODO: Verify JWT token here
        next();
      });

      // User connection
      socket.on('user:connect', (data: { userId: string; userType: string }) => {
        this.handleUserConnect(socket, data);
      });

      // User disconnection
      socket.on('disconnect', () => {
        this.handleUserDisconnect(socket);
      });

      // Chat events
      socket.on('chat:join', (data: { chatRoomId: string }) => {
        this.handleChatJoin(socket, data);
      });

      socket.on('chat:leave', (data: { chatRoomId: string }) => {
        this.handleChatLeave(socket, data);
      });

      socket.on('chat:message', (data: CreateChatMessageRequest) => {
        this.handleChatMessage(socket, data);
      });

      socket.on('chat:typing', (data: { chatRoomId: string; isTyping: boolean }) => {
        this.handleChatTyping(socket, data);
      });

      // Package tracking events
      socket.on('package:track', (data: { packageId: string }) => {
        this.handlePackageTrack(socket, data);
      });

      socket.on('package:location:update', (data: { packageId: string; latitude: number; longitude: number; status: string }) => {
        this.handlePackageLocationUpdate(socket, data);
      });

      // Bid events
      socket.on('bid:subscribe', (data: { packageId: string }) => {
        this.handleBidSubscribe(socket, data);
      });

      socket.on('bid:unsubscribe', (data: { packageId: string }) => {
        this.handleBidUnsubscribe(socket, data);
      });

      // Delivery status events
      socket.on('delivery:status:subscribe', (data: { packageId: string }) => {
        this.handleDeliveryStatusSubscribe(socket, data);
      });

      socket.on('delivery:status:update', (data: { packageId: string; status: string; location?: string; notes?: string }) => {
        this.handleDeliveryStatusUpdate(socket, data);
      });

      // Notification events
      socket.on('notification:read', (data: { notificationId: string }) => {
        this.handleNotificationRead(socket, data);
      });

      socket.on('notification:subscribe', (data: { userId: string }) => {
        this.handleNotificationSubscribe(socket, data);
      });

      // Trip events
      socket.on('trip:subscribe', (data: { tripId: string }) => {
        this.handleTripSubscribe(socket, data);
      });

      socket.on('trip:location:update', (data: { tripId: string; latitude: number; longitude: number; status: string }) => {
        this.handleTripLocationUpdate(socket, data);
      });
    });
  }

  private handleUserConnect(socket: Socket, data: { userId: string; userType: string }): void {
    this.connectedUsers.set(data.userId, socket.id);
    this.userSockets.set(socket.id, socket);
    
    // Join user-specific room
    socket.join(`user:${data.userId}`);
    
    console.log(`User ${data.userId} connected with socket ${socket.id}`);
    
    // Send any pending notifications
    this.sendPendingNotifications(data.userId);
  }

  private handleUserDisconnect(socket: Socket): void {
    // Find and remove user from connected users
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === socket.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
    
    this.userSockets.delete(socket.id);
    console.log(`Socket disconnected: ${socket.id}`);
  }

  private handleChatJoin(socket: Socket, data: { chatRoomId: string }): void {
    socket.join(`chat:${data.chatRoomId}`);
    console.log(`Socket ${socket.id} joined chat room ${data.chatRoomId}`);
  }

  private handleChatLeave(socket: Socket, data: { chatRoomId: string }): void {
    socket.leave(`chat:${data.chatRoomId}`);
    console.log(`Socket ${socket.id} left chat room ${data.chatRoomId}`);
  }

  private async handleChatMessage(socket: Socket, data: CreateChatMessageRequest): Promise<void> {
    try {
      // Get user info from socket
      const userId = this.getUserIdFromSocket(socket);
      if (!userId) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Create message
      const message = await this.sendMessage(
        data.chatRoomId,
        userId,
        'CUSTOMER', // TODO: Determine user type
        data.message,
        data.messageType
      );

      // Broadcast to chat room
      this.io.to(`chat:${data.chatRoomId}`).emit('chat:message:received', { message });
      
      // Send notification to other participants
      await this.notifyChatMessage(data.chatRoomId, message);
    } catch (_error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleChatTyping(socket: Socket, data: { chatRoomId: string; isTyping: boolean }): void {
    socket.to(`chat:${data.chatRoomId}`).emit('chat:typing', {
      chatRoomId: data.chatRoomId,
      isTyping: data.isTyping,
      userId: this.getUserIdFromSocket(socket)
    });
  }

  private handlePackageTrack(socket: Socket, data: { packageId: string }): void {
    socket.join(`package:${data.packageId}`);
    console.log(`Socket ${socket.id} tracking package ${data.packageId}`);
  }

  private async handleNotificationRead(socket: Socket, data: { notificationId: string }): Promise<void> {
    try {
      await this.markNotificationAsRead(data.notificationId);
      socket.emit('notification:read:success', { notificationId: data.notificationId });
    } catch (_error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  private getUserIdFromSocket(socket: Socket): string | null {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === socket.id) {
        return userId;
      }
    }
    return null;
  }

  private async sendPendingNotifications(userId: string): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userId, 10, 0);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        this.emitToUser(userId, 'notification:new', { notification });
      }
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  private async notifyChatMessage(chatRoomId: string, message: ChatMessage): Promise<void> {
    try {
      const chatRoom = await this.prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: { customer: true, driver: true }
      });

      if (!chatRoom) return;

      // Notify customer if message is from driver
      if (message.senderType === 'DRIVER' && chatRoom.customerId) {
        await this.createNotification(
          chatRoom.customerId,
          'CHAT_MESSAGE',
          'New Message',
          `You have a new message from your driver`,
          { chatRoomId, messageId: message.id }
        );
      }

      // Notify driver if message is from customer
      if (message.senderType === 'CUSTOMER' && chatRoom.driverId) {
        await this.createNotification(
          chatRoom.driverId,
          'CHAT_MESSAGE',
          'New Message',
          `You have a new message from your customer`,
          { chatRoomId, messageId: message.id }
        );
      }
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  // Chat methods
  async createChatRoom(packageId: string, customerId: string, driverId?: string): Promise<ChatRoom> {
    try {
      const chatRoom = await this.prisma.chatRoom.create({
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

      return this.formatChatRoom(chatRoom);
    } catch (_error) {
      throw new AppError('Failed to create chat room', 'CHAT_ROOM_CREATION_FAILED', 500);
    }
  }

  async sendMessage(
    chatRoomId: string, 
    senderId: string, 
    senderType: string, 
    message: string, 
    messageType: string = 'TEXT'
  ): Promise<ChatMessage> {
    try {
      const chatMessage = await this.prisma.chatMessage.create({
        data: {
          chatRoomId,
          senderId,
          senderType,
          message,
          messageType,
          isRead: false
        }
      });

      return this.formatChatMessage(chatMessage);
    } catch (_error) {
      throw new AppError('Failed to send message', 'MESSAGE_SEND_FAILED', 500);
    }
  }

  async getChatMessages(chatRoomId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { chatRoomId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return messages.map((message: any) => this.formatChatMessage(message));
    } catch (_error) {
      throw new AppError('Failed to get chat messages', 'MESSAGES_FETCH_FAILED', 500);
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await this.prisma.chatMessage.update({
        where: { id: messageId },
        data: { isRead: true }
      });
    } catch (_error) {
      throw new AppError('Failed to mark message as read', 'MESSAGE_READ_FAILED', 500);
    }
  }

  // Tracking methods
  async createTrackingUpdate(
    packageId: string, 
    status: string, 
    location?: string, 
    latitude?: number, 
    longitude?: number, 
    notes?: string
  ): Promise<PackageTracking> {
    try {
      const tracking = await this.prisma.packageTracking.create({
        data: {
          packageId,
          status,
          location,
          latitude,
          longitude,
          notes
        }
      });

      // Emit real-time update
      this.io.to(`package:${packageId}`).emit('package:status:update', {
        packageId,
        status,
        tracking: this.formatPackageTracking(tracking)
      });

      // Send notification to customer
      const packageData = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: { customer: true }
      });

      if (packageData) {
        await this.createNotification(
          packageData.customerId,
          'PACKAGE_STATUS',
          'Package Status Update',
          `Your package status has been updated to: ${status}`,
          { packageId, status, tracking: this.formatPackageTracking(tracking) }
        );
      }

      return this.formatPackageTracking(tracking);
    } catch (_error) {
      throw new AppError('Failed to create tracking update', 'TRACKING_UPDATE_FAILED', 500);
    }
  }

  async getPackageTracking(packageId: string): Promise<PackageTracking[]> {
    try {
      const tracking = await this.prisma.packageTracking.findMany({
        where: { packageId },
        orderBy: { timestamp: 'desc' }
      });

      return tracking.map((t: any) => this.formatPackageTracking(t));
    } catch (_error) {
      throw new AppError('Failed to get package tracking', 'TRACKING_FETCH_FAILED', 500);
    }
  }

  // Notification methods
  async createNotification(
    userId: string, 
    type: string, 
    title: string, 
    message: string, 
    data?: any
  ): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
          isRead: false
        }
      });

      // Emit real-time notification
      this.emitToUser(userId, 'notification:new', { notification: this.formatNotification(notification) });

      return this.formatNotification(notification);
    } catch (_error) {
      throw new AppError('Failed to create notification', 'NOTIFICATION_CREATION_FAILED', 500);
    }
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0): Promise<Notification[]> {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return notifications.map((n: any) => this.formatNotification(n));
    } catch (_error) {
      throw new AppError('Failed to get notifications', 'NOTIFICATIONS_FETCH_FAILED', 500);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });
    } catch (_error) {
      throw new AppError('Failed to mark notification as read', 'NOTIFICATION_READ_FAILED', 500);
    }
  }

  // Socket.IO methods
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  joinRoom(socketId: string, roomId: string): void {
    const socket = this.userSockets.get(socketId);
    if (socket) {
      socket.join(roomId);
    }
  }

  leaveRoom(socketId: string, roomId: string): void {
    const socket = this.userSockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
    }
  }

  // Public methods for external services
  async notifyBidReceived(packageId: string, bid: any): Promise<void> {
    try {
      const packageData = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: { customer: true }
      });

      if (packageData) {
        await this.createNotification(
          packageData.customerId,
          'BID_RECEIVED',
          'New Bid Received',
          `You have received a new bid of $${bid.amount} for your package`,
          { packageId, bidId: bid.id, amount: bid.amount }
        );

        this.emitToUser(packageData.customerId, 'bid:received', { packageId, bid });
      }
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  async notifyBidAccepted(packageId: string, bidId: string, driverId: string): Promise<void> {
    try {
      await this.createNotification(
        driverId,
        'BID_ACCEPTED',
        'Bid Accepted',
        'Your bid has been accepted!',
        { packageId, bidId }
      );

      this.emitToUser(driverId, 'bid:accepted', { packageId, bidId });
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  async notifyBidRejected(packageId: string, bidId: string, driverId: string): Promise<void> {
    try {
      await this.createNotification(
        driverId,
        'BID_REJECTED',
        'Bid Rejected',
        'Your bid was not selected for this package',
        { packageId, bidId }
      );

      this.emitToUser(driverId, 'bid:rejected', { packageId, bidId });
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  async notifyDeliveryStarted(packageId: string, driverId: string): Promise<void> {
    try {
      const packageData = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: { customer: true }
      });

      if (packageData) {
        await this.createNotification(
          packageData.customerId,
          'DELIVERY_STARTED',
          'Delivery Started',
          'Your package delivery has started',
          { packageId, driverId }
        );

        this.emitToUser(packageData.customerId, 'delivery:started', { packageId, driverId });
      }
    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }


  // Formatting methods
  private formatChatRoom(chatRoom: any): ChatRoom {
    return {
      id: chatRoom.id,
      packageId: chatRoom.packageId,
      customerId: chatRoom.customerId,
      driverId: chatRoom.driverId,
      status: chatRoom.status,
      createdAt: chatRoom.createdAt.toISOString(),
      updatedAt: chatRoom.updatedAt.toISOString(),
      messages: chatRoom.messages?.map((m: any) => this.formatChatMessage(m)),
      package: chatRoom.package,
      customer: chatRoom.customer,
      driver: chatRoom.driver
    };
  }

  private formatChatMessage(message: any): ChatMessage {
    return {
      id: message.id,
      chatRoomId: message.chatRoomId,
      senderId: message.senderId,
      senderType: message.senderType,
      message: message.message,
      messageType: message.messageType,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString()
    };
  }

  private formatPackageTracking(tracking: any): PackageTracking {
    return {
      id: tracking.id,
      packageId: tracking.packageId,
      status: tracking.status,
      location: tracking.location,
      latitude: tracking.latitude,
      longitude: tracking.longitude,
      timestamp: tracking.timestamp.toISOString(),
      notes: tracking.notes
    };
  }

  private formatNotification(notification: any): Notification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.message || notification.body,
      message: notification.message,
      data: notification.data ? JSON.parse(notification.data) : null,
      read: notification.isRead || notification.read,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString()
    };
  }

  // Enhanced real-time event handlers

  private async handlePackageLocationUpdate(socket: Socket, data: { packageId: string; latitude: number; longitude: number; status: string }): Promise<void> {
    try {
      if (!this.prisma) return;

      // Verify user has permission to update this package location
      const userId = this.getUserIdFromSocket(socket);
      if (!userId) return;

      // Create tracking update
      const trackingUpdate = await this.prisma.packageTracking.create({
        data: {
          packageId: data.packageId,
          status: data.status,
          latitude: data.latitude,
          longitude: data.longitude,
          location: `${data.latitude}, ${data.longitude}`,
          notes: 'Real-time location update'
        }
      });

      // Emit to all users tracking this package
      this.io.to(`package:${data.packageId}`).emit('package:location:updated', {
        packageId: data.packageId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        timestamp: new Date().toISOString(),
        trackingId: trackingUpdate.id
      });

      // Update package status if needed
      await this.prisma.package.update({
        where: { id: data.packageId },
        data: { status: data.status }
      });

    } catch (_error) {
      console.error('Realtime service error:', _error);
      socket.emit('error', { message: 'Failed to update package location' });
    }
  }

  private handleBidSubscribe(socket: Socket, data: { packageId: string }): void {
    socket.join(`bids:${data.packageId}`);
    console.log(`Socket ${socket.id} subscribed to bids for package ${data.packageId}`);
  }

  private handleBidUnsubscribe(socket: Socket, data: { packageId: string }): void {
    socket.leave(`bids:${data.packageId}`);
    console.log(`Socket ${socket.id} unsubscribed from bids for package ${data.packageId}`);
  }

  private handleDeliveryStatusSubscribe(socket: Socket, data: { packageId: string }): void {
    socket.join(`delivery:${data.packageId}`);
    console.log(`Socket ${socket.id} subscribed to delivery status for package ${data.packageId}`);
  }

  private async handleDeliveryStatusUpdate(socket: Socket, data: { packageId: string; status: string; location?: string; notes?: string }): Promise<void> {
    try {
      if (!this.prisma) return;

      const userId = this.getUserIdFromSocket(socket);
      if (!userId) return;

      // Create tracking update
      const trackingUpdate = await this.prisma.packageTracking.create({
        data: {
          packageId: data.packageId,
          status: data.status,
          location: data.location,
          notes: data.notes
        }
      });

      // Update package status
      await this.prisma.package.update({
        where: { id: data.packageId },
        data: { status: data.status }
      });

      // Emit to all users tracking this delivery
      this.io.to(`delivery:${data.packageId}`).emit('delivery:status:updated', {
        packageId: data.packageId,
        status: data.status,
        location: data.location,
        notes: data.notes,
        timestamp: new Date().toISOString(),
        trackingId: trackingUpdate.id
      });

      // Send notification to customer
      const package_ = await this.prisma.package.findUnique({
        where: { id: data.packageId },
        include: { customer: true }
      });

      if (package_) {
        await this.createNotification(
          package_.customerId,
          'DELIVERY_UPDATE',
          'Delivery Status Update',
          `Your package status has been updated to: ${data.status}`,
          { packageId: data.packageId, status: data.status }
        );
      }

    } catch (_error) {
      console.error('Realtime service error:', _error);
      socket.emit('error', { message: 'Failed to update delivery status' });
    }
  }

  private handleNotificationSubscribe(socket: Socket, data: { userId: string }): void {
    socket.join(`notifications:${data.userId}`);
    console.log(`Socket ${socket.id} subscribed to notifications for user ${data.userId}`);
  }

  private handleTripSubscribe(socket: Socket, data: { tripId: string }): void {
    socket.join(`trip:${data.tripId}`);
    console.log(`Socket ${socket.id} subscribed to trip ${data.tripId}`);
  }

  private async handleTripLocationUpdate(socket: Socket, data: { tripId: string; latitude: number; longitude: number; status: string }): Promise<void> {
    try {
      if (!this.prisma) return;

      const userId = this.getUserIdFromSocket(socket);
      if (!userId) return;

      // Update trip status
      await this.prisma.trip.update({
        where: { id: data.tripId },
        data: { status: data.status }
      });

      // Emit to all users tracking this trip
      this.io.to(`trip:${data.tripId}`).emit('trip:location:updated', {
        tripId: data.tripId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        timestamp: new Date().toISOString()
      });

    } catch (_error) {
      console.error('Realtime service error:', _error);
      socket.emit('error', { message: 'Failed to update trip location' });
    }
  }


  public async notifyDeliveryFailed(packageId: string, driverId: string, reason: string): Promise<void> {
    this.io.to(`delivery:${packageId}`).emit('delivery:failed', {
      packageId,
      driverId,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  public async notifyTripStatusUpdate(tripId: string, status: string): Promise<void> {
    this.io.to(`trip:${tripId}`).emit('trip:status:updated', {
      tripId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  public async notifyPackageStatusUpdate(packageId: string, status: string, location?: string): Promise<void> {
    this.io.to(`package:${packageId}`).emit('package:status:updated', {
      packageId,
      status,
      location,
      timestamp: new Date().toISOString()
    });
  }

  public async notifyDeliveryCompleted(packageId: string, driverId: string): Promise<void> {
    try {
      // Find the package to get the customer ID
      const packageData = await this.prisma.package.findUnique({
        where: { id: packageId },
        select: { customerId: true }
      });

      if (!packageData) {
        throw new AppError('Package not found', 'NOT_FOUND', 404);
      }

      // Create notification for the customer
      await this.prisma.notification.create({
        data: {
          userId: packageData.customerId,
          type: 'DELIVERY_COMPLETED',
          title: 'Delivery Completed',
          message: 'Your package has been delivered successfully',
          data: JSON.stringify({ packageId, driverId }),
          isRead: false
        }
      });

      // Emit socket event to the customer
      this.io.to(`user:${packageData.customerId}`).emit('delivery:completed', {
        packageId,
        driverId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error notifying delivery completed:', error);
      throw error;
    }
  }

  public async notifyNewChatMessage(chatRoomId: string, message: any): Promise<void> {
    this.io.to(`chat:${chatRoomId}`).emit('chat:message:received', {
      chatRoomId,
      message: {
        id: message.id,
        senderId: message.senderId,
        senderType: message.senderType,
        message: message.message,
        messageType: message.messageType,
        createdAt: message.createdAt
      },
      timestamp: new Date().toISOString()
    });
  }

  public async notifyUserTyping(chatRoomId: string, userId: string, isTyping: boolean): Promise<void> {
    this.io.to(`chat:${chatRoomId}`).emit('chat:typing', {
      chatRoomId,
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced notification system
  public async sendNotification(notification: CreateNotificationRequest): Promise<void> {
    if (!this.prisma) return;

    try {
      const newNotification = await this.prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data ? JSON.stringify(notification.data) : null,
          isRead: false
        }
      });

      // Emit to user's notification room
      this.io.to(`notifications:${notification.userId}`).emit('notification:new', {
        notification: {
          id: newNotification.id,
          type: newNotification.type,
          title: newNotification.title,
          message: newNotification.message,
          data: newNotification.data,
          isRead: newNotification.isRead,
          createdAt: newNotification.createdAt.toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (_error) {
      console.error('Realtime service error:', _error);
    }
  }

  // Live tracking methods
  public async startLiveTracking(packageId: string, userId: string): Promise<void> {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      if (socket) {
        socket.join(`package:${packageId}`);
        console.log(`User ${userId} started live tracking for package ${packageId}`);
      }
    }
  }

  public async stopLiveTracking(packageId: string, userId: string): Promise<void> {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      if (socket) {
        socket.leave(`package:${packageId}`);
        console.log(`User ${userId} stopped live tracking for package ${packageId}`);
      }
    }
  }

  // Connection management
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getConnectionCount(): number {
    return this.connectedUsers.size;
  }

  // Additional methods for WebSocket integration tests
  public sendChatMessage(chatRoomId: string, message: any): void {
    this.io.to(`chat:${chatRoomId}`).emit('chat:message:received', {
      chatRoomId,
      message,
      timestamp: new Date().toISOString()
    });
  }

  public sendTypingIndicator(chatRoomId: string, userId: string, isTyping: boolean): void {
    this.io.to(`chat:${chatRoomId}`).emit('chat:typing', {
      chatRoomId,
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  public sendTripUpdate(tripId: string, update: any): void {
    this.io.to(`trip:${tripId}`).emit('trip:update', {
      tripId,
      update,
      timestamp: new Date().toISOString()
    });
  }

  public sendError(userId: string, errorMessage: string): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.userSockets.get(socketId);
      if (socket) {
        socket.emit('error', {
          message: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

// Singleton instance
let realtimeServiceInstance: RealtimeService | null = null;

export const getRealtimeService = (server?: HTTPServer): RealtimeService => {
  if (!realtimeServiceInstance && server) {
    realtimeServiceInstance = new RealtimeService(server);
  }
  return realtimeServiceInstance!;
};
