import { ApiResponse, AuthUser, LoginRequest, RegisterRequest } from '@shared/types';

class AuthService {
  private getBaseUrl(): string {
    // First, check if environment variable is set
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // If in browser, try to auto-detect from current URL
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin;
      console.log('🔍 Auto-detecting API URL from:', currentUrl);
      
      // Try different patterns to find API URL
      // Pattern 1: Replace web-admin with api (handles: web-admin -> api)
      let apiUrl = currentUrl.replace(/web-admin/gi, 'api');
      
      // Pattern 2: Replace ntsamaelaweb-admin with ntsamaelaapi
      if (apiUrl === currentUrl) {
        apiUrl = currentUrl.replace(/ntsamaelaweb-admin/gi, 'ntsamaelaapi');
      }
      
      // Pattern 3: Replace web-admin-production with api-production (Railway pattern)
      if (apiUrl === currentUrl) {
        apiUrl = currentUrl.replace(/web-admin-production/gi, 'api-production');
      }
      
      // Pattern 4: Try Railway-specific pattern: ntsamaelaweb-admin-production -> ntsamaelaapi-production
      if (apiUrl === currentUrl) {
        apiUrl = currentUrl.replace(/ntsamaelaweb-admin-production/gi, 'ntsamaelaapi-production');
      }
      
      // If we found a different URL, use it with /api path
      if (apiUrl !== currentUrl) {
        const finalUrl = apiUrl + '/api';
        console.log('✅ Auto-detected API URL:', finalUrl);
        return finalUrl;
      }
      
      // Fallback: try common Railway API service names
      const commonPatterns = [
        currentUrl.replace(/web-admin-production/gi, 'api-production'),
        currentUrl.replace(/web-admin/gi, 'api'),
        'https://ntsamaelaapi-production.up.railway.app/api',
      ];
      
      const fallbackUrl = commonPatterns.find(url => url !== currentUrl) || 'http://localhost:3001/api';
      console.log('⚠️ Using fallback API URL:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Server-side fallback
    return 'http://localhost:3001/api';
  }
  
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = this.getBaseUrl();
    // Log the API URL being used (only in browser)
    if (typeof window !== 'undefined') {
      console.log('🔗 AuthService API URL:', this.baseUrl);
      console.log('🔗 NEXT_PUBLIC_API_URL env:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
      console.log('🔗 Current window location:', window.location.origin);
    }
  }

  // Public method to get the API URL (for display purposes)
  getApiUrl(): string {
    return this.baseUrl;
  }
  
  // Check if using auto-detected URL (not from env var)
  isUsingAutoDetectedUrl(): boolean {
    return !process.env.NEXT_PUBLIC_API_URL;
  }

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


