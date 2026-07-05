// Socket.IO Service for real-time communication
// Note: socket.io-client may need polyfills for React Native
// Consider using react-native-socket.io or a WebSocket wrapper
/* eslint-disable @typescript-eslint/no-require-imports */
import { SOCKET_CONFIG } from "../constants/config";

// Conditional import for socket.io-client
let io;
try {
  // Try to import socket.io-client (works in web, may need polyfills for React Native)
  io = require("socket.io-client").io;
} catch {
  console.warn("socket.io-client not available, using mock implementation");
  // Fallback mock implementation
  io = () => ({
    on: () => {},
    off: () => {},
    emit: () => {},
    connect: () => {},
    disconnect: () => {},
    connected: false,
  });
}

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map();
  }

  connect(token, userId, userType) {
    if (this.socket?.connected) {
      if (userId && userType) {
        this.socket.emit("user:connect", { userId, userType });
      }
      return;
    }

    this.token = token;
    this.userId = userId;
    this.userType = userType;
    this.socket = io(SOCKET_CONFIG.URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
      if (this.userId && this.userType) {
        this.socket.emit("user:connect", {
          userId: this.userId,
          userType: this.userType,
        });
      }
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Re-register all listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected, cannot emit:", event);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
