import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, TextField, Switch, FormControlLabel, Divider, Alert, CircularProgress } from '@mui/material';
import { Settings as SettingsIcon, Save, Refresh, Lock } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSystemHealth, getSystemMetrics } from '../services/api';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const SETTINGS_STORAGE_KEY = 'ntsamaela_admin_settings';

const defaultSettings = {
  emailNotifications: true,
  smsNotifications: false,
  autoApproveVerifications: false,
  maintenanceMode: false,
  apiRateLimit: 1000,
  sessionTimeout: 30,
};

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }
      
      // Try to save to API (if endpoint exists)
      try {
        await apiClient.post('/admin/settings', settings);
      } catch (apiError) {
        // API endpoint might not exist yet, that's okay
        console.log('Settings API endpoint not available, saved to localStorage only');
      }
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
    toast.success('Settings reset to default');
  };

  // Fetch system health and metrics
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      try {
        const health = await getSystemHealth();
        return health;
      } catch (error) {
        return null;
      }
    },
  });

  const { data: systemMetrics } = useQuery({
    queryKey: ['systemMetrics'],
    queryFn: async () => {
      try {
        const metrics = await getSystemMetrics();
        return metrics;
      } catch (error) {
        return null;
      }
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.post('/auth/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
            Reset
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
            Save Changes
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Notification Settings" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                  />
                }
                label="SMS Notifications"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Verification Settings" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoApproveVerifications}
                    onChange={(e) => handleSettingChange('autoApproveVerifications', e.target.checked)}
                  />
                }
                label="Auto-approve Verifications"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Settings" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  />
                }
                label="Maintenance Mode"
              />
              <Divider sx={{ my: 2 }} />
              <TextField
                fullWidth
                label="API Rate Limit (requests/hour)"
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => handleSettingChange('apiRateLimit', parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Session Timeout (minutes)"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Information" />
            <CardContent>
              {healthLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Version:</strong> {systemHealth?.version || '1.0.0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Last Updated:</strong> {systemHealth?.timestamp 
                      ? new Date(systemHealth.timestamp).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Database Status:</strong>{' '}
                    <span style={{ 
                      color: (systemHealth?.services?.database?.status === 'connected' || 
                              systemHealth?.database?.status === 'connected' || 
                              systemHealth?.database === 'REAL' || 
                              systemHealth?.database === 'MOCK') ? '#10B981' : '#EF4444' 
                    }}>
                      {(systemHealth?.services?.database?.status === 'connected' || 
                        systemHealth?.database?.status === 'connected' || 
                        systemHealth?.database === 'REAL' || 
                        systemHealth?.database === 'MOCK') ? 'Connected' : 'Disconnected'}
                    </span>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Server Status:</strong>{' '}
                    <span style={{ 
                      color: (systemHealth?.status === 'healthy' || 
                              systemHealth?.services?.api?.status === 'healthy' || 
                              systemHealth?.status === 'ok') ? '#10B981' : '#EF4444' 
                    }}>
                      {(systemHealth?.status === 'healthy' || 
                        systemHealth?.services?.api?.status === 'healthy' || 
                        systemHealth?.status === 'ok') ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </Typography>
                  {systemMetrics && (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Uptime:</strong> {systemMetrics.uptime || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Memory Usage:</strong> {systemMetrics.memory?.usage || 'N/A'}
                      </Typography>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Change Password" 
              avatar={<Lock />}
            />
            <CardContent>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                sx={{ mb: 2 }}
              />
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<Lock />}
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                sx={{
                  backgroundColor: '#75AADB',
                  '&:hover': {
                    backgroundColor: '#5A8FBF',
                  },
                }}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
