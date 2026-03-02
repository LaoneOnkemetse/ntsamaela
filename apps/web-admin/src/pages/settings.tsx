/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-useless-catch */
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Save,
  Refresh,
  Lock,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSystemHealth,
  getSystemMetrics,
  getAdminUsers,
  createAdminUser,
  resetUserPassword,
  deleteAdminUser,
} from "../services/api";
import apiClient from "../services/api";
import toast from "react-hot-toast";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { PersonAdd } from "@mui/icons-material";
import type { AuthUser } from "@shared/types";

const defaultSettings = {
  emailNotifications: true,
  smsNotifications: false,
  autoApproveVerifications: false,
  maintenanceMode: false,
  apiRateLimit: 1000,
  sessionTimeout: 30,
};

export default function Settings() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(defaultSettings);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    firstName: "Admin",
    lastName: "User",
    phone: "+26770000000",
  });
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const hasToken =
    typeof window !== "undefined" ? !!localStorage.getItem("token") : false;

  // Load settings from server on mount
  const {
    data: serverSettings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/admin/settings");
        const loadedSettings = response.data.data || response.data;
        if (loadedSettings && typeof loadedSettings === "object") {
          return loadedSettings;
        }
        return defaultSettings;
      } catch (error: any) {
        console.error("Error loading settings from server:", error);
        // Don't return defaultSettings here - let it be handled by the query
        throw error;
      }
    },
    retry: 2,
    staleTime: 0, // Always fetch fresh settings
  });

  useEffect(() => {
    if (serverSettings && typeof serverSettings === "object") {
      setSettings({ ...defaultSettings, ...serverSettings });
    }
  }, [serverSettings]);

  // On 401, clear token and force login (handles invalid/stale token even if interceptor didn't run)
  useEffect(() => {
    const status = (settingsError as any)?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, [settingsError]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: adminUsersList = [], refetch: refetchAdmins } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: getAdminUsers,
  });

  const createAdminMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setAdminDialogOpen(false);
      setNewAdminForm({
        email: "",
        password: "",
        firstName: "Admin",
        lastName: "User",
        phone: "+26770000000",
      });
      toast.success("Admin user created");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to create admin",
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({
      userId,
      newPassword,
    }: {
      userId: string;
      newPassword: string;
    }) => resetUserPassword(userId, newPassword),
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setSelectedAdminId(null);
      setNewPasswordValue("");
      setNewPasswordConfirm("");
      toast.success("Password updated");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to update password",
      );
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user removed");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to delete admin",
      );
    },
  });

  const currentUser = user as AuthUser | undefined;
  const currentUserId = currentUser?.id;

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: typeof settings) => {
      const response = await apiClient.post("/admin/settings", settingsData);
      const savedSettings = response.data.data || response.data;
      if (!savedSettings) {
        throw new Error("No settings returned from server");
      }
      return savedSettings;
    },
    onSuccess: (savedSettings) => {
      // Update local state with saved settings to ensure consistency
      setSettings({ ...defaultSettings, ...savedSettings });
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      toast.success("Settings saved successfully to server!");
    },
    onError: (error: any) => {
      console.error("Error saving settings:", error);
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to save settings to server";
      toast.error(errorMessage);
    },
  });

  const handleSave = async () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = async () => {
    try {
      const response = await apiClient.post("/admin/settings", defaultSettings);
      const savedSettings =
        response.data.data || response.data || defaultSettings;
      setSettings({ ...defaultSettings, ...savedSettings });
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      toast.success("Settings reset to default on server");
    } catch (error: any) {
      console.error("Error resetting settings:", error);
      toast.error(
        error.response?.data?.error?.message ||
          "Failed to reset settings on server",
      );
    }
  };

  // Fetch system health and metrics
  const {
    data: systemHealth,
    isLoading: healthLoading,
    error: healthError,
  } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      try {
        const health = await getSystemHealth();
        return health;
      } catch (error) {
        throw error;
      }
    },
    retry: false, // Don't retry on 401
  });

  const { data: systemMetrics } = useQuery({
    queryKey: ["systemMetrics"],
    queryFn: async () => {
      try {
        const metrics = await getSystemMetrics();
        return metrics;
      } catch (error) {
        throw error;
      }
    },
    retry: 1,
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await apiClient.post("/auth/change-password", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message || "Failed to change password",
      );
    },
  });

  const handleChangePassword = () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (!loading && !hasToken) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          flexDirection: "column",
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          System Settings
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
            Save Changes
          </Button>
        </Box>
      </Box>

      {Boolean(settingsError || healthError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(settingsError as any)?.response?.status === 401 ||
          (healthError as any)?.response?.status === 401
            ? "Session expired or invalid. Redirecting to login..."
            : settingsError
              ? `Failed to load settings from server: ${settingsError instanceof Error ? settingsError.message : String(settingsError)}`
              : `Failed to load system health: ${healthError instanceof Error ? healthError.message : String(healthError)}`}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Notification Settings" />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) =>
                      handleSettingChange(
                        "emailNotifications",
                        e.target.checked,
                      )
                    }
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={(e) =>
                      handleSettingChange("smsNotifications", e.target.checked)
                    }
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
                    onChange={(e) =>
                      handleSettingChange(
                        "autoApproveVerifications",
                        e.target.checked,
                      )
                    }
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
                    onChange={(e) =>
                      handleSettingChange("maintenanceMode", e.target.checked)
                    }
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
                onChange={(e) =>
                  handleSettingChange("apiRateLimit", parseInt(e.target.value))
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Session Timeout (minutes)"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) =>
                  handleSettingChange(
                    "sessionTimeout",
                    parseInt(e.target.value),
                  )
                }
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Information" />
            <CardContent>
              {healthLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Version:</strong> {systemHealth?.version || "1.0.0"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Last Updated:</strong>{" "}
                    {systemHealth?.timestamp
                      ? new Date(systemHealth.timestamp).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Database Status:</strong>{" "}
                    <span
                      style={{
                        color:
                          systemHealth?.services?.database?.status ===
                            "connected" ||
                          systemHealth?.database === "REAL" ||
                          systemHealth?.database === "real"
                            ? "#10B981"
                            : healthError
                              ? "#6B7280"
                              : "#EF4444",
                      }}
                    >
                      {healthError
                        ? "Unable to load (sign in required)"
                        : systemHealth?.services?.database?.status ===
                              "connected" ||
                            systemHealth?.database === "REAL" ||
                            systemHealth?.database === "real"
                          ? "Connected"
                          : "Disconnected"}
                    </span>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    <strong>Server Status:</strong>{" "}
                    <span
                      style={{
                        color:
                          systemHealth?.status === "healthy" ||
                          systemHealth?.services?.api?.status === "healthy"
                            ? "#10B981"
                            : healthError
                              ? "#6B7280"
                              : "#EF4444",
                      }}
                    >
                      {healthError
                        ? "Unable to load (sign in required)"
                        : systemHealth?.status === "healthy" ||
                            systemHealth?.services?.api?.status === "healthy"
                          ? "Healthy"
                          : "Unhealthy"}
                    </span>
                  </Typography>
                  {systemMetrics && (
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        <strong>Uptime:</strong> {systemMetrics.uptime || "N/A"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        <strong>Memory Usage:</strong>{" "}
                        {systemMetrics.memory?.usage || "N/A"}
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
            <CardHeader title="Change Password" avatar={<Lock />} />
            <CardContent>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                startIcon={<Lock />}
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                sx={{
                  backgroundColor: "#75AADB",
                  "&:hover": {
                    backgroundColor: "#5A8FBF",
                  },
                }}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Admin Users"
              subheader="Main admin can add other admins and change their passwords"
              action={
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => setAdminDialogOpen(true)}
                  sx={{
                    backgroundColor: "#75AADB",
                    "&:hover": { backgroundColor: "#5A8FBF" },
                  }}
                >
                  Add Admin
                </Button>
              }
            />
            <CardContent>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {adminUsersList.map((admin: any) => (
                  <Box
                    component="li"
                    key={admin.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography variant="body1">
                        {admin.name || admin.email}{" "}
                        {admin.id === currentUserId && "(you)"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {admin.email}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Lock />}
                        onClick={() => {
                          setSelectedAdminId(admin.id);
                          setNewPasswordValue("");
                          setNewPasswordConfirm("");
                          setPasswordDialogOpen(true);
                        }}
                      >
                        Change password
                      </Button>
                      {admin.id !== currentUserId && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => {
                            if (
                              window.confirm(`Remove admin ${admin.email}?`)
                            ) {
                              deleteAdminMutation.mutate(admin.id);
                            }
                          }}
                          disabled={deleteAdminMutation.isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Admin User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newAdminForm.email}
            onChange={(e) =>
              setNewAdminForm((f) => ({ ...f, email: e.target.value }))
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={newAdminForm.password}
            onChange={(e) =>
              setNewAdminForm((f) => ({ ...f, password: e.target.value }))
            }
            margin="normal"
            required
            helperText="Min 6 characters"
          />
          <TextField
            fullWidth
            label="First name"
            value={newAdminForm.firstName}
            onChange={(e) =>
              setNewAdminForm((f) => ({ ...f, firstName: e.target.value }))
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Last name"
            value={newAdminForm.lastName}
            onChange={(e) =>
              setNewAdminForm((f) => ({ ...f, lastName: e.target.value }))
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone"
            value={newAdminForm.phone}
            onChange={(e) =>
              setNewAdminForm((f) => ({ ...f, phone: e.target.value }))
            }
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (
                !newAdminForm.email ||
                !newAdminForm.password ||
                newAdminForm.password.length < 6
              ) {
                toast.error("Email and password (min 6 chars) required");
                return;
              }
              createAdminMutation.mutate(newAdminForm);
            }}
            disabled={createAdminMutation.isPending}
          >
            {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setSelectedAdminId(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Admin Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New password"
            type="password"
            value={newPasswordValue}
            onChange={(e) => setNewPasswordValue(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Confirm new password"
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (newPasswordValue.length < 6) {
                toast.error("Password must be at least 6 characters");
                return;
              }
              if (newPasswordValue !== newPasswordConfirm) {
                toast.error("Passwords do not match");
                return;
              }
              if (selectedAdminId) {
                resetPasswordMutation.mutate({
                  userId: selectedAdminId,
                  newPassword: newPasswordValue,
                });
              }
            }}
            disabled={!selectedAdminId || resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending
              ? "Updating..."
              : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
