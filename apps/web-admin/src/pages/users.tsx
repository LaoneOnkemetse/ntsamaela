/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search,
  MoreVert,
  Block,
  CheckCircle,
  Person,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
  getUserById,
  resetUserPassword,
} from "../services/api";
import toast from "react-hot-toast";

export default function Users() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [credentialsFormData, setCredentialsFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    userType: "CUSTOMER" as "CUSTOMER" | "DRIVER",
  });

  const {
    data: selectedUserDetails,
    isLoading: isLoadingUserDetails,
    error: userDetailsError,
  } = useQuery({
    queryKey: ["adminUserDetails", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      return await getUserById(selectedUser.id);
    },
    enabled: viewDialogOpen && Boolean(selectedUser?.id),
    retry: 1,
  });

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      try {
        const params: any = {
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== "all") params.status = statusFilter;
        if (typeFilter !== "all") params.userType = typeFilter;
        const data = await getUsers(params);
        return Array.isArray(data) ? data : (data?.users ?? []);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        // Return empty array instead of throwing to prevent UI crash
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setAnchorEl(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error?.message ??
        error.response?.data?.message ??
        "Failed to delete user";
      toast.error(msg);
    },
  });

  // Suspend/Unsuspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "suspend" | "unsuspend";
    }) => {
      return action === "suspend" ? suspendUser(id) : unsuspendUser(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        `User ${variables.action === "suspend" ? "suspended" : "unsuspended"} successfully`,
      );
      setSuspendDialogOpen(false);
      setAnchorEl(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update user status",
      );
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
      setAddUserDialogOpen(false);
      setNewUserData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        userType: "CUSTOMER",
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to create user",
      );
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const openCredentialsDialog = (user: any) => {
    setEditingUserId(user.id);
    setCredentialsFormData({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      newPassword: "",
      confirmPassword: "",
    });
    setCredentialsDialogOpen(true);
    handleMenuClose();
  };

  const handleSuspend = () => {
    if (selectedUser) {
      const isSuspended = !!selectedUser.suspendedAt;
      const action = isSuspended ? "unsuspend" : "suspend";
      suspendUserMutation.mutate({ id: selectedUser.id, action });
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const saveCredentialsMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      newPassword,
    }: {
      id: string;
      data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
      };
      newPassword?: string;
    }) => {
      await updateUser(id, data);
      if (newPassword) {
        await resetUserPassword(id, newPassword);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["adminUserDetails"] });
      toast.success("Login credentials updated successfully");
      setCredentialsDialogOpen(false);
      setEditingUserId(null);
      setCredentialsFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to update credentials",
      );
    },
  });

  const handleCredentialsSave = () => {
    if (!editingUserId) return;

    const { firstName, lastName, email, phone, newPassword, confirmPassword } =
      credentialsFormData;

    if (!email.trim() || !phone.trim()) {
      toast.error("Email and phone are required");
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    saveCredentialsMutation.mutate({
      id: editingUserId,
      data: { firstName, lastName, email: email.trim(), phone: phone.trim() },
      newPassword: newPassword || undefined,
    });
  };

  const users = Array.isArray(usersData) ? usersData : (usersData?.users ?? []);

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "active" || statusLower === "verified")
      return "success";
    if (statusLower === "suspended" || statusLower === "banned") return "error";
    if (statusLower === "pending") return "warning";
    return "default";
  };

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
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddUserDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search users by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant={statusFilter === "all" ? "contained" : "outlined"}
          onClick={() => setStatusFilter("all")}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "active" ? "contained" : "outlined"}
          onClick={() => setStatusFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={statusFilter === "suspended" ? "contained" : "outlined"}
          onClick={() => setStatusFilter("suspended")}
        >
          Suspended
        </Button>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="CUSTOMER">Customer</MenuItem>
            <MenuItem value="DRIVER">Driver</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error
            ? error.message
            : String(error) || "Failed to load users. Please try again."}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Verified</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: any) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Person />
                        <Typography
                          sx={{ cursor: "pointer", fontWeight: 600 }}
                          onClick={() => {
                            setSelectedUser(user);
                            setViewDialogOpen(true);
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "N/A"}</TableCell>
                    <TableCell>
                      <Chip label={user.userType || "CUSTOMER"} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          user.suspendedAt
                            ? "SUSPENDED"
                            : (user.status ??
                              (user.identityVerified ? "VERIFIED" : "ACTIVE"))
                        }
                        color={
                          getStatusColor(
                            user.suspendedAt
                              ? "SUSPENDED"
                              : (user.status ??
                                  (user.identityVerified
                                    ? "VERIFIED"
                                    : "ACTIVE")),
                          ) as any
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {(user.isVerified ?? user.identityVerified) ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Chip
                          label="Not Verified"
                          size="small"
                          color="warning"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, user)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedUser) openCredentialsDialog(selectedUser);
          }}
        >
          <LockIcon sx={{ mr: 1 }} fontSize="small" />
          Login credentials
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSuspendDialogOpen(true);
          }}
        >
          <Block sx={{ mr: 1 }} fontSize="small" />
          {selectedUser?.suspendedAt ? "Unsuspend" : "Suspend"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* User Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {isLoadingUserDetails ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : userDetailsError ? (
            <Alert severity="error">
              {userDetailsError instanceof Error
                ? userDetailsError.message
                : "Failed to load user details"}
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selectedUserDetails?.firstName} {selectedUserDetails?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedUserDetails?.email} •{" "}
                {selectedUserDetails?.phone || "N/A"}
              </Typography>
              <Chip
                size="small"
                label={selectedUserDetails?.userType || "CUSTOMER"}
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Login credentials
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => {
                    if (selectedUserDetails) {
                      openCredentialsDialog(selectedUserDetails);
                    }
                  }}
                >
                  Edit
                </Button>
              </Box>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Email (web login / recovery)
                  </Typography>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedUserDetails?.email || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone (mobile app login)
                  </Typography>
                  <Typography sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedUserDetails?.phone || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Password
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    •••••••• (hashed — set a new password to change)
                  </Typography>
                </CardContent>
              </Card>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Verification
              </Typography>
              {selectedUserDetails?.verification ? (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status:{" "}
                    <strong>{selectedUserDetails.verification.status}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Document:{" "}
                    <strong>
                      {selectedUserDetails.verification.documentType}
                    </strong>
                  </Typography>
                  {selectedUserDetails.verification.rejectionReason && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      {selectedUserDetails.verification.rejectionReason}
                    </Alert>
                  )}

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[
                      {
                        label: "Front",
                        url: selectedUserDetails.verification.frontImageUrl,
                      },
                      {
                        label: "Back",
                        url: selectedUserDetails.verification.backImageUrl,
                      },
                      {
                        label: "Selfie",
                        url: selectedUserDetails.verification.selfieImageUrl,
                      },
                    ]
                      .filter((x) => Boolean(x.url))
                      .map((doc) => (
                        <Grid item xs={12} sm={6} md={4} key={doc.label}>
                          <Box
                            component="img"
                            src={doc.url}
                            alt={doc.label}
                            sx={{
                              width: "100%",
                              height: 220,
                              objectFit: "cover",
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            onClick={() => window.open(doc.url, "_blank")}
                          >
                            Open {doc.label}
                          </Button>
                        </Grid>
                      ))}
                  </Grid>
                </Box>
              ) : (
                <Alert severity="info">No verification record found.</Alert>
              )}

              {selectedUserDetails?.userType === "DRIVER" && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Vehicle (Driver)
                  </Typography>
                  {selectedUserDetails?.driver ? (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Registration:{" "}
                        <strong>
                          {selectedUserDetails.driver.licensePlate || "—"}
                        </strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Description:{" "}
                        <strong>
                          {selectedUserDetails.driver.carDescription || "—"}
                        </strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active:{" "}
                        <strong>
                          {selectedUserDetails.driver.active ? "Yes" : "No"}
                        </strong>
                      </Typography>
                      {selectedUserDetails.driver.carPhotoUrl ? (
                        <Box sx={{ mt: 2 }}>
                          <Box
                            component="img"
                            src={selectedUserDetails.driver.carPhotoUrl}
                            alt="Car"
                            sx={{
                              width: "100%",
                              maxWidth: 480,
                              height: 260,
                              objectFit: "cover",
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            onClick={() =>
                              window.open(
                                selectedUserDetails.driver.carPhotoUrl,
                                "_blank",
                              )
                            }
                          >
                            Open car photo
                          </Button>
                        </Box>
                      ) : (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          No car photo uploaded.
                        </Alert>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No driver vehicle profile on record yet.
                    </Alert>
                  )}
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Recent Packages
              </Typography>
              {Array.isArray(selectedUserDetails?.customerPackages) &&
              selectedUserDetails.customerPackages.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {selectedUserDetails.customerPackages
                    .slice(0, 10)
                    .map((p: any) => (
                      <Card key={p.id} variant="outlined">
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography sx={{ fontWeight: 600 }}>
                            {p.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {p.pickupAddress} → {p.deliveryAddress}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.status} • P {p.priceOffered}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No packages found.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Login credentials dialog */}
      <Dialog
        open={credentialsDialogOpen}
        onClose={() => {
          setCredentialsDialogOpen(false);
          setEditingUserId(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Login credentials</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            Passwords are stored securely and cannot be viewed. Leave password
            fields blank to keep the current password.
          </Alert>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="First name"
              value={credentialsFormData.firstName}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="Last name"
              value={credentialsFormData.lastName}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              helperText="Used for web admin login and account recovery"
              value={credentialsFormData.email}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              required
            />
            <TextField
              fullWidth
              label="Phone"
              helperText="Used for mobile app login (e.g. +26771234567)"
              value={credentialsFormData.phone}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              required
            />
            <Divider />
            <TextField
              fullWidth
              label="New password"
              type={showNewPassword ? "text" : "password"}
              value={credentialsFormData.newPassword}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword((v) => !v)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm new password"
              type={showNewPassword ? "text" : "password"}
              value={credentialsFormData.confirmPassword}
              onChange={(e) =>
                setCredentialsFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCredentialsDialogOpen(false);
              setEditingUserId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCredentialsSave}
            disabled={saveCredentialsMutation.isPending}
          >
            {saveCredentialsMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              "Save credentials"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedUser?.firstName}{" "}
            {selectedUser?.lastName}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog
        open={addUserDialogOpen}
        onClose={() => setAddUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUserData.email}
              onChange={(e) =>
                setNewUserData({ ...newUserData, email: e.target.value })
              }
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newUserData.password}
              onChange={(e) =>
                setNewUserData({ ...newUserData, password: e.target.value })
              }
              required
            />
            <TextField
              fullWidth
              label="First Name"
              value={newUserData.firstName}
              onChange={(e) =>
                setNewUserData({ ...newUserData, firstName: e.target.value })
              }
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              value={newUserData.lastName}
              onChange={(e) =>
                setNewUserData({ ...newUserData, lastName: e.target.value })
              }
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={newUserData.phone}
              onChange={(e) =>
                setNewUserData({ ...newUserData, phone: e.target.value })
              }
              required
            />
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select
                value={newUserData.userType}
                label="User Type"
                onChange={(e) =>
                  setNewUserData({
                    ...newUserData,
                    userType: e.target.value as "CUSTOMER" | "DRIVER",
                  })
                }
              >
                <MenuItem value="CUSTOMER">Customer</MenuItem>
                <MenuItem value="DRIVER">Driver</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (
                !newUserData.email ||
                !newUserData.password ||
                !newUserData.firstName ||
                !newUserData.lastName ||
                !newUserData.phone
              ) {
                toast.error("Please fill in all required fields");
                return;
              }
              createUserMutation.mutate(newUserData);
            }}
            variant="contained"
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Create User"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
      >
        <DialogTitle>
          {selectedUser?.suspendedAt ? "Unsuspend" : "Suspend"} User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to{" "}
            {selectedUser?.status === "SUSPENDED" ? "unsuspend" : "suspend"}{" "}
            {selectedUser?.firstName} {selectedUser?.lastName}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSuspend}
            color="warning"
            variant="contained"
            disabled={suspendUserMutation.isPending}
          >
            {suspendUserMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
