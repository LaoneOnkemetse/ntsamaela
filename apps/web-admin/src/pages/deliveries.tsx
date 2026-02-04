/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  LocalShipping,
  Visibility,
  Edit,
  Search,
  Refresh,
  Close,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPackages,
  getPackageById,
  updatePackageStatus,
} from "../services/api";
import toast from "react-hot-toast";

export default function Deliveries() {
  const { loading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  // Fetch packages
  const {
    data: packagesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["packages", searchQuery, statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== "all") params.status = statusFilter;
        const data = await getPackages(params);
        return Array.isArray(data) ? data : data?.packages || data?.data || [];
      } catch (err: any) {
        console.error("Error fetching packages:", err);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const packages = Array.isArray(packagesData) ? packagesData : [];

  useEffect(() => {
    const status = (error as any)?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, [error]);

  // Fetch selected package details
  const { data: packageDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["packageDetails", selectedPackageId],
    queryFn: async () => {
      if (!selectedPackageId) return null;
      const data = await getPackageById(selectedPackageId);
      return data;
    },
    enabled: !!selectedPackageId && detailsOpen,
  });

  // Update package status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await updatePackageStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package status updated successfully!");
      setEditOpen(false);
      setSelectedPackageId(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message ||
          "Failed to update package status",
      );
    },
  });

  const handleViewDetails = (id: string) => {
    setSelectedPackageId(id);
    setDetailsOpen(true);
  };

  const handleEdit = (pkg: any) => {
    setSelectedPackageId(pkg.id);
    setNewStatus(pkg.status || "PENDING");
    setEditOpen(true);
  };

  const handleStatusUpdate = () => {
    if (!selectedPackageId || !newStatus) {
      toast.error("Please select a status");
      return;
    }
    updateStatusMutation.mutate({ id: selectedPackageId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "delivered") return "success";
    if (statusLower === "in_transit" || statusLower === "in-transit")
      return "warning";
    if (statusLower === "pending") return "default";
    if (statusLower === "cancelled" || statusLower === "canceled")
      return "error";
    return "default";
  };

  const hasToken =
    typeof window !== "undefined" ? !!localStorage.getItem("token") : false;
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
          Delivery Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<LocalShipping />}
            onClick={() => setTrackDialogOpen(true)}
          >
            Track New Delivery
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by package ID, customer, driver, or address..."
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
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
            <MenuItem value="DELIVERED">Delivered</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error
            ? error.message
            : "Failed to load deliveries. Please try again."}
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
                <TableCell sx={{ fontWeight: 700 }}>Package ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Route</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No deliveries found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg: any) => (
                  <TableRow key={pkg.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: "#75AADB" }}>
                      {pkg.id || pkg.packageId}
                    </TableCell>
                    <TableCell>
                      {pkg.customer?.firstName
                        ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                        : pkg.customerName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {pkg.driver?.firstName
                        ? `${pkg.driver.firstName} ${pkg.driver.lastName}`
                        : pkg.driverName || "Unassigned"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.875rem" }}>
                      {pkg.pickupAddress || "N/A"} →{" "}
                      {pkg.deliveryAddress || "N/A"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      P {pkg.priceOffered || 0}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.status?.replace("_", " ") || "PENDING"}
                        color={getStatusColor(pkg.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {pkg.createdAt
                        ? new Date(pkg.createdAt).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleViewDetails(pkg.id || pkg.packageId)
                          }
                          color="primary"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(pkg)}
                          color="secondary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Package Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Package Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : packageDetails ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Package ID
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                  {packageDetails.id || packageDetails.packageId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={
                      packageDetails.status?.replace("_", " ") || "PENDING"
                    }
                    color={getStatusColor(packageDetails.status) as any}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {packageDetails.customer?.firstName &&
                  packageDetails.customer?.lastName
                    ? `${packageDetails.customer.firstName} ${packageDetails.customer.lastName}`
                    : packageDetails.customerName || "Unknown"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Driver
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {packageDetails.driver?.firstName &&
                  packageDetails.driver?.lastName
                    ? `${packageDetails.driver.firstName} ${packageDetails.driver.lastName}`
                    : packageDetails.driverName || "Unassigned"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Pickup Address
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {packageDetails.pickupAddress || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Delivery Address
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {packageDetails.deliveryAddress || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Price Offered
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                  P {packageDetails.priceOffered || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {packageDetails.createdAt
                    ? new Date(packageDetails.createdAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Grid>
              {packageDetails.description && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {packageDetails.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          ) : (
            <Alert severity="error">Failed to load package details</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Package Status Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Package Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Track New Delivery Dialog */}
      <Dialog
        open={trackDialogOpen}
        onClose={() => setTrackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Track New Delivery</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Package ID or Tracking Number"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter package ID or tracking number"
              sx={{ mb: 2 }}
            />
            <Alert severity="info">
              Enter a package ID or tracking number to view delivery details and
              status.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTrackDialogOpen(false);
              setTrackingId("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!trackingId.trim()) {
                toast.error("Please enter a package ID or tracking number");
                return;
              }
              // Try to find the package
              setSelectedPackageId(trackingId.trim());
              setDetailsOpen(true);
              setTrackDialogOpen(false);
              setTrackingId("");
            }}
          >
            Track
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
