import { NextPageContext } from 'next';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import { useRouter } from 'next/router';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

function Error({ statusCode, err }: ErrorProps) {
  const router = useRouter();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
      p={3}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {statusCode === 404 ? 'Page Not Found' : 'Internal Server Error'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {statusCode === 404
              ? 'The page you are looking for does not exist.'
              : 'Something went wrong on our end. Please try again later.'}
          </Typography>
          {err && process.env.NODE_ENV === 'development' && (
            <Box
              sx={{
                bgcolor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                mb: 3,
                textAlign: 'left',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {err.message}
                {err.stack && `\n\n${err.stack}`}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => router.reload()}
            >
              Reload Page
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/')}
            >
              Go Home
            </Button>
          </Box>
          {process.env.NEXT_PUBLIC_API_URL && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              API URL: {process.env.NEXT_PUBLIC_API_URL}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 500;
  // Log error for debugging
  if (err) {
    console.error('Error in _error.tsx:', err);
  }
  return { statusCode, err: err || undefined };
};

export default Error;
