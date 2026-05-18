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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  VerifiedUser,
  CheckCircle,
  Cancel,
  Visibility,
  Search,
  Refresh,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVerifications,
  approveVerification,
  rejectVerification,
  getUserById,
} from "../services/api";
import toast from "react-hot-toast";

export default function Verifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const reviewUserId =
    selectedVerification?.userId || selectedVerification?.user?.id;

  const { data: reviewUserDetails } = useQuery({
    queryKey: ["verificationReviewUser", reviewUserId],
    queryFn: async () => {
      if (!reviewUserId) return null;
      return await getUserById(reviewUserId);
    },
    enabled: reviewDialogOpen && Boolean(reviewUserId),
    retry: 1,
  });

  // Fetch verifications
  const {
    data: verificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["verifications", searchQuery, statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchQuery) params.search = searchQuery;
        if (statusFilter !== "all") params.status = statusFilter;
        const data = await getVerifications(params);
        return Array.isArray(data)
          ? data
          : data?.verifications || data?.data || [];
      } catch (err: any) {
        console.error("Error fetching verifications:", err);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Approve verification mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Verification approved successfully");
      // If the admin was filtering PENDING, the item will disappear after review.
      // Switch to All so the admin can still see the reviewed record.
      setStatusFilter("all");
      setReviewDialogOpen(false);
      setSelectedVerification(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to approve verification",
      );
    },
  });

  // Reject verification mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectVerification(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      toast.success("Verification rejected successfully");
      setStatusFilter("all");
      setReviewDialogOpen(false);
      setSelectedVerification(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to reject verification",
      );
    },
  });

  const handleReview = (verification: any) => {
    setSelectedVerification(verification);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedVerification) {
      approveMutation.mutate(selectedVerification.id);
    }
  };

  const handleReject = () => {
    if (selectedVerification && rejectionReason.trim()) {
      rejectMutation.mutate({
        id: selectedVerification.id,
        reason: rejectionReason,
      });
    } else {
      toast.error("Please provide a rejection reason");
    }
  };

  const verifications = verificationsData || [];

  // Calculate stats
  const stats = {
    total: verifications.length,
    pending: verifications.filter((v: any) => v.status === "PENDING").length,
    approved: verifications.filter((v: any) => v.status === "APPROVED").length,
    rejected: verifications.filter((v: any) => v.status === "REJECTED").length,
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "approved") return "success";
    if (statusLower === "rejected") return "error";
    if (statusLower === "pending") return "warning";
    return "default";
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "approved") return <CheckCircle />;
    if (statusLower === "rejected") return <Cancel />;
    return <VerifiedUser />;
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
          Identity Verification
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Verifications" />
            <CardContent>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Pending Review" />
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Approved" />
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Rejected" />
            <CardContent>
              <Typography variant="h4" color="error.main">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name, email, or document type..."
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
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error
            ? error.message
            : String(error) ||
              "Failed to load verifications. Please try again."}
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
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Document Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No verifications found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                verifications.map((verification: any) => (
                  <TableRow key={verification.id} hover>
                    <TableCell>
                      {verification.user?.firstName
                        ? `${verification.user.firstName} ${verification.user.lastName}`
                        : verification.userName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {verification.documentType || "Unknown"}
                      {verification.itemType === "unverified_user" && (
                        <Typography
                          component="span"
                          display="block"
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                        >
                          User must submit ID from app (Profile → Verification)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(verification.status)}
                        label={verification.status}
                        color={getStatusColor(verification.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {verification.submittedAt
                        ? new Date(
                            verification.submittedAt,
                          ).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleReview(verification)}
                        disabled={
                          verification.status !== "PENDING" ||
                          verification.itemType === "unverified_user" ||
                          String(verification.id || "").startsWith("user-")
                        }
                      >
                        {verification.itemType === "unverified_user"
                          ? "Awaiting documents"
                          : "Review"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setSelectedVerification(null);
          setRejectionReason("");
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Review Verification -{" "}
          {selectedVerification?.userName ||
            (selectedVerification?.user
              ? `${selectedVerification.user.firstName} ${selectedVerification.user.lastName}`
              : "Unknown")}
        </DialogTitle>
        <DialogContent>
          {selectedVerification && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Document Type:</strong>{" "}
                {selectedVerification.documentType}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Submitted:</strong>{" "}
                {selectedVerification.submittedAt
                  ? new Date(selectedVerification.submittedAt).toLocaleString()
                  : "N/A"}
              </Typography>

              {/* Document previews */}
              {Array.isArray(selectedVerification.documents) &&
              selectedVerification.documents.length > 0 ? (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {selectedVerification.documents.map((doc: any) => (
                    <Grid item xs={12} sm={6} md={4} key={doc.id || doc.url}>
                      <Card variant="outlined" sx={{ height: "100%" }}>
                        <Box
                          component="img"
                          src={doc.url}
                          alt={doc.type || "Document"}
                          sx={{
                            width: "100%",
                            height: 220,
                            objectFit: "cover",
                            backgroundColor: "#0B1220",
                          }}
                        />
                        <CardContent sx={{ py: 1.25 }}>
                          <Typography variant="caption" color="text.secondary">
                            {doc.type || "DOCUMENT"}
                          </Typography>
                          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              Open
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : selectedVerification.itemType === "unverified_user" ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This user has not uploaded documents yet. Ask them to submit
                  verification from the app (Profile → Verification).
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No documents found for this verification.
                </Alert>
              )}

              {reviewUserDetails?.userType === "DRIVER" &&
                reviewUserDetails?.driver && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Driver vehicle
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reviewUserDetails.driver.licensePlate || "—"} •{" "}
                      {reviewUserDetails.driver.carDescription || "—"}
                    </Typography>
                    {reviewUserDetails.driver.carPhotoUrl ? (
                      <Box sx={{ mt: 1 }}>
                        <Box
                          component="img"
                          src={reviewUserDetails.driver.carPhotoUrl}
                          alt="Car"
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
                          onClick={() =>
                            window.open(
                              reviewUserDetails.driver.carPhotoUrl,
                              "_blank",
                            )
                          }
                        >
                          Open car photo
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        No car photo uploaded for this driver.
                      </Alert>
                    )}
                  </Box>
                )}

              {selectedVerification.status === "PENDING" && (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Rejection Reason (if rejecting)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  sx={{ mt: 2 }}
                  placeholder="Enter reason for rejection..."
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setReviewDialogOpen(false);
              setSelectedVerification(null);
              setRejectionReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            color="error"
            variant="outlined"
            disabled={rejectMutation.isPending || !rejectionReason.trim()}
          >
            {rejectMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Reject"
            )}
          </Button>
          <Button
            onClick={handleApprove}
            color="success"
            variant="contained"
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Approve"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
