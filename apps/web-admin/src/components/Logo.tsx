import React from 'react';
import { Box } from '@mui/material';

interface LogoProps {
  size?: number;
  variant?: 'default' | 'sidebar' | 'login';
}

const Logo: React.FC<LogoProps> = ({ size = 40, variant = 'default' }) => {
  const getGradient = () => {
    switch (variant) {
      case 'sidebar':
        return 'linear-gradient(135deg, #75AADB 0%, #5A8FBF 100%)';
      case 'login':
        return 'linear-gradient(135deg, #75AADB 0%, #FFB800 100%)';
      default:
        return '#75AADB';
    }
  };

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: variant === 'login' ? '16px' : '12px',
        background: getGradient(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: size * 0.6,
        color: '#FFFFFF',
        boxShadow: variant === 'login' 
          ? '0 10px 25px rgba(117, 170, 219, 0.3)' 
          : '0 4px 12px rgba(117, 170, 219, 0.2)',
        letterSpacing: '-0.02em',
        fontFamily: '"Inter", sans-serif',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: variant === 'login' ? 'scale(1.05)' : 'none',
          boxShadow: variant === 'login'
            ? '0 15px 35px rgba(117, 170, 219, 0.4)'
            : '0 4px 12px rgba(117, 170, 219, 0.2)',
        },
      }}
    >
      N
    </Box>
  );
};

export default Logo;
