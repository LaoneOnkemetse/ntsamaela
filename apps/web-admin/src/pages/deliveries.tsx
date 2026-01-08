import { useState } from 'react';
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
} from '@mui/material';
import { 
  LocalShipping, 
  Visibility, 
  Edit,
  Search,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getPackages, updatePackageStatus } from '../services/api';
import toast from 'react-hot-toast';

export default function Deliveries() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch packages
  const { data: packagesData, isLoading, error, refetch } = useQuery({
    queryKey: ['packages', searchQuery, statusFilter],
    queryFn: async () => {
      const params: any = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await getPackages(params);
      return Array.isArray(data) ? data : (data?.packages || data?.data || []);
    },
  });

  const packages = packagesData || [];

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'delivered') return 'success';
    if (statusLower === 'in_transit' || statusLower === 'in-transit') return 'warning';
    if (statusLower === 'pending') return 'default';
    if (statusLower === 'cancelled' || statusLower === 'canceled') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Delivery Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button variant="contained" startIcon={<LocalShipping />}>
            Track New Delivery
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : 'Failed to load deliveries. Please try again.'}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
                    <Typography color="text.secondary">No deliveries found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg: any) => (
                  <TableRow key={pkg.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#75AADB' }}>
                      {pkg.id || pkg.packageId}
                    </TableCell>
                    <TableCell>
                      {pkg.customer?.firstName 
                        ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                        : pkg.customerName || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {pkg.driver?.firstName 
                        ? `${pkg.driver.firstName} ${pkg.driver.lastName}`
                        : pkg.driverName || 'Unassigned'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {pkg.pickupAddress || 'N/A'} → {pkg.deliveryAddress || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      P {pkg.priceOffered || 0}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.status?.replace('_', ' ') || 'PENDING'}
                        color={getStatusColor(pkg.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {pkg.createdAt 
                        ? new Date(pkg.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            // Navigate to package details
                            toast('Package details view coming soon');
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            // Edit package
                            toast('Package edit coming soon');
                          }}
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
    </Box>
  );
}
