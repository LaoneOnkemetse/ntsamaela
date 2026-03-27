import { useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../services/api";

type AdminNotification = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  createdAt?: string;
  read?: boolean;
};

export default function NotificationsPage() {
  const {
    data: notificationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminNotificationsPage"],
    queryFn: async () => {
      const data = await getNotifications({ unreadOnly: false, limit: 100 });
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    retry: 2,
  });

  const notifications = useMemo(
    () => (Array.isArray(notificationsData) ? notificationsData : []),
    [notificationsData],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Notifications
      </Typography>

      {Boolean(error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error
            ? error.message
            : "Failed to load notifications"}
        </Alert>
      )}

      <Card>
        <CardContent>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Typography color="text.secondary">
              No notifications found.
            </Typography>
          ) : (
            <List disablePadding>
              {notifications.map((n: AdminNotification) => (
                <ListItem key={n.id} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={n.title || "Notification"}
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {n.message || n.body || ""}
                        </Typography>
                        {n.createdAt && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {new Date(n.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <Chip
                    size="small"
                    color={n.read ? "default" : "primary"}
                    label={n.read ? "Read" : "Unread"}
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
