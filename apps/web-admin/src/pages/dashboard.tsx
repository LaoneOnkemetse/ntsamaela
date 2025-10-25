import { Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Avatar } from '@mui/material';
import { 
  People, 
  LocalShipping, 
  VerifiedUser, 
  AttachMoney,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { GetServerSideProps } from 'next';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  change?: number;
  progress?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, change, progress }) => {
  const isPositive = change && change > 0;
  
  return (
    <Card sx={{ 
      height: '100%',
      position: 'relative',
      overflow: 'visible',
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Chip
                size="small"
                icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                label={`${isPositive ? '+' : ''}${change}%`}
                sx={{
                  background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: isPositive ? '#10B981' : '#EF4444',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: isPositive ? '#10B981' : '#EF4444',
                  },
                }}
              />
            )}
          </Box>
          <Avatar sx={{ 
            width: 56, 
            height: 56,
            background: gradient,
            boxShadow: '0px 8px 20px rgba(99, 102, 241, 0.25)',
          }}>
            {icon}
          </Avatar>
        </Box>
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(99, 102, 241, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: gradient,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      icon: <People />,
      gradient: '#0EA5E9',
      change: 12.5,
      progress: 75,
    },
    {
      title: 'Active Packages',
      value: '567',
      icon: <LocalShipping />,
      gradient: '#22C55E',
      change: 8.2,
      progress: 62,
    },
    {
      title: 'Pending Verifications',
      value: '89',
      icon: <VerifiedUser />,
      gradient: '#F59E0B',
      change: -3.1,
      progress: 45,
    },
    {
      title: 'Revenue',
      value: '$12,345',
      icon: <AttachMoney />,
      gradient: '#8B5CF6',
      change: 15.8,
      progress: 88,
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName}! Here's what's happening today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
        
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Recent Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest deliveries and transactions
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: 300,
                background: '#F8FAFC',
                borderRadius: 2,
                border: '2px dashed #E2E8F0',
              }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Activity chart will display here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Review Verifications', count: 12, color: '#F59E0B' },
                  { label: 'Pending Approvals', count: 8, color: '#EC4899' },
                  { label: 'Support Tickets', count: 5, color: '#6366F1' },
                  { label: 'New Users', count: 24, color: '#10B981' },
                ].map((item, index) => (
                  <Box 
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: item.color,
                        background: `${item.color}08`,
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Chip 
                      label={item.count}
                      size="small"
                      sx={{
                        background: `${item.color}20`,
                        color: item.color,
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                ))}
              </Box>
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
