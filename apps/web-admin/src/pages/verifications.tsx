import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { VerifiedUser, CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Verifications() {
  const { user } = useAuth();

  // Mock data for demonstration
  const verifications = [
    { id: 1, userId: 'user001', name: 'John Customer', documentType: 'National ID', status: 'Pending', submittedDate: '2024-01-15' },
    { id: 2, userId: 'user002', name: 'Jane Driver', documentType: 'Driver License', status: 'Approved', submittedDate: '2024-01-14' },
    { id: 3, userId: 'user003', name: 'Bob Customer', documentType: 'Passport', status: 'Rejected', submittedDate: '2024-01-13' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle />;
      case 'Rejected': return <Cancel />;
      default: return <VerifiedUser />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Identity Verification
        </Typography>
        <Button variant="contained" startIcon={<VerifiedUser />}>
          Review Pending
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Verifications" />
            <CardContent>
              <Typography variant="h4">3</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Pending Review" />
            <CardContent>
              <Typography variant="h4">1</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Approved" />
            <CardContent>
              <Typography variant="h4">1</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Rejected" />
            <CardContent>
              <Typography variant="h4">1</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {verifications.map((verification) => (
              <TableRow key={verification.id}>
                <TableCell>{verification.userId}</TableCell>
                <TableCell>{verification.name}</TableCell>
                <TableCell>{verification.documentType}</TableCell>
                <TableCell>
                  <Chip 
                    icon={getStatusIcon(verification.status)}
                    label={verification.status} 
                    color={getStatusColor(verification.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{verification.submittedDate}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Visibility />}>
                    Review
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
