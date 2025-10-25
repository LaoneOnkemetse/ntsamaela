import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F172A', // Slate-900 - Professional dark
      light: '#334155',
      dark: '#020617',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0EA5E9', // Sky-500 - Professional blue
      light: '#38BDF8',
      dark: '#0284C7',
      contrastText: '#ffffff',
    },
    success: {
      main: '#22C55E', // Green-500
      light: '#4ADE80',
      dark: '#16A34A',
    },
    warning: {
      main: '#F59E0B', // Amber-500
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Red-500
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6', // Blue-500
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#F8FAFC', // Slate-50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A', // Slate-900
      secondary: '#64748B', // Slate-500
    },
    divider: '#E2E8F0', // Slate-200
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      color: '#0F172A',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
      color: '#0F172A',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#0F172A',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#0F172A',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.6,
      color: '#0F172A',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.6,
      color: '#0F172A',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
      color: '#334155',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#64748B',
    },
    button: {
      fontWeight: 600,
      fontSize: '0.9375rem',
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 2px 4px rgba(0, 0, 0, 0.06)',
    '0 4px 8px rgba(0, 0, 0, 0.08)',
    '0 8px 16px rgba(0, 0, 0, 0.1)',
    '0 12px 24px rgba(0, 0, 0, 0.12)',
    '0 16px 32px rgba(0, 0, 0, 0.14)',
    '0 20px 40px rgba(0, 0, 0, 0.16)',
    '0 24px 48px rgba(0, 0, 0, 0.18)',
    '0 28px 56px rgba(0, 0, 0, 0.2)',
    '0 32px 64px rgba(0, 0, 0, 0.22)',
    '0 36px 72px rgba(0, 0, 0, 0.24)',
    '0 40px 80px rgba(0, 0, 0, 0.26)',
    '0 44px 88px rgba(0, 0, 0, 0.28)',
    '0 48px 96px rgba(0, 0, 0, 0.3)',
    '0 52px 104px rgba(0, 0, 0, 0.32)',
    '0 56px 112px rgba(0, 0, 0, 0.34)',
    '0 60px 120px rgba(0, 0, 0, 0.36)',
    '0 64px 128px rgba(0, 0, 0, 0.38)',
    '0 68px 136px rgba(0, 0, 0, 0.4)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          padding: '10px 20px',
          fontSize: '0.9375rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        containedPrimary: {
          background: '#0F172A',
          color: '#FFFFFF',
          '&:hover': {
            background: '#1E293B',
          },
        },
        containedSecondary: {
          background: '#0EA5E9',
          color: '#FFFFFF',
          '&:hover': {
            background: '#0284C7',
          },
        },
        outlined: {
          borderWidth: '2px',
          borderColor: '#E2E8F0',
          color: '#0F172A',
          '&:hover': {
            borderWidth: '2px',
            borderColor: '#0EA5E9',
            background: '#F0F9FF',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #F1F5F9',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
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
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          color: '#0F172A',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#E2E8F0',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#0EA5E9',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0EA5E9',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#64748B',
            fontWeight: 500,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: '#F8FAFC',
          color: '#0F172A',
          fontWeight: 700,
          fontSize: '0.875rem',
          borderBottom: '2px solid #E2E8F0',
        },
        root: {
          borderBottom: '1px solid #F1F5F9',
          padding: '16px',
        },
      },
    },
  },
});
