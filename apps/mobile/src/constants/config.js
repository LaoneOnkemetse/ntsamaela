// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.116:3000',
  TIMEOUT: 10000,
};

// Socket.IO Configuration
export const SOCKET_CONFIG = {
  URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.1.116:3000',
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Ntsamaela',
  VERSION: '1.0.0',
};

