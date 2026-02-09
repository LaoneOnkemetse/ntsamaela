import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

export default function Home() {
  useAuth();
  const router = useRouter();

  // Always send visitors to login first; login page will redirect to dashboard if already authenticated
  useEffect(() => {
    if (typeof window === "undefined") return;
    router.replace("/login");
  }, [router]);

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


