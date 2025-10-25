import { Box, Typography, Grid, Card, CardContent, CardHeader } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.firstName}!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Total Users" />
            <CardContent>
              <Typography variant="h4">1,234</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Active Packages" />
            <CardContent>
              <Typography variant="h4">567</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Pending Verifications" />
            <CardContent>
              <Typography variant="h4">89</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Revenue" />
            <CardContent>
              <Typography variant="h4">$12,345</Typography>
            </CardContent>
          </Card>
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



