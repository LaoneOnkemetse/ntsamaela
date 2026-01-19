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
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check for stored token on app start (only in browser, not SSR)
    // Only run once, not on every render
    if (authChecked) return;
    
    const checkAuth = async () => {
      // Check if we're in the browser (not SSR)
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        // Trust the token exists - don't verify it immediately
        // Verification will happen when making API calls
        // This prevents redirect loops from failed auth checks
        setToken(storedToken);
        console.log('Token found in localStorage, trusting it for now');
        
        // Try to get user info in background, but don't block or fail if it doesn't work
        // The user can still use the app and API calls will verify the token
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin.replace('web-admin', 'api') + '/api' : '');
        if (apiUrl) {
          // Try to get user, but don't block if it fails
          fetch(`${apiUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              return null;
            })
            .then(data => {
              if (data?.success && data?.data) {
                setUser(data.data);
              }
            })
            .catch(error => {
              // Silently fail - token might still be valid
              console.log('Could not verify token, but keeping it:', error.message);
            });
        }
      } else {
        // No token found - user is definitely not logged in
        setUser(null);
        setToken(null);
      }
      setLoading(false);
      setAuthChecked(true);
    };
    
    checkAuth();
  }, [authChecked]);

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


