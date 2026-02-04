import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasToken = localStorage.getItem("token");
    if (!hasToken) {
      router.replace("/login");
      return;
    }

    // Verify token before sending to dashboard; invalid token -> clear and login
    let cancelled = false;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${hasToken}` },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
        } else if (res.ok) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    const t = setTimeout(() => {
      if (!cancelled) router.replace("/login");
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
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


