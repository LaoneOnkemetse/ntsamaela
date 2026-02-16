// API Configuration - production: set EXPO_PUBLIC_API_URL (Railway API URL). Dev: fallback to local.
const getApiBase = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://192.168.1.116:3000' : '';
};

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBase();
  },
  TIMEOUT: 10000,
};

// Socket.IO - production: set EXPO_PUBLIC_SOCKET_URL (same as API). Dev: fallback to local.
const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) return process.env.EXPO_PUBLIC_SOCKET_URL;
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://192.168.1.116:3000' : '';
};

export const SOCKET_CONFIG = {
  get URL() {
    return getSocketUrl();
  },
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Ntsamaela',
  VERSION: '1.0.0',
};

