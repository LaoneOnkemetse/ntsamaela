import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, Chip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Users() {
  const { user } = useAuth();

  // Mock data for demonstration
  const users = [
    { id: 1, name: 'John Customer', email: 'customer1@example.com', type: 'Customer', status: 'Active' },
    { id: 2, name: 'Jane Driver', email: 'driver1@example.com', type: 'Driver', status: 'Active' },
    { id: 3, name: 'Bob Customer', email: 'customer2@example.com', type: 'Customer', status: 'Inactive' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add User
        </Button>
      </Box>

      <Grid container spacing={3}>
        {users.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <Card>
              <CardHeader
                title={user.name}
                subheader={user.email}
                action={
                  <Chip 
                    label={user.status} 
                    color={user.status === 'Active' ? 'success' : 'default'}
                    size="small"
                  />
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Type: {user.type}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<EditIcon />}>
                    Edit
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />}>
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
