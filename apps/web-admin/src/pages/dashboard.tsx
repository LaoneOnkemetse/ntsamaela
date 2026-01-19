import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress, 
  Avatar,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tab,
  Tabs,
  Badge,
  CircularProgress,
  Alert,
} from '@mui/material';
import { 
  People, 
  LocalShipping, 
  VerifiedUser, 
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Refresh,
  Download,
  Visibility,
  CheckCircle,
  Cancel,
  Pending,
  ArrowForward,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getPackages, getVerifications } from '../services/api';
import toast from 'react-hot-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  change?: number;
  progress?: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, change, progress, onClick }) => {
  const isPositive = change && change > 0;
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0px 12px 24px rgba(117, 170, 219, 0.2)',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Chip
                size="small"
                icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                label={`${isPositive ? '+' : ''}${change}%`}
                sx={{
                  background: isPositive ? 'rgba(0, 200, 83, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                  color: isPositive ? '#00C853' : '#D32F2F',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: isPositive ? '#00C853' : '#D32F2F',
                  },
                }}
              />
            )}
          </Box>
          <Avatar sx={{ 
            width: 56, 
            height: 56,
            background: gradient,
            boxShadow: '0px 8px 20px rgba(117, 170, 219, 0.25)',
          }}>
            {icon}
          </Avatar>
        </Box>
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(117, 170, 219, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: gradient,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Protect route - redirect to login if not authenticated
  // But be lenient - if token exists, trust it even if user isn't loaded yet
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    // Wait for auth to finish loading
    if (loading) return;
    
    // Check for token
    const hasToken = localStorage.getItem('token');
    
    // Only redirect if there's NO token at all
    // If token exists, trust it (even if user isn't loaded yet)
    // API calls will verify the token and handle 401s
    // Add a small delay to prevent race conditions with login redirect
    if (!hasToken) {
      const timer = setTimeout(() => {
        // Double-check token still doesn't exist (might have been set during delay)
        if (!localStorage.getItem('token')) {
          router.push('/login');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, router]);

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      try {
        const data = await getDashboardStats();
        return data;
      } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent packages
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['recentPackages', tabValue],
    queryFn: async () => {
      try {
        const statusFilter = tabValue === 1 ? 'IN_TRANSIT' : tabValue === 2 ? 'DELIVERED' : undefined;
        const params: any = { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' };
        if (statusFilter) params.status = statusFilter;
        const data = await getPackages(params);
        return Array.isArray(data) ? data : (data?.packages || data?.data || []);
      } catch (error: any) {
        console.error('Error fetching packages:', error);
        return [];
      }
    },
  });

  // Fetch pending verifications
  const { data: verificationsData, isLoading: verificationsLoading } = useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: async () => {
      try {
        const data = await getVerifications({ status: 'PENDING', limit: 3 });
        return Array.isArray(data) ? data : (data?.verifications || data?.data || []);
      } catch (error: any) {
        console.error('Error fetching verifications:', error);
        return [];
      }
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStats()]);
      toast.success('Dashboard data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      const loadingToast = toast.loading('Exporting dashboard data...');
      try {
        const { exportAnalytics } = await import('../services/api');
        const blob = await exportAnalytics({ format: 'csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.dismiss(loadingToast);
        toast.success('Export completed!');
      } catch (error: any) {
        toast.dismiss(loadingToast);
        // Fallback: create a simple CSV from current data
        const csvContent = [
          ['Metric', 'Value'],
          ['Total Users', dashboardData?.totalUsers || 0],
          ['Active Packages', dashboardData?.activePackages || 0],
          ['Pending Verifications', dashboardData?.pendingVerifications || 0],
          ['Total Revenue', dashboardData?.totalRevenue || 0],
        ].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export completed!');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleStatClick = (section: string) => {
    const routes = {
      users: '/users',
      packages: '/deliveries',
      verifications: '/verifications',
      revenue: '/wallets',
    };
    router.push(routes[section as keyof typeof routes] || '/dashboard');
  };

  const handleQuickAction = (action: string) => {
    const routes = {
      verifications: '/verifications',
      approvals: '/deliveries',
      support: '/settings',
      users: '/users',
    };
    router.push(routes[action as keyof typeof routes] || '/dashboard');
  };

  const handleViewDetails = (id: string) => {
    // Navigate to deliveries page where package details can be viewed
    if (id.startsWith('VER-')) {
      router.push('/verifications');
    } else {
      router.push('/deliveries');
    }
  };

  // Format stats from API data - handle null/undefined safely
  const stats = dashboardData && typeof dashboardData === 'object' ? [
    {
      title: 'Total Users',
      value: (dashboardData.totalUsers ?? 0).toLocaleString(),
      icon: <People />,
      gradient: '#75AADB',
      change: Number(dashboardData.userGrowth ?? 0).toFixed(1),
      progress: Number(dashboardData.userGrowth ?? 0),
      onClick: () => handleStatClick('users'),
    },
    {
      title: 'Active Packages',
      value: (dashboardData.activePackages ?? 0).toLocaleString(),
      icon: <LocalShipping />,
      gradient: '#00C853',
      change: Number(dashboardData.packageGrowth ?? 0).toFixed(1),
      progress: Number(dashboardData.packageGrowth ?? 0),
      onClick: () => handleStatClick('packages'),
    },
    {
      title: 'Pending Verifications',
      value: (dashboardData.pendingVerifications ?? 0).toLocaleString(),
      icon: <VerifiedUser />,
      gradient: '#FFB800',
      change: Number(dashboardData.verificationChange ?? 0).toFixed(1),
      progress: Number(dashboardData.verificationProgress ?? 0),
      onClick: () => handleStatClick('verifications'),
    },
    {
      title: 'Revenue',
      value: `P ${(dashboardData.totalRevenue ?? 0).toLocaleString()}`,
      icon: <AttachMoney />,
      gradient: '#FF6D00',
      change: Number(dashboardData.revenueGrowth ?? 0).toFixed(1),
      progress: Number(dashboardData.revenueProgress ?? 0),
      onClick: () => handleStatClick('revenue'),
    },
  ] : [
    {
      title: 'Total Users',
      value: '0',
      icon: <People />,
      gradient: '#75AADB',
      change: 0,
      progress: 0,
      onClick: () => handleStatClick('users'),
    },
    {
      title: 'Active Packages',
      value: '0',
      icon: <LocalShipping />,
      gradient: '#00C853',
      change: 0,
      progress: 0,
      onClick: () => handleStatClick('packages'),
    },
    {
      title: 'Pending Verifications',
      value: '0',
      icon: <VerifiedUser />,
      gradient: '#FFB800',
      change: 0,
      progress: 0,
      onClick: () => handleStatClick('verifications'),
    },
    {
      title: 'Revenue',
      value: 'P 0',
      icon: <AttachMoney />,
      gradient: '#FF6D00',
      change: 0,
      progress: 0,
      onClick: () => handleStatClick('revenue'),
    },
  ];

  interface PackageItem {
    id: string;
    customer: string;
    driver: string;
    route: string;
    amount: number;
    status: string;
  }

  const recentPackages = (packagesData || []).map((pkg: any): PackageItem => ({
    id: pkg.id || pkg.packageId,
    customer: pkg.customer?.firstName ? `${pkg.customer.firstName} ${pkg.customer.lastName}` : pkg.customerName || 'Unknown',
    driver: pkg.driver?.firstName ? `${pkg.driver.firstName} ${pkg.driver.lastName}` : pkg.driverName || 'Unassigned',
    route: `${pkg.pickupAddress || 'N/A'} → ${pkg.deliveryAddress || 'N/A'}`,
    amount: pkg.priceOffered || 0,
    status: pkg.status?.toLowerCase() || 'pending',
  }));

  interface VerificationItem {
    id: string;
    userId: string;
    userName: string;
    documentType: string;
    status: string;
    submittedAt: string;
  }

  const pendingVerifications = (verificationsData || []).map((ver: any): VerificationItem => ({
    id: ver.id || ver.verificationId,
    name: ver.user?.firstName ? `${ver.user.firstName} ${ver.user.lastName}` : ver.userName || 'Unknown',
    type: ver.documentType || 'Unknown',
    date: ver.submittedAt ? new Date(ver.submittedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: ver.status?.toLowerCase() || 'pending',
  }));

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    const colors: Record<string, { bg: string; color: string }> = {
      delivered: { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853' },
      'in-transit': { bg: 'rgba(117, 170, 219, 0.1)', color: '#75AADB' },
      'in_transit': { bg: 'rgba(117, 170, 219, 0.1)', color: '#75AADB' },
      pending: { bg: 'rgba(255, 184, 0, 0.1)', color: '#FFB800' },
      cancelled: { bg: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' },
      canceled: { bg: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' },
    };
    return colors[statusLower] || colors.pending;
  };

  const getStatusIcon = (status: string): React.ReactElement | undefined => {
    const statusLower = status.toLowerCase();
    const icons: Record<string, React.ReactElement> = {
      delivered: <CheckCircle sx={{ fontSize: 18 }} />,
      'in-transit': <LocalShipping sx={{ fontSize: 18 }} />,
      'in_transit': <LocalShipping sx={{ fontSize: 18 }} />,
      pending: <Pending sx={{ fontSize: 18 }} />,
      cancelled: <Cancel sx={{ fontSize: 18 }} />,
      canceled: <Cancel sx={{ fontSize: 18 }} />,
    };
    return icons[statusLower] || icons.pending;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.firstName}! Here's what's happening today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              borderColor: '#75AADB',
              color: '#75AADB',
              '&:hover': {
                borderColor: '#5A8FBF',
                backgroundColor: 'rgba(117, 170, 219, 0.08)',
              },
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{
              background: '#75AADB',
              '&:hover': {
                background: '#5A8FBF',
              },
            }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Stats Grid */}
      {statsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Packages */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3 
              }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Recent Packages
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest package deliveries
                  </Typography>
                </Box>
                <Tabs 
                  value={tabValue} 
                  onChange={(e, newValue) => setTabValue(newValue)}
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 40,
                      textTransform: 'none',
                      fontWeight: 600,
                    },
                  }}
                >
                  <Tab label="All" />
                  <Tab label="Active" />
                  <Tab label="Completed" />
                </Tabs>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Package ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Driver</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Route</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packagesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : recentPackages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No packages found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPackages.map((pkg) => {
                        const statusColor = getStatusColor(pkg.status);
                        return (
                          <TableRow 
                            key={pkg.id}
                            sx={{ 
                              '&:hover': { 
                                backgroundColor: 'rgba(117, 170, 219, 0.04)',
                                cursor: 'pointer',
                              } 
                            }}
                          >
                            <TableCell sx={{ fontWeight: 600, color: '#75AADB' }}>
                              {pkg.id}
                            </TableCell>
                            <TableCell>{pkg.customer}</TableCell>
                            <TableCell>{pkg.driver}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem' }}>{pkg.route}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>P {pkg.amount}</TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(pkg.status)}
                                label={pkg.status.replace('_', ' ')}
                                size="small"
                                sx={{
                                  background: statusColor.bg,
                                  color: statusColor.color,
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  '& .MuiChip-icon': {
                                    color: statusColor.color,
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(pkg.id)}
                                sx={{
                                  color: '#75AADB',
                                  '&:hover': {
                                    backgroundColor: 'rgba(117, 170, 219, 0.1)',
                                  },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => router.push('/deliveries')}
                  sx={{
                    color: '#75AADB',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(117, 170, 219, 0.08)',
                    },
                  }}
                >
                  View All Packages
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & Verifications */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      { 
                        label: 'Review Verifications', 
                        count: dashboardData?.pendingVerifications || verificationsData?.length || 0, 
                        color: '#FFB800', 
                        action: 'verifications' 
                      },
                      { 
                        label: 'Pending Approvals', 
                        count: packagesData?.filter((p: any) => p.status === 'PENDING').length || 0, 
                        color: '#FF6D00', 
                        action: 'approvals' 
                      },
                      { 
                        label: 'Active Packages', 
                        count: dashboardData?.activePackages || packagesData?.filter((p: any) => p.status === 'IN_TRANSIT').length || 0, 
                        color: '#75AADB', 
                        action: 'support' 
                      },
                      { 
                        label: 'New Users', 
                        count: dashboardData?.totalUsers || 0, 
                        color: '#00C853', 
                        action: 'users' 
                      },
                    ].map((item, index) => (
                      <Button
                        key={index}
                        fullWidth
                        onClick={() => handleQuickAction(item.action)}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textTransform: 'none',
                          color: 'text.primary',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: item.color,
                            background: `${item.color}08`,
                            transform: 'translateX(4px)',
                          },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.label}
                        </Typography>
                        <Badge
                          badgeContent={item.count}
                          sx={{
                            '& .MuiBadge-badge': {
                              background: item.color,
                              color: '#FFFFFF',
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Button>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Pending Verifications */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Pending Verifications
                    </Typography>
                    <Chip 
                      label={pendingVerifications.length}
                      size="small"
                      sx={{
                        background: '#FFB800',
                        color: '#FFFFFF',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {verificationsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : pendingVerifications.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        No pending verifications
                      </Typography>
                    ) : (
                      pendingVerifications.map((ver) => (
                        <Paper
                          key={ver.id}
                          elevation={0}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: '#FFB800',
                              backgroundColor: 'rgba(255, 184, 0, 0.04)',
                              cursor: 'pointer',
                            },
                          }}
                          onClick={() => handleViewDetails(ver.id)}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {ver.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ver.date}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {ver.type}
                          </Typography>
                        </Paper>
                      ))
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<ArrowForward />}
                      onClick={() => router.push('/verifications')}
                      sx={{
                        borderColor: '#FFB800',
                        color: '#FFB800',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: '#E6A600',
                          backgroundColor: 'rgba(255, 184, 0, 0.08)',
                        },
                      }}
                    >
                      View All Verifications
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
