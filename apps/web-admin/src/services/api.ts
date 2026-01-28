import axios from 'axios';

// Use same-origin `/api` and let Next.js rewrites proxy to the real backend.
const API_BASE_URL = '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout to prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
// IMPORTANT: Do NOT automatically redirect on 401 here – it caused login/dashboard loops
// Let individual pages decide how to handle 401s based on context
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('API 401 Unauthorized:', {
        url: error.config?.url,
        method: error.config?.method,
      });
      // We intentionally do NOT clear the token or redirect here.
      // The login page and protected pages will handle auth errors explicitly.
    }
    return Promise.reject(error);
  }
);

// Dashboard API methods
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard');
    // Handle both nested and flat response structures
    return response.data.data || response.data.summary || response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

export const getRecentActivity = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/activity');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

// User management API methods
export const getUsers = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/users', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData: any) => {
  try {
    const response = await apiClient.post('/admin/users', userData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUser = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const suspendUser = async (id: string, reason?: string) => {
  try {
    const response = await apiClient.post(`/admin/users/${id}/suspend`, { reason });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error suspending user:', error);
    throw error;
  }
};

export const unsuspendUser = async (id: string) => {
  try {
    const response = await apiClient.post(`/admin/users/${id}/unsuspend`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error unsuspending user:', error);
    throw error;
  }
};

// Driver management API methods
export const getDrivers = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/drivers', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
};

export const getDriverById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/drivers/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching driver:', error);
    throw error;
  }
};

export const updateDriver = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/drivers/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
};

export const deleteDriver = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
};

// Trip management API methods
export const getTrips = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/trips', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error;
  }
};

export const getTripById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/trips/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trip:', error);
    throw error;
  }
};

export const updateTrip = async (id: string, data: any) => {
  try {
    const response = await apiClient.put(`/admin/trips/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteTrip = async (id: string) => {
  try {
    const response = await apiClient.delete(`/admin/trips/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// Verification management API methods
export const getVerifications = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/verifications', { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching verifications:', error);
    throw error;
  }
};

export const approveVerification = async (id: string) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${id}/approve`);
    return response.data.data;
  } catch (error) {
    console.error('Error approving verification:', error);
    throw error;
  }
};

export const rejectVerification = async (id: string, reason: string) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
    return response.data.data;
  } catch (error) {
    console.error('Error rejecting verification:', error);
    throw error;
  }
};

// Package management API methods
export const getPackages = async (params?: any) => {
  try {
    const response = await apiClient.get('/packages', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

export const getPackageById = async (id: string) => {
  try {
    const response = await apiClient.get(`/packages/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
};

export const updatePackageStatus = async (id: string, status: string) => {
  try {
    const response = await apiClient.put(`/packages/${id}/status`, { status });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error updating package status:', error);
    throw error;
  }
};

// Wallet management API methods
export const getWallets = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw error;
  }
};

export const getWalletById = async (id: string) => {
  try {
    const response = await apiClient.get(`/admin/transactions/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    throw error;
  }
};

// Analytics API methods
export const getAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/analytics', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export const getRealTimeMetrics = async () => {
  try {
    const response = await apiClient.get('/admin/analytics/realtime');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    throw error;
  }
};

export const exportAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.post('/admin/analytics/export', params, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting analytics:', error);
    throw error;
  }
};

// System health API methods
export const getSystemHealth = async () => {
  try {
    // Try admin system health endpoint first
    const response = await apiClient.get('/admin/system/health');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching system health from admin endpoint:', error);
    // Fallback to public health check
    try {
      const response = await axios.get(`/health/all`);
      return response.data;
    } catch (fallbackError) {
      console.error('Error fetching system health from public endpoint:', fallbackError);
      // Final fallback to basic health check
      try {
        const response = await axios.get(`/health`);
        return response.data;
      } catch (basicError) {
        console.error('Error fetching basic health:', basicError);
        return null;
      }
    }
  }
};

export const getSystemMetrics = async () => {
  try {
    const response = await apiClient.get('/admin/system/metrics');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    // Return basic metrics from health check
    try {
      const health = await getSystemHealth();
      return {
        uptime: health?.uptime || 0,
        memory: { usage: 'N/A' },
      };
    } catch {
      return null;
    }
  }
};

// Transaction API methods
export const getTransactions = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransactionAnalytics = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/transactions/analytics', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching transaction analytics:', error);
    throw error;
  }
};

export const refundTransaction = async (id: string, amount?: number) => {
  try {
    const response = await apiClient.post(`/admin/transactions/${id}/refund`, { amount });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error refunding transaction:', error);
    throw error;
  }
};

// Audit log API methods
export const getAuditLog = async (params?: any) => {
  try {
    const response = await apiClient.get('/admin/audit-log', { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw error;
  }
};

// Bulk operations
export const performBulkAction = async (action: string, targetIds: string[], metadata?: any) => {
  try {
    const response = await apiClient.post('/admin/bulk-action', {
      action,
      targetIds,
      metadata,
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error performing bulk action:', error);
    throw error;
  }
};

// Admin Notifications API methods (admin-specific notifications like verifications, complaints, etc.)
export const getNotifications = async (params?: any) => {
  try {
    // Use admin notifications endpoint for admin-specific notifications ONLY
    // Do NOT fallback to user notifications - admin should only see admin notifications
    const response = await apiClient.get('/admin/notifications', { params });
    return response.data.data || response.data || [];
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    // Return empty array instead of falling back to user notifications
    // Admin should not see user notifications like "New Bid Received" or "Package Delivered"
    return [];
  }
};

// Export default for use in components
export default apiClient;
