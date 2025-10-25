import { useState } from 'react';
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
  const { user } = useAuth();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
      alert('Dashboard data refreshed successfully!');
    }, 1000);
  };

  const handleExport = () => {
    // Trigger download
    alert('Exporting dashboard data to CSV...');
    // In production: generate CSV and trigger download
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

  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      icon: <People />,
      gradient: '#75AADB',
      change: 12.5,
      progress: 75,
      onClick: () => handleStatClick('users'),
    },
    {
      title: 'Active Packages',
      value: '567',
      icon: <LocalShipping />,
      gradient: '#00C853',
      change: 8.2,
      progress: 62,
      onClick: () => handleStatClick('packages'),
    },
    {
      title: 'Pending Verifications',
      value: '89',
      icon: <VerifiedUser />,
      gradient: '#FFB800',
      change: -3.1,
      progress: 45,
      onClick: () => handleStatClick('verifications'),
    },
    {
      title: 'Revenue',
      value: 'P 12,345',
      icon: <AttachMoney />,
      gradient: '#FF6D00',
      change: 15.8,
      progress: 88,
      onClick: () => handleStatClick('revenue'),
    },
  ];

  const allPackages = [
    { id: 'PKG-001', customer: 'Sarah M.', driver: 'John D.', route: 'Gaborone → Francistown', amount: 350, status: 'delivered' },
    { id: 'PKG-002', customer: 'Mike K.', driver: 'Emma S.', route: 'Maun → Kasane', amount: 280, status: 'in-transit' },
    { id: 'PKG-003', customer: 'Lisa P.', driver: 'David L.', route: 'Palapye → Serowe', amount: 150, status: 'pending' },
    { id: 'PKG-004', customer: 'Tom R.', driver: 'Grace M.', route: 'Lobatse → Kanye', amount: 180, status: 'in-transit' },
    { id: 'PKG-005', customer: 'Anna B.', driver: 'Peter K.', route: 'Gaborone → Molepolole', amount: 120, status: 'delivered' },
  ];

  const recentPackages = allPackages.filter(pkg => {
    if (tabValue === 1) return pkg.status === 'in-transit'; // Active
    if (tabValue === 2) return pkg.status === 'delivered'; // Completed
    return true; // All
  });

  const pendingVerifications = [
    { id: 'VER-001', name: 'James Wilson', type: 'Driver License', date: '2025-10-25', status: 'pending' },
    { id: 'VER-002', name: 'Maria Garcia', type: 'National ID', date: '2025-10-24', status: 'pending' },
    { id: 'VER-003', name: 'Robert Chen', type: 'Vehicle Registration', date: '2025-10-23', status: 'pending' },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      delivered: { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853' },
      'in-transit': { bg: 'rgba(117, 170, 219, 0.1)', color: '#75AADB' },
      pending: { bg: 'rgba(255, 184, 0, 0.1)', color: '#FFB800' },
      cancelled: { bg: 'rgba(211, 47, 47, 0.1)', color: '#D32F2F' },
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      delivered: <CheckCircle sx={{ fontSize: 18 }} />,
      'in-transit': <LocalShipping sx={{ fontSize: 18 }} />,
      pending: <Pending sx={{ fontSize: 18 }} />,
      cancelled: <Cancel sx={{ fontSize: 18 }} />,
    };
    return icons[status as keyof typeof icons] || icons.pending;
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

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
                    {recentPackages.map((pkg) => {
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
                              label={pkg.status}
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
                    })}
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
                      { label: 'Review Verifications', count: 12, color: '#FFB800', action: 'verifications' },
                      { label: 'Pending Approvals', count: 8, color: '#FF6D00', action: 'approvals' },
                      { label: 'Support Tickets', count: 5, color: '#75AADB', action: 'support' },
                      { label: 'New Users', count: 24, color: '#00C853', action: 'users' },
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
                    {pendingVerifications.map((ver) => (
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
                    ))}
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
