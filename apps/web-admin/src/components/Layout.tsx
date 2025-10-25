import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  LocalShipping,
  AccountBalance,
  VerifiedUser,
  Settings,
  Logout,
  Notifications,
  Person,
  ChevronLeft,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenu = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    router.push('/login');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', color: '#6366F1' },
    { text: 'Users', icon: <People />, path: '/users', color: '#10B981' },
    { text: 'Deliveries', icon: <LocalShipping />, path: '/deliveries', color: '#F59E0B' },
    { text: 'Wallets', icon: <AccountBalance />, path: '/wallets', color: '#8B5CF6' },
    { text: 'Verifications', icon: <VerifiedUser />, path: '/verifications', color: '#EC4899' },
    { text: 'Settings', icon: <Settings />, path: '/settings', color: '#6B7280' },
  ];

  const drawerWidth = 280;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            🚚
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Ntsamaela
          </Typography>
        </Box>
        {!isMobile && (
          <IconButton onClick={handleMenu} size="small">
            <ChevronLeft />
          </IconButton>
        )}
      </Box>
      
      <List sx={{ px: 2, py: 3, flex: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = router.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  transition: 'all 0.2s ease',
                  background: isActive ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'text.primary',
                  '&:hover': {
                    background: isActive ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'rgba(99, 102, 241, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#FFFFFF' : item.color }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ 
          p: 2, 
          borderRadius: 2, 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#6366F1', mb: 0.5 }}>
            Need Help?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Check our documentation
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  if (!user) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          ...(drawerOpen && !isMobile && { 
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          }),
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar>
          {(isMobile || !drawerOpen) && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleMenu}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Tooltip title="Notifications">
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
              <Avatar sx={{ 
                width: 38, 
                height: 38, 
                background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleUserMenuClose(); handleNavigation('/profile'); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleUserMenuClose(); handleNavigation('/settings'); }} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
          <ListItemIcon>
            <Logout fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ 
          width: { sm: drawerOpen ? drawerWidth : 0 }, 
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={handleMenu}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="persistent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
              },
            }}
            open={drawerOpen}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerOpen && !isMobile ? drawerWidth : 0}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
