import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { AccountBalance, Add, Visibility } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Wallets() {
  const { user } = useAuth();

  // Mock data for demonstration
  const wallets = [
    { id: 1, userId: 'user001', owner: 'John Customer', balance: '$1,250.00', status: 'Active', lastTransaction: '2024-01-15' },
    { id: 2, userId: 'user002', owner: 'Jane Driver', balance: '$2,180.50', status: 'Active', lastTransaction: '2024-01-14' },
    { id: 3, userId: 'user003', owner: 'Bob Customer', balance: '$0.00', status: 'Inactive', lastTransaction: '2024-01-10' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Wallet Management
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          Create Wallet
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Wallets" />
            <CardContent>
              <Typography variant="h4">3</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Active Wallets" />
            <CardContent>
              <Typography variant="h4">2</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Balance" />
            <CardContent>
              <Typography variant="h4">$3,430.50</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Pending Transactions" />
            <CardContent>
              <Typography variant="h4">5</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Transaction</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow key={wallet.id}>
                <TableCell>{wallet.userId}</TableCell>
                <TableCell>{wallet.owner}</TableCell>
                <TableCell>
                  <Typography variant="h6" color="primary">
                    {wallet.balance}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={wallet.status} 
                    color={wallet.status === 'Active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{wallet.lastTransaction}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Visibility />}>
                    View Details
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
