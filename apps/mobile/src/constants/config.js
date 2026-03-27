const RAILWAY_API_URL = "https://ntsamaelaapi-production.up.railway.app";

// API Configuration - always production (Railway). Override with EXPO_PUBLIC_API_URL if needed.
// Normalize common misconfigurations (e.g. missing https://).
const normalizeBaseUrl = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // If user sets "ntsamaelaapi-production.up.railway.app" treat as https.
  return `https://${raw}`;
};

const stripApiSuffix = (url) => {
  const u = (url || "").toString().trim().replace(/\/+$/, "");
  // If someone sets EXPO_PUBLIC_API_URL to ".../api", avoid generating ".../api/api/..."
  return u.toLowerCase().endsWith("/api") ? u.slice(0, -4) : u;
};

const getApiBase = () => {
  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  return stripApiSuffix(fromEnv) || RAILWAY_API_URL;
};

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBase();
  },
  TIMEOUT: 10000,
};

// Socket.IO - same as API (normalize too).
const getSocketUrl = () =>
  stripApiSuffix(normalizeBaseUrl(process.env.EXPO_PUBLIC_SOCKET_URL)) ||
  stripApiSuffix(normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL)) ||
  RAILWAY_API_URL;

export const SOCKET_CONFIG = {
  get URL() {
    return getSocketUrl();
  },
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: "Ntsamaela",
  VERSION: "1.0.0",
};
