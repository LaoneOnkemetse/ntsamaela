import type { AppProps } from "next/app";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Typography, Button } from "@mui/material";
import { Toaster } from "react-hot-toast";

import { theme } from "../styles/theme";
import { AuthProvider } from "../contexts/AuthContext";
import Layout from "../components/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Page error:", error);
  }

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === "development";
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          flexDirection="column"
          p={3}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Something went wrong loading this page.
          </Typography>
          {isDev && this.state.error && (
            <Typography
              variant="body2"
              component="pre"
              sx={{
                mt: 1,
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                overflow: "auto",
                maxWidth: "100%",
                textAlign: "left",
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.assign("/")}
            >
              Go Home
            </Button>
          </Box>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <PageErrorBoundary>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </PageErrorBoundary>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: "#363636", color: "#fff" },
          }}
        />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
