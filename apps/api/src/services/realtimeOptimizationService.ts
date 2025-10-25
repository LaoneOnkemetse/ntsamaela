import { Server as SocketIOServer } from 'socket.io';
import { getPrismaClient } from '@database/index';
import { AppError } from '../utils/errors';

interface MessageQueue {
  [roomId: string]: Array<{
    message: any;
    timestamp: number;
    retryCount: number;
  }>;
}

interface ConnectionMetrics {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  roomCount: number;
}

interface OptimizationConfig {
  maxConnectionsPerUser: number;
  maxRoomsPerConnection: number;
  messageBatchSize: number;
  messageBatchDelay: number;
  connectionTimeout: number;
  maxRetries: number;
}

class RealtimeOptimizationService {
  private io: SocketIOServer;
  private prisma: any;
  private messageQueue: MessageQueue = {};
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private config: OptimizationConfig;
  private batchTimers: Map<string, any> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.prisma = getPrismaClient();
    this.config = {
      maxConnectionsPerUser: 3,
      maxRoomsPerConnection: 10,
      messageBatchSize: 10,
      messageBatchDelay: 100, // 100ms
      connectionTimeout: 30 * 60 * 1000, // 30 minutes
      maxRetries: 3
    };

    this.initializeOptimizations();
  }

  /**
   * Initialize real-time optimizations
   */
  private initializeOptimizations() {
    // Clean up inactive connections periodically
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Process message queues periodically
    setInterval(() => {
      this.processMessageQueues();
    }, 1000); // Every second

    // Clean up old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Optimized message sending with batching
   */
  async sendMessageOptimized(
    roomId: string,
    message: any,
    options: {
      priority?: 'high' | 'normal' | 'low';
      persist?: boolean;
      retryable?: boolean;
    } = {}
  ): Promise<void> {
    const {
      priority = 'normal',
      persist = true,
      retryable = true
    } = options;

    try {
      // Add to message queue for batching
      if (!this.messageQueue[roomId]) {
        this.messageQueue[roomId] = [];
      }

      this.messageQueue[roomId].push({
        message: {
          ...message,
          priority,
          persist,
          retryable,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        retryCount: 0
      });

      // Process immediately for high priority messages
      if (priority === 'high') {
        await this.processRoomQueue(roomId);
      } else {
        // Schedule batch processing
        this.scheduleBatchProcessing(roomId);
      }
    } catch (_error) {
      throw new AppError('Failed to send optimized message', 'MESSAGE_SEND_FAILED', 500);
    }
  }

  /**
   * Optimized room joining with connection limits
   */
  async joinRoomOptimized(
    socketId: string,
    userId: string,
    roomId: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      const metrics = this.connectionMetrics.get(socketId);
      
      if (!metrics) {
        return { success: false, reason: 'Connection not found' };
      }

      // Check room limit
      if (metrics.roomCount >= this.config.maxRoomsPerConnection) {
        return { success: false, reason: 'Room limit exceeded' };
      }

      // Check if user is already in too many rooms
      const userRooms = await this.getUserRoomCount(userId);
      if (userRooms >= this.config.maxRoomsPerConnection * this.config.maxConnectionsPerUser) {
        return { success: false, reason: 'User room limit exceeded' };
      }

      // Join room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.join(roomId);
        metrics.roomCount++;
        metrics.lastActivity = new Date();
        
        // Send room join confirmation
        socket.emit('room_joined', { roomId, timestamp: Date.now() });
        
        return { success: true };
      }

      return { success: false, reason: 'Socket not found' };
    } catch (_error) {
      throw new AppError('Failed to join room', 'ROOM_JOIN_FAILED', 500);
    }
  }

  /**
   * Optimized room leaving
   */
  async leaveRoomOptimized(
    socketId: string,
    roomId: string
  ): Promise<void> {
    try {
      const metrics = this.connectionMetrics.get(socketId);
      
      if (metrics) {
        metrics.roomCount = Math.max(0, metrics.roomCount - 1);
        metrics.lastActivity = new Date();
      }

      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.leave(roomId);
        socket.emit('room_left', { roomId, timestamp: Date.now() });
      }

      // Clean up message queue for this room if no one is left
      const roomSockets = await this.io.in(roomId).fetchSockets();
      if (roomSockets.length === 0) {
        delete this.messageQueue[roomId];
        const timer = this.batchTimers.get(roomId);
        if (timer) {
          clearTimeout(timer);
          this.batchTimers.delete(roomId);
        }
      }
    } catch (_error) {
      throw new AppError('Failed to leave room', 'ROOM_LEAVE_FAILED', 500);
    }
  }

  /**
   * Track connection metrics
   */
  trackConnection(socketId: string, userId: string): void {
    this.connectionMetrics.set(socketId, {
      userId,
      socketId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      roomCount: 0
    });
  }

  /**
   * Update connection activity
   */
  updateActivity(socketId: string): void {
    const metrics = this.connectionMetrics.get(socketId);
    if (metrics) {
      metrics.lastActivity = new Date();
      metrics.messageCount++;
    }
  }

  /**
   * Remove connection tracking
   */
  removeConnection(socketId: string): void {
    this.connectionMetrics.delete(socketId);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    averageRoomsPerConnection: number;
    totalMessages: number;
    topUsers: Array<{ userId: string; messageCount: number; roomCount: number }>;
  } {
    const connections = Array.from(this.connectionMetrics.values());
    const now = Date.now();
    
    const activeConnections = connections.filter(
      conn => now - conn.lastActivity.getTime() < this.config.connectionTimeout
    );

    const userStats = new Map<string, { messageCount: number; roomCount: number }>();
    
    connections.forEach(conn => {
      const existing = userStats.get(conn.userId) || { messageCount: 0, roomCount: 0 };
      userStats.set(conn.userId, {
        messageCount: existing.messageCount + conn.messageCount,
        roomCount: existing.roomCount + conn.roomCount
      });
    });

    const topUsers = Array.from(userStats.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      averageRoomsPerConnection: connections.length > 0 
        ? connections.reduce((sum, conn) => sum + conn.roomCount, 0) / connections.length 
        : 0,
      totalMessages: connections.reduce((sum, conn) => sum + conn.messageCount, 0),
      topUsers
    };
  }

  /**
   * Schedule batch processing for a room
   */
  private scheduleBatchProcessing(roomId: string): void {
    if (this.batchTimers.has(roomId)) {
      return; // Already scheduled
    }

    const timer = setTimeout(async () => {
      await this.processRoomQueue(roomId);
      this.batchTimers.delete(roomId);
    }, this.config.messageBatchDelay);

    this.batchTimers.set(roomId, timer);
  }

  /**
   * Process message queue for a specific room
   */
  private async processRoomQueue(roomId: string): Promise<void> {
    const queue = this.messageQueue[roomId];
    if (!queue || queue.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.message.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.message.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp - b.timestamp;
    });

    // Process messages in batches
    const batchSize = Math.min(this.config.messageBatchSize, queue.length);
    const batch = queue.splice(0, batchSize);

    try {
      // Send messages to room
      this.io.to(roomId).emit('batch_messages', {
        messages: batch.map(item => item.message),
        timestamp: Date.now()
      });

      // Persist messages if needed
      const messagesToPersist = batch.filter(item => item.message.persist);
      if (messagesToPersist.length > 0) {
        await this.persistMessages(roomId, messagesToPersist.map(item => item.message));
      }
    } catch (_error) {
      // Retry failed messages
      batch.forEach(item => {
        if (item.retryCount < this.config.maxRetries && item.message.retryable) {
          item.retryCount++;
          queue.unshift(item); // Add back to front of queue
        }
      });
    }
  }

  /**
   * Process all message queues
   */
  private async processMessageQueues(): Promise<void> {
    const roomIds = Object.keys(this.messageQueue);
    
    for (const roomId of roomIds) {
      const queue = this.messageQueue[roomId];
      if (queue && queue.length >= this.config.messageBatchSize) {
        await this.processRoomQueue(roomId);
      }
    }
  }

  /**
   * Clean up inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveConnections: string[] = [];

    this.connectionMetrics.forEach((metrics, socketId) => {
      if (now - metrics.lastActivity.getTime() > this.config.connectionTimeout) {
        inactiveConnections.push(socketId);
      }
    });

    inactiveConnections.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      this.connectionMetrics.delete(socketId);
    });
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.connectionMetrics.forEach((metrics, socketId) => {
      if (now - metrics.connectedAt.getTime() > maxAge) {
        this.connectionMetrics.delete(socketId);
      }
    });
  }

  /**
   * Get user room count
   */
  private async getUserRoomCount(userId: string): Promise<number> {
    try {
      const count = await this.prisma.chatRoom.count({
        where: {
          OR: [
            { customerId: userId },
            { driverId: userId }
          ]
        }
      });
      return count;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Persist messages to database
   */
  private async persistMessages(roomId: string, messages: any[]): Promise<void> {
    try {
      const messageData = messages.map(msg => ({
        chatRoomId: roomId,
        senderId: msg.senderId,
        senderType: msg.senderType,
        message: msg.message,
        messageType: msg.messageType || 'TEXT',
        isRead: false
      }));

      await this.prisma.chatMessage.createMany({
        data: messageData
      });
    } catch (_error) {
      console.error('Realtime optimization service error:', _error);
    }
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'CONNECTION' | 'MESSAGE' | 'ROOM' | 'PERFORMANCE';
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
  }> {
    const recommendations: Array<{
      type: 'CONNECTION' | 'MESSAGE' | 'ROOM' | 'PERFORMANCE';
      description: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      action: string;
    }> = [];

    const stats = this.getConnectionStats();

    // Connection-based recommendations
    if (stats.totalConnections > 1000) {
      recommendations.push({
        type: 'CONNECTION',
        description: 'High number of concurrent connections detected',
        impact: 'HIGH',
        action: 'Consider implementing connection pooling or load balancing'
      });
    }

    if (stats.averageRoomsPerConnection > 5) {
      recommendations.push({
        type: 'ROOM',
        description: 'Users are joining too many rooms per connection',
        impact: 'MEDIUM',
        action: 'Consider reducing max rooms per connection or implementing room cleanup'
      });
    }

    // Message-based recommendations
    const totalQueuedMessages = Object.values(this.messageQueue)
      .reduce((sum, queue) => sum + queue.length, 0);

    if (totalQueuedMessages > 100) {
      recommendations.push({
        type: 'MESSAGE',
        description: 'High number of queued messages detected',
        impact: 'MEDIUM',
        action: 'Consider increasing batch processing frequency or batch size'
      });
    }

    // Performance recommendations
    if (stats.totalMessages > 10000) {
      recommendations.push({
        type: 'PERFORMANCE',
        description: 'High message volume detected',
        impact: 'HIGH',
        action: 'Consider implementing message archiving or database optimization'
      });
    }

    return recommendations;
  }
}

export default RealtimeOptimizationService;
