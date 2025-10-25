// Shared constants for the Ntsamaela platform

export const COMMISSION_RATE = 0.30; // 30% commission

export const USER_TYPES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
} as const;

export const DOCUMENT_TYPES = {
  DRIVERS_LICENSE: 'DRIVERS_LICENSE',
  NATIONAL_ID: 'NATIONAL_ID',
  PASSPORT: 'PASSPORT',
} as const;

export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FLAGGED: 'FLAGGED',
} as const;

export const PACKAGE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  COLLECTED: 'COLLECTED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const TRIP_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const BID_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const TRANSACTION_TYPES = {
  RECHARGE: 'RECHARGE',
  COMMISSION_HOLD: 'COMMISSION_HOLD',
  COMMISSION_DEDUCTION: 'COMMISSION_DEDUCTION',
  REFUND: 'REFUND',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export const NOTIFICATION_TYPES = {
  PACKAGE_UPDATE: 'PACKAGE_UPDATE',
  BID_RECEIVED: 'BID_RECEIVED',
  VERIFICATION_STATUS: 'VERIFICATION_STATUS',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
} as const;

// Risk scoring thresholds
export const RISK_THRESHOLDS = {
  LOW_RISK: 25,
  MEDIUM_RISK: 75,
  HIGH_RISK: 100,
} as const;

// Verification requirements
export const VERIFICATION_REQUIREMENTS = {
  DRIVER: {
    documentTypes: [DOCUMENT_TYPES.DRIVERS_LICENSE],
    requiresBackImage: true,
    minConfidence: 85,
  },
  CUSTOMER: {
    documentTypes: [
      DOCUMENT_TYPES.DRIVERS_LICENSE,
      DOCUMENT_TYPES.NATIONAL_ID,
      DOCUMENT_TYPES.PASSPORT,
    ],
    requiresBackImage: false,
    minConfidence: 75,
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  VERIFICATION: {
    SUBMIT: '/verification/submit',
    STATUS: '/verification/status',
    RETRY: '/verification/retry',
  },
  PACKAGES: {
    CREATE: '/packages',
    LIST: '/packages',
    GET: '/packages/:id',
    UPDATE: '/packages/:id',
    DELETE: '/packages/:id',
  },
  TRIPS: {
    CREATE: '/trips',
    LIST: '/trips',
    GET: '/trips/:id',
    UPDATE: '/trips/:id',
    DELETE: '/trips/:id',
  },
  BIDS: {
    CREATE: '/bids',
    GET_BY_PACKAGE: '/bids/package/:packageId',
    ACCEPT: '/bids/:id/accept',
    REJECT: '/bids/:id/reject',
    DELETE: '/bids/:id',
  },
  WALLET: {
    RECHARGE: '/wallet/recharge',
    BALANCE: '/wallet/balance',
    TRANSACTIONS: '/wallet/transactions',
  },
  DELIVERIES: {
    COLLECT: '/deliveries/:id/collect',
    CONFIRM_COLLECTION: '/deliveries/:id/confirm-collection',
    START: '/deliveries/:id/start',
    COMPLETE: '/deliveries/:id/complete',
    CONFIRM_DELIVERY: '/deliveries/:id/confirm-delivery',
  },
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGES_PER_VERIFICATION: 3,
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  PACKAGE_LIST: 60, // 1 minute
  TRIP_LIST: 60, // 1 minute
  VERIFICATION_STATUS: 30, // 30 seconds
} as const;

// Rate limiting
export const RATE_LIMITS = {
  API_REQUESTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
  },
  VERIFICATION_SUBMISSIONS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each user to 3 verification attempts per hour
  },
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'User logged in successfully',
  VERIFICATION_SUBMITTED: 'Verification submitted successfully',
  VERIFICATION_APPROVED: 'Verification approved',
  PACKAGE_CREATED: 'Package created successfully',
  BID_PLACED: 'Bid placed successfully',
  BID_ACCEPTED: 'Bid accepted successfully',
  PAYMENT_PROCESSED: 'Payment processed successfully',
  DELIVERY_COMPLETED: 'Delivery completed successfully',
} as const;













