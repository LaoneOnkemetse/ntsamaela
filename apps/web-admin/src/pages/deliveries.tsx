import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { LocalShipping, Visibility, Edit } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Deliveries() {
  const { user } = useAuth();

  // Mock data for demonstration
  const deliveries = [
    { id: 1, packageId: 'PKG001', customer: 'John Customer', driver: 'Jane Driver', status: 'In Transit', date: '2024-01-15' },
    { id: 2, packageId: 'PKG002', customer: 'Bob Customer', driver: 'Mike Driver', status: 'Delivered', date: '2024-01-14' },
    { id: 3, packageId: 'PKG003', customer: 'Alice Customer', driver: 'Sarah Driver', status: 'Pending', date: '2024-01-16' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'warning';
      case 'Pending': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Delivery Management
        </Typography>
        <Button variant="contained" startIcon={<LocalShipping />}>
          Track New Delivery
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Package ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell>{delivery.packageId}</TableCell>
                <TableCell>{delivery.customer}</TableCell>
                <TableCell>{delivery.driver}</TableCell>
                <TableCell>
                  <Chip 
                    label={delivery.status} 
                    color={getStatusColor(delivery.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{delivery.date}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Visibility />} sx={{ mr: 1 }}>
                    View
                  </Button>
                  <Button size="small" startIcon={<Edit />}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
