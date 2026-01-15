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
import { authService } from '../services/authService';
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

  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setEmailError('');
    setPasswordError('');
    
    try {
      const response = await authService.login({ email: data.email, password: data.password });
      
      if (response.success && response.data) {
        // Update auth context with the successful login
        const success = await login({ email: data.email, password: data.password });
        if (success) {
          toast.success('Welcome back!');
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } else {
          // This shouldn't happen if authService.login succeeded, but handle it
          toast.error('Login succeeded but failed to update session.');
        }
      } else {
        // Handle specific error cases
        const errorCode = response.error?.code;
        const errorMessage = response.error?.message || 'Login failed';
        
        if (errorCode === 'INVALID_CREDENTIALS' || errorMessage.toLowerCase().includes('invalid')) {
          // Try to determine which field is wrong
          // Check if email format is valid
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.email)) {
            setEmailError('Invalid email format');
          } else {
            // Email format is valid, so password is likely wrong
            setPasswordError('Incorrect password');
          }
        } else if (errorCode === 'NETWORK_ERROR' || errorMessage.toLowerCase().includes('network')) {
          toast.error('Network error: Unable to connect to server. Please check your connection.');
        } else if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('user not found')) {
          setEmailError('Email not found');
        } else if (errorMessage.toLowerCase().includes('password')) {
          setPasswordError('Incorrect password');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        toast.error('Network error: Unable to connect to server. Please check if the API is running.');
      } else {
        toast.error(error.message || 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(14, 165, 233, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.15), transparent 50%)',
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
              background: '#75AADB',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '3.5rem',
              fontWeight: 900,
              color: '#FFFFFF',
              mb: 3,
            }}>
              N
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
                error={!!errors.email || !!emailError}
                helperText={errors.email?.message || emailError}
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
                error={!!errors.password || !!passwordError}
                helperText={errors.password?.message || passwordError}
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
                        color: '#0EA5E9',
                        '&.Mui-checked': {
                          color: '#0EA5E9',
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
                  onClick={() => {
                    toast('Please contact your administrator to reset your password.', {
                      icon: 'ℹ️',
                      duration: 4000,
                    });
                  }}
                  sx={{
                    color: '#0EA5E9',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'rgba(14, 165, 233, 0.08)',
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
                  background: '#0EA5E9',
                  color: '#FFFFFF',
                  '&:hover': {
                    background: '#0284C7',
                    boxShadow: '0px 8px 20px rgba(14, 165, 233, 0.4)',
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


