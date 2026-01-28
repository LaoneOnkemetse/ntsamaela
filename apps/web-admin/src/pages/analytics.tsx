/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  People,
  LocalShipping,
  AttachMoney,
  Download,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalytics,
  getRealTimeMetrics,
  exportAnalytics,
} from "../services/api";
import toast from "react-hot-toast";

export default function Analytics() {
  const [period, setPeriod] = useState("last7days");

  // Fetch analytics
  const {
    data: analyticsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      try {
        const params: any = { period };
        const data = await getAnalytics(params);
        return data;
      } catch (err: any) {
        console.error("Error fetching analytics:", err);
        return {};
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch real-time metrics
  const { data: realtimeData } = useQuery({
    queryKey: ["realtimeMetrics"],
    queryFn: async () => {
      try {
        const data = await getRealTimeMetrics();
        return data;
      } catch (error) {
        return null;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleExport = async () => {
    try {
      toast.loading("Exporting analytics...");
      await exportAnalytics({ period });
      toast.dismiss();
      toast.success("Analytics exported successfully!");
    } catch (error: any) {
      toast.dismiss();
      toast.error(
        error.response?.data?.message || "Failed to export analytics",
      );
    }
  };

  const stats = analyticsData || {};
  const realtime = realtimeData || {};

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
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="last7days">Last 7 Days</MenuItem>
              <MenuItem value="last30days">Last 30 Days</MenuItem>
              <MenuItem value="last3months">Last 3 Months</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error
            ? error.message
            : String(error) || "Failed to load analytics. Please try again."}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Total Revenue
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        P {stats.totalRevenue?.toLocaleString() || "0"}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 1 }}
                      >
                        <TrendingUp
                          color="success"
                          sx={{ fontSize: 16, mr: 0.5 }}
                        />
                        <Typography variant="caption" color="success.main">
                          {stats.revenueGrowth || 0}%
                        </Typography>
                      </Box>
                    </Box>
                    <AttachMoney
                      sx={{ fontSize: 40, color: "#75AADB", opacity: 0.3 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Active Users
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.activeUsers?.toLocaleString() || "0"}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 1 }}
                      >
                        <People
                          color="primary"
                          sx={{ fontSize: 16, mr: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {realtime.activeUsers || 0} online
                        </Typography>
                      </Box>
                    </Box>
                    <People
                      sx={{ fontSize: 40, color: "#00C853", opacity: 0.3 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Packages Delivered
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.packagesDelivered?.toLocaleString() || "0"}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 1 }}
                      >
                        <LocalShipping
                          color="primary"
                          sx={{ fontSize: 16, mr: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {stats.averageDeliveryTime || 0} min avg
                        </Typography>
                      </Box>
                    </Box>
                    <LocalShipping
                      sx={{ fontSize: 40, color: "#FFB800", opacity: 0.3 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Success Rate
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats.successRate?.toFixed(1) || "0"}%
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 1 }}
                      >
                        {stats.successRate >= 90 ? (
                          <TrendingUp
                            color="success"
                            sx={{ fontSize: 16, mr: 0.5 }}
                          />
                        ) : (
                          <TrendingDown
                            color="error"
                            sx={{ fontSize: 16, mr: 0.5 }}
                          />
                        )}
                        <Typography
                          variant="caption"
                          color={
                            stats.successRate >= 90
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {stats.successRateChange || 0}%
                        </Typography>
                      </Box>
                    </Box>
                    <TrendingUp
                      sx={{ fontSize: 40, color: "#FF6D00", opacity: 0.3 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Additional Analytics Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Real-Time Metrics
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">Active Packages</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {realtime.activePackages || 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">Online Drivers</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {realtime.onlineDrivers || 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        Pending Verifications
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {realtime.pendingVerifications || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Performance Summary
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        Total Transactions
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {stats.totalTransactions || 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        Average Order Value
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        P {stats.averageOrderValue?.toFixed(2) || "0.00"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">
                        Customer Satisfaction
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {stats.customerSatisfaction?.toFixed(1) || "0"}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
