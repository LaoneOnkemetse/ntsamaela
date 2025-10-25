import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366F1', // Indigo
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#EC4899', // Pink
      light: '#F472B6',
      dark: '#DB2777',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Red
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6', // Blue
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#F9FAFB', // Gray-50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827', // Gray-900
      secondary: '#6B7280', // Gray-500
    },
    divider: '#E5E7EB', // Gray-200
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 2px 4px rgba(99, 102, 241, 0.1)',
    '0px 4px 8px rgba(99, 102, 241, 0.15)',
    '0px 8px 16px rgba(99, 102, 241, 0.2)',
    '0px 12px 24px rgba(99, 102, 241, 0.25)',
    '0px 16px 32px rgba(99, 102, 241, 0.3)',
    '0px 20px 40px rgba(99, 102, 241, 0.35)',
    '0px 24px 48px rgba(99, 102, 241, 0.4)',
    '0px 28px 56px rgba(99, 102, 241, 0.45)',
    '0px 32px 64px rgba(99, 102, 241, 0.5)',
    '0px 36px 72px rgba(99, 102, 241, 0.55)',
    '0px 40px 80px rgba(99, 102, 241, 0.6)',
    '0px 44px 88px rgba(99, 102, 241, 0.65)',
    '0px 48px 96px rgba(99, 102, 241, 0.7)',
    '0px 52px 104px rgba(99, 102, 241, 0.75)',
    '0px 56px 112px rgba(99, 102, 241, 0.8)',
    '0px 60px 120px rgba(99, 102, 241, 0.85)',
    '0px 64px 128px rgba(99, 102, 241, 0.9)',
    '0px 68px 136px rgba(99, 102, 241, 0.95)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.2)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid #F3F4F6',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0px 8px 30px rgba(99, 102, 241, 0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          boxShadow: '0px 4px 20px rgba(99, 102, 241, 0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          borderRight: '1px solid #F3F4F6',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&:hover fieldset': {
              borderColor: '#6366F1',
            },
          },
        },
      },
    },
  },
});
