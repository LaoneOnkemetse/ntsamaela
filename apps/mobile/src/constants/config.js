const RAILWAY_API_URL = 'https://ntsamaelaapi-production.up.railway.app';

// API Configuration - production: Railway API. Dev: local fallback.
const getApiBase = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://192.168.1.116:3000' : RAILWAY_API_URL;
};

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBase();
  },
  TIMEOUT: 10000,
};

// Socket.IO - production: same as API. Dev: local fallback.
const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) return process.env.EXPO_PUBLIC_SOCKET_URL;
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://192.168.1.116:3000' : RAILWAY_API_URL;
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

