import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { useNavigation } from "../navigation/NavigationContext";
import apiService from "../services/apiService";

export const NotificationScreen = () => {
  const { notifications, setNotifications, refreshNotifications, authToken } =
    useNavigation();

  useEffect(() => {
    if (authToken && refreshNotifications) {
      refreshNotifications(authToken);
    }
  }, [authToken, refreshNotifications]);

  const markAsRead = async (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif,
      ),
    );
    if (authToken) {
      try {
        apiService.setToken(authToken);
        await apiService.markNotificationAsRead(notificationId);
      } catch {
        // UI already updated optimistically
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "delivery":
        return "📦";
      case "bid":
        return "💰";
      case "payment":
        return "💳";
      case "verification":
        return "✅";
      default:
        return "🔔";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>You're all caught up!</Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationItemUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
              >
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationIconText}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text
                    style={[
                      styles.notificationItemTitle,
                      !notification.read && styles.notificationItemTitleUnread,
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationItemMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationItemTime}>
                    {notification.time}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = {
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  notificationTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  notificationList: {
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },
  notificationItemUnread: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.cardBgLight,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notificationItemTitleUnread: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  notificationItemMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
};
