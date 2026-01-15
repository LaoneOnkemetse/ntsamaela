import { ApiResponse, AuthUser, LoginRequest, RegisterRequest } from '@shared/types';

class AuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred'
        }
      };
    }
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    try {
      console.log('🔐 Attempting login to:', `${this.baseUrl}/auth/login`);
      console.log('📧 Email:', credentials.email);
      
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('❌ Login failed:', errorData);
        return {
          success: false,
          error: errorData.error || {
            code: 'LOGIN_ERROR',
            message: `Server returned ${response.status}: ${errorData.error?.message || response.statusText}`
          }
        };
      }

      const data = await response.json();
      console.log('✅ Login response:', data.success ? 'Success' : 'Failed');
      return data;
    } catch (error: any) {
      console.error('❌ Network error during login:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Unable to connect to server. Please check if the API is running.'
        }
      };
    }
  }

  async getCurrentUser(token: string): Promise<ApiResponse<AuthUser>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred'
        }
      };
    }
  }

  async logout(token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred'
        }
      };
    }
  }
}

export const authService = new AuthService();


