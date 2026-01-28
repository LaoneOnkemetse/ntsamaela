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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  AccountBalance,
  Add,
  Visibility,
  Search,
  TrendingUp,
  TrendingDown,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getTransactionAnalytics } from "../services/api";
import toast from "react-hot-toast";

export default function Wallets() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createWalletDialogOpen, setCreateWalletDialogOpen] = useState(false);
  const [newWalletData, setNewWalletData] = useState({
    userId: "",
    initialBalance: 0,
  });

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transactions", searchQuery],
    queryFn: async () => {
      try {
        const params: any = {
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchQuery) params.search = searchQuery;
        const data = await getTransactions(params);
        return Array.isArray(data)
          ? data
          : data?.transactions || data?.data || [];
      } catch (err: any) {
        console.error("Error fetching transactions:", err);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ["transactionAnalytics"],
    queryFn: async () => {
      try {
        const data = await getTransactionAnalytics();
        return data;
      } catch (error) {
        return null;
      }
    },
  });

  const transactions = transactionsData || [];

  // Calculate stats
  const stats = {
    total: transactions.length,
    active: transactions.filter(
      (t: any) => t.status === "COMPLETED" || t.status === "PENDING",
    ).length,
    totalBalance:
      analyticsData?.totalBalance ||
      transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
    pending: transactions.filter((t: any) => t.status === "PENDING").length,
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "completed" || statusLower === "success")
      return "success";
    if (statusLower === "pending") return "warning";
    if (statusLower === "failed" || statusLower === "cancelled") return "error";
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
          Wallet Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateWalletDialogOpen(true)}
        >
          Create Wallet
        </Button>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Transactions" />
            <CardContent>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Active Transactions" />
            <CardContent>
              <Typography variant="h4" color="success.main">
                {stats.active}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Balance" />
            <CardContent>
              <Typography variant="h4" color="primary">
                P {stats.totalBalance.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Pending Transactions" />
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search transactions by user, transaction ID, or amount..."
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
      </Box>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error
            ? error.message
            : String(error) || "Failed to load transactions. Please try again."}
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
                <TableCell sx={{ fontWeight: 700 }}>Transaction ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction: any) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: "#75AADB" }}>
                      {transaction.id || transaction.transactionId}
                    </TableCell>
                    <TableCell>
                      {transaction.user?.firstName
                        ? `${transaction.user.firstName} ${transaction.user.lastName}`
                        : transaction.userName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type || "TRANSACTION"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        {transaction.type === "DEBIT" ||
                        transaction.amount < 0 ? (
                          <TrendingDown color="error" />
                        ) : (
                          <TrendingUp color="success" />
                        )}
                        <Typography
                          variant="h6"
                          color={
                            transaction.amount < 0
                              ? "error.main"
                              : "success.main"
                          }
                        >
                          P {Math.abs(transaction.amount || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status || "PENDING"}
                        color={getStatusColor(transaction.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {transaction.createdAt
                        ? new Date(transaction.createdAt).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Visibility />}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Wallet Dialog */}
      <Dialog
        open={createWalletDialogOpen}
        onClose={() => setCreateWalletDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Wallet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="User ID"
              value={newWalletData.userId}
              onChange={(e) =>
                setNewWalletData({ ...newWalletData, userId: e.target.value })
              }
              placeholder="Enter user ID"
              required
            />
            <TextField
              fullWidth
              label="Initial Balance"
              type="number"
              value={newWalletData.initialBalance}
              onChange={(e) =>
                setNewWalletData({
                  ...newWalletData,
                  initialBalance: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              required
            />
            <Alert severity="info">
              This will create a new wallet for the specified user with the
              initial balance.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateWalletDialogOpen(false);
              setNewWalletData({ userId: "", initialBalance: 0 });
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!newWalletData.userId.trim()) {
                toast.error("Please enter a user ID");
                return;
              }
              toast.success(
                "Wallet creation functionality will be implemented with API endpoint",
              );
              setCreateWalletDialogOpen(false);
              setNewWalletData({ userId: "", initialBalance: 0 });
            }}
          >
            Create Wallet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
