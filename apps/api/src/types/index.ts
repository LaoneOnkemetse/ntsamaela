import { Request } from 'express';

// API Types
export interface JWTPayload {
  id: string;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: string;
  identityVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// Package Types
export interface CreatePackageRequest {
  description: string;
  pickupAddress: Address | string;
  deliveryAddress: Address | string;
  estimatedValue?: number;
  priceOffered?: number;
  weight: number;
  dimensions: Dimensions | string;
  imageUrl?: string;
  // Simple coordinate format
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

// Trip Types
export interface CreateTripRequest {
  origin: Address;
  destination: Address;
  scheduledDate: string;
  capacity: number;
  vehicleType: string;
  price?: number;
}

// Verification Types
export interface VerificationRequest {
  documentType: string;
  frontImage: string;
  backImage?: string;
  selfieImage: string;
}

// Wallet Types
export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  status: string;
  createdAt: string;
}

// Theme Types (for mobile)
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}
