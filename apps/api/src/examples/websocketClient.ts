/**
 * WebSocket Client Service Example
 * This is an example of how to use the real-time features on the client side
 */

import io from 'socket.io-client';
// import type { Socket } from 'socket.io-client';

// Declare Notification for browser compatibility
declare const Notification: any;

export interface WebSocketConfig {
  serverUrl: string;
  token: string;
  userId: string;
  userType: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
}

export class WebSocketClient {
  private socket: any | null = null;
  private config: WebSocketConfig;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.serverUrl, {
        auth: {
          token: this.config.token,
          userId: this.config.userId
        }
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        
        // Register user connection
        this.socket?.emit('user:connect', {
          userId: this.config.userId,
          userType: this.config.userType
        });
        
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('WebSocket client error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      this.setupEventListeners();
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to package tracking updates
   */
  public subscribeToPackageTracking(packageId: string): void {
    this.socket?.emit('package:track', { packageId });
    console.log(`Subscribed to package tracking: ${packageId}`);
  }

  /**
   * Update package location (for drivers)
   */
  public updatePackageLocation(
    packageId: string,
    latitude: number,
    longitude: number,
    status: string
  ): void {
    this.socket?.emit('package:location:update', {
      packageId,
      latitude,
      longitude,
      status
    });
  }

  /**
   * Subscribe to bid notifications
   */
  public subscribeToBids(packageId: string): void {
    this.socket?.emit('bid:subscribe', { packageId });
    console.log(`Subscribed to bids for package: ${packageId}`);
  }

  /**
   * Unsubscribe from bid notifications
   */
  public unsubscribeFromBids(packageId: string): void {
    this.socket?.emit('bid:unsubscribe', { packageId });
    console.log(`Unsubscribed from bids for package: ${packageId}`);
  }

  /**
   * Subscribe to delivery status updates
   */
  public subscribeToDeliveryStatus(packageId: string): void {
    this.socket?.emit('delivery:status:subscribe', { packageId });
    console.log(`Subscribed to delivery status for package: ${packageId}`);
  }

  /**
   * Update delivery status (for drivers)
   */
  public updateDeliveryStatus(
    packageId: string,
    status: string,
    location?: string,
    notes?: string
  ): void {
    this.socket?.emit('delivery:status:update', {
      packageId,
      status,
      location,
      notes
    });
  }

  /**
   * Join a chat room
   */
  public joinChatRoom(chatRoomId: string): void {
    this.socket?.emit('chat:join', { chatRoomId });
    console.log(`Joined chat room: ${chatRoomId}`);
  }

  /**
   * Leave a chat room
   */
  public leaveChatRoom(chatRoomId: string): void {
    this.socket?.emit('chat:leave', { chatRoomId });
    console.log(`Left chat room: ${chatRoomId}`);
  }

  /**
   * Send a chat message
   */
  public sendChatMessage(
    chatRoomId: string,
    message: string,
    messageType: string = 'TEXT'
  ): void {
    this.socket?.emit('chat:message', {
      chatRoomId,
      message,
      messageType
    });
  }

  /**
   * Send typing indicator
   */
  public sendTypingIndicator(chatRoomId: string, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { chatRoomId, isTyping });
  }

  /**
   * Subscribe to notifications
   */
  public subscribeToNotifications(userId: string): void {
    this.socket?.emit('notification:subscribe', { userId });
    console.log(`Subscribed to notifications for user: ${userId}`);
  }

  /**
   * Mark notification as read
   */
  public markNotificationAsRead(notificationId: string): void {
    this.socket?.emit('notification:read', { notificationId });
  }

  /**
   * Subscribe to trip updates
   */
  public subscribeToTrip(tripId: string): void {
    this.socket?.emit('trip:subscribe', { tripId });
    console.log(`Subscribed to trip: ${tripId}`);
  }

  /**
   * Update trip location (for drivers)
   */
  public updateTripLocation(
    tripId: string,
    latitude: number,
    longitude: number,
    status: string
  ): void {
    this.socket?.emit('trip:location:update', {
      tripId,
      latitude,
      longitude,
      status
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Setup default event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Package tracking events
    this.socket.on('package:location:updated', (data: any) => {
      this.emit('package:location:updated', data);
    });

    this.socket.on('package:status:updated', (data: any) => {
      this.emit('package:status:updated', data);
    });

    // Bid events
    this.socket.on('bid:received', (data: any) => {
      this.emit('bid:received', data);
    });

    this.socket.on('bid:accepted', (data: any) => {
      this.emit('bid:accepted', data);
    });

    this.socket.on('bid:rejected', (data: any) => {
      this.emit('bid:rejected', data);
    });

    // Delivery events
    this.socket.on('delivery:status:updated', (data: any) => {
      this.emit('delivery:status:updated', data);
    });

    this.socket.on('delivery:started', (data: any) => {
      this.emit('delivery:started', data);
    });

    this.socket.on('delivery:completed', (data: any) => {
      this.emit('delivery:completed', data);
    });

    this.socket.on('delivery:failed', (data: any) => {
      this.emit('delivery:failed', data);
    });

    // Chat events
    this.socket.on('chat:message:received', (data: any) => {
      this.emit('chat:message:received', data);
    });

    this.socket.on('chat:typing', (data: any) => {
      this.emit('chat:typing', data);
    });

    this.socket.on('chat:joined', (data: any) => {
      this.emit('chat:joined', data);
    });

    this.socket.on('chat:left', (data: any) => {
      this.emit('chat:left', data);
    });

    // Notification events
    this.socket.on('notification:new', (data: any) => {
      this.emit('notification:new', data);
    });

    this.socket.on('notification:read', (data: any) => {
      this.emit('notification:read', data);
    });

    // Trip events
    this.socket.on('trip:status:updated', (data: any) => {
      this.emit('trip:status:updated', data);
    });

    this.socket.on('trip:location:updated', (data: any) => {
      this.emit('trip:location:updated', data);
    });

    // User events
    this.socket.on('user:connected', (data: any) => {
      this.emit('user:connected', data);
    });

    this.socket.on('user:disconnected', (data: any) => {
      this.emit('user:disconnected', data);
    });

    // Error events
    this.socket.on('error', (data: any) => {
      this.emit('error', data);
    });

    // Broadcast events
    this.socket.on('broadcast', (data: any) => {
      this.emit('broadcast', data);
    });
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (_error) {
          console.error('WebSocket client error:', _error);
        }
      });
    }
  }
}

/**
 * Usage Examples
 */

// Example 1: Customer tracking a package
export function setupCustomerTracking() {
  const client = new WebSocketClient({
    serverUrl: 'http://localhost:3002',
    token: 'customer-jwt-token',
    userId: 'customer-123',
    userType: 'CUSTOMER'
  });

  client.connect().then(() => {
    // Subscribe to package tracking
    client.subscribeToPackageTracking('package-123');
    
    // Subscribe to delivery status
    client.subscribeToDeliveryStatus('package-123');
    
    // Subscribe to notifications
    client.subscribeToNotifications('customer-123');

    // Listen for updates
    client.on('package:location:updated', (data: any) => {
      console.log('Package location updated:', data);
      // Update UI with new location
    });

    client.on('delivery:status:updated', (data: any) => {
      console.log('Delivery status updated:', data);
      // Update UI with new status
    });

    client.on('notification:new', (data: any) => {
      console.log('New notification:', data);
      // Show notification to user
    });
  });
}

// Example 2: Driver managing deliveries
export function setupDriverTracking() {
  const client = new WebSocketClient({
    serverUrl: 'http://localhost:3002',
    token: 'driver-jwt-token',
    userId: 'driver-123',
    userType: 'DRIVER'
  });

  client.connect().then(() => {
    // Subscribe to bids
    client.subscribeToBids('package-123');
    
    // Subscribe to trip updates
    client.subscribeToTrip('trip-123');

    // Listen for bid notifications
    client.on('bid:received', (data: any) => {
      console.log('New bid received:', data);
      // Show bid notification to driver
    });

    // Update package location periodically
    setInterval(() => {
      if (client.isConnected()) {
        client.updatePackageLocation('package-123', 40.7128, -74.0060, 'IN_TRANSIT');
      }
    }, 30000); // Every 30 seconds

    // Update delivery status
    client.updateDeliveryStatus('package-123', 'DELIVERED', '123 Main St', 'Package delivered successfully');
  });
}

// Example 3: Chat system
export function setupChatSystem() {
  const client = new WebSocketClient({
    serverUrl: 'http://localhost:3002',
    token: 'user-jwt-token',
    userId: 'user-123',
    userType: 'CUSTOMER'
  });

  client.connect().then(() => {
    // Join chat room
    client.joinChatRoom('chat-123');

    // Listen for messages
    client.on('chat:message:received', (data: any) => {
      console.log('New message:', data);
      // Display message in chat UI
    });

    // Listen for typing indicators
    client.on('chat:typing', (data: any) => {
      console.log('User typing:', data);
      // Show typing indicator in UI
    });

    // Send message
    client.sendChatMessage('chat-123', 'Hello, is my package on the way?');

    // Send typing indicator
    client.sendTypingIndicator('chat-123', true);
    setTimeout(() => {
      client.sendTypingIndicator('chat-123', false);
    }, 1000);
  });
}

// Example 4: Real-time notifications
export function setupNotificationSystem() {
  const client = new WebSocketClient({
    serverUrl: 'http://localhost:3002',
    token: 'user-jwt-token',
    userId: 'user-123',
    userType: 'CUSTOMER'
  });

  client.connect().then(() => {
    // Subscribe to notifications
    client.subscribeToNotifications('user-123');

    // Listen for notifications
    client.on('notification:new', (data: any) => {
      console.log('New notification:', data);
      
      // Show browser notification if permission granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(data.notification.title, {
          body: data.notification.message,
          icon: '/icon.png'
        });
      }
    });

    // Mark notification as read when clicked
    client.on('notification:new', (data: any) => {
      // When user clicks notification
      client.markNotificationAsRead(data.notification.id);
    });
  });
}
