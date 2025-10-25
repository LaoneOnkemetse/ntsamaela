import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Email, ArrowForward } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

type FormData = yup.InferType<typeof schema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await login({ email: data.email, password: data.password });
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 135, 205, 0.3), transparent 50%)',
        },
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '3rem',
              mb: 3,
            }}>
              🚚
            </Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#FFFFFF',
                mb: 1,
                textShadow: '0px 2px 20px rgba(0, 0, 0, 0.2)',
              }}
            >
              Ntsamaela
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 500,
              }}
            >
              Admin Dashboard
            </Typography>
          </Box>

          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to access your admin panel
              </Typography>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                {...register('email')}
                fullWidth
                placeholder="admin@ntsamaela.com"
                margin="normal"
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#F9FAFB',
                  },
                }}
              />

              <TextField
                {...register('password')}
                fullWidth
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: '#F9FAFB',
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{
                        color: '#6366F1',
                        '&.Mui-checked': {
                          color: '#6366F1',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Remember me
                    </Typography>
                  }
                />
                <Button
                  variant="text"
                  size="small"
                  sx={{
                    color: '#6366F1',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'rgba(99, 102, 241, 0.08)',
                    },
                  }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                endIcon={isLoading ? null : <ArrowForward />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0px 8px 20px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    boxShadow: '0px 12px 28px rgba(99, 102, 241, 0.4)',
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </form>
          </Paper>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              © 2025 Ntsamaela. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};


