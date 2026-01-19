import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

// Simple types for development
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'CUSTOMER' | 'DRIVER';
  identityVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'CUSTOMER' | 'DRIVER';
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<boolean>;
  setAuthData: (user: AuthUser, token: string) => void; // Direct method to set auth data
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app start (only in browser, not SSR)
    const checkAuth = async () => {
      // Check if we're in the browser (not SSR)
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          // Try to fetch current user from API
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace('web-admin', 'api') + '/api' : '');
          if (!apiUrl) {
            console.error('API URL not configured');
            setLoading(false);
            return;
          }
          
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setUser(data.data);
            } else {
              // Token invalid (explicit failure from API)
              console.warn('Token validation failed - API returned unsuccessful response');
              localStorage.removeItem('token');
              setToken(null);
            }
          } else if (response.status === 401 || response.status === 403) {
            // Only clear token on actual auth errors (401/403)
            console.warn('Token invalid - received', response.status);
            localStorage.removeItem('token');
            setToken(null);
          } else {
            // Network or server errors - keep token, user might still be valid
            console.warn('Auth check failed with status', response.status, '- keeping token');
            // Don't clear token on network/server errors - user might still be authenticated
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          // On network errors, don't clear token - might be temporary network issue
          // Only clear if it's a clear authentication error
          // Keep the token and let the user try to use the app
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', userToken);
        }
        return true;
      } else {
        console.error('Login failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (userData: RegisterRequest): Promise<boolean> => {
    try {
      // Mock registration for development
      const mockUser: AuthUser = {
        id: 'mock-user-id',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        userType: userData.userType,
        identityVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      setUser(mockUser);
      setToken(mockToken);
      localStorage.setItem('token', mockToken);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const setAuthData = (userData: AuthUser, userToken: string) => {
    console.log('Setting auth data:', { user: userData.email, hasToken: !!userToken });
    setUser(userData);
    setToken(userToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', userToken);
      console.log('Token saved to localStorage');
    }
    // Ensure loading is false and mark auth as checked after setting auth data
    setLoading(false);
    setAuthChecked(true);
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    setAuthData,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


