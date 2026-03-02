import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock,
  Email,
  ArrowForward,
} from "@mui/icons-material";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

const DEFAULT_EMAIL = "Plutonium94@ntsamaela.com";
const DEFAULT_PASSWORD = "pLuto@.*123hash";

export default function Login() {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const { setAuthData, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear session on login page mount only
  }, []);

  const validate = (): boolean => {
    const err: { email?: string; password?: string } = {};
    if (!email || !email.trim()) err.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      err.email = "Invalid email";
    if (!password) err.password = "Password is required";
    else if (password.length < 6)
      err.password = "Password must be at least 6 characters";
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload = {
        email: email.trim(),
        password,
      };
      const response = await authService.login(payload);

      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setAuthData(userData, userToken);
        toast.success("Welcome back!");
        router.push("/dashboard");
        return;
      }

      const msg = (response.error?.message || "Login failed").toLowerCase();
      if (
        msg.includes("password") ||
        msg.includes("incorrect") ||
        msg.includes("invalid")
      ) {
        setFieldErrors((prev) => ({ ...prev, password: "Incorrect password" }));
      } else if (
        msg.includes("email") ||
        msg.includes("not found") ||
        msg.includes("user")
      ) {
        setFieldErrors((prev) => ({ ...prev, email: "Email not found" }));
      } else {
        toast.error(response.error?.message || "Login failed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection error";
      if (
        message.toLowerCase().includes("fetch") ||
        message.toLowerCase().includes("network")
      ) {
        toast.error(
          "Cannot reach server. Check your connection and that the API is running.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background:
          "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 50%, rgba(14, 165, 233, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.15), transparent 50%)",
        },
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: "20px",
                background: "#75AADB",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontSize: "3.5rem",
                fontWeight: 900,
                color: "#FFFFFF",
                mb: 3,
              }}
            >
              N
            </Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, color: "#FFFFFF", mb: 1 }}
            >
              Ntsamaela
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 500 }}
            >
              Admin Dashboard
            </Typography>
          </Box>

          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to access your admin panel
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                disabled={isLoading}
                margin="normal"
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { background: "#F9FAFB" } }}
              />
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!fieldErrors.password}
                helperText={fieldErrors.password}
                disabled={isLoading}
                margin="normal"
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label="toggle password"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { background: "#F9FAFB" } }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 2,
                  mb: 3,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{
                        color: "#0EA5E9",
                        "&.Mui-checked": { color: "#0EA5E9" },
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
                  onClick={() =>
                    toast(
                      "Use Settings to change your password after logging in.",
                      { icon: "ℹ️", duration: 4000 },
                    )
                  }
                  sx={{ color: "#0EA5E9", fontWeight: 600 }}
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
                  fontSize: "1rem",
                  fontWeight: 600,
                  background: "#0EA5E9",
                  color: "#FFFFFF",
                  "&:hover": {
                    background: "#0284C7",
                    boxShadow: "0px 8px 20px rgba(14, 165, 233, 0.4)",
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Paper>

          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="body2"
              sx={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              © 2025 Ntsamaela. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
