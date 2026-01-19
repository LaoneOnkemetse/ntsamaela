import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    if (!loading) {
      // Check for token instead of user (user might not be loaded yet)
      const hasToken = localStorage.getItem('token');
      if (hasToken) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [loading, router]);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      flexDirection="column"
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Loading Ntsamaela Admin...
      </Typography>
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};


