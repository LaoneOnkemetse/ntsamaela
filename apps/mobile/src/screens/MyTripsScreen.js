import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../constants/colors";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import apiService from "../services/apiService";

export const MyTripsScreen = () => {
  const { goBack, authToken } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editCapacity, setEditCapacity] = useState("MEDIUM");
  const [editDate, setEditDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTrips = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      apiService.setToken(authToken);
      const resp = await apiService.getMyTrips({ limit: 50, offset: 0 });
      const list =
        resp?.data ?? resp?.data?.trips ?? resp?.data?.data ?? resp?.data;
      setTrips(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load trips:", e);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = (trip) => {
    const status = (trip.status || "").toUpperCase();
    if (status === "IN_TRANSIT" || status === "IN_PROGRESS") {
      Alert.alert(
        "Cannot Delete",
        "You cannot delete a trip that is currently in transit.",
      );
      return;
    }
    Alert.alert(
      "Delete Trip",
      `Delete trip from ${trip.startAddress} to ${trip.endAddress}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              apiService.setToken(authToken);
              const resp = await apiService.deleteTrip(trip.id);
              if (resp?.success === false) {
                Alert.alert(
                  "Failed",
                  resp?.error?.message || "Could not delete trip",
                );
              } else {
                loadTrips();
              }
            } catch (e) {
              Alert.alert("Failed", e?.message || "Could not delete trip");
            }
          },
        },
      ],
    );
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setEditCapacity(trip.availableCapacity || "MEDIUM");
    setEditDate(new Date(trip.departureTime));
  };

  const handleSaveEdit = async () => {
    if (!editingTrip || !editDate) return;
    if (editDate <= new Date()) {
      Alert.alert("Invalid Date", "Departure time must be in the future.");
      return;
    }
    setSaving(true);
    try {
      apiService.setToken(authToken);
      const resp = await apiService.updateTrip(editingTrip.id, {
        departureTime: editDate.toISOString(),
        availableCapacity: editCapacity,
      });
      if (resp?.success === false) {
        Alert.alert("Failed", resp?.error?.message || "Could not update trip");
      } else {
        setEditingTrip(null);
        loadTrips();
      }
    } catch (e) {
      Alert.alert("Failed", e?.message || "Could not update trip");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>My Trips</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={packageStyles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : trips.length > 0 ? (
            trips.map((trip) => (
              <View key={trip.id} style={styles.tripDetailCard}>
                <View style={styles.tripDetailHeader}>
                  <Text style={styles.tripDetailId}>{trip.id}</Text>
                  <View style={styles.spacesIndicator}>
                    <Text style={styles.spacesText}>
                      {trip.availableCapacity || "—"}
                    </Text>
                  </View>
                </View>

                <View style={packageStyles.packageRoute}>
                  <Text style={packageStyles.packageLocation}>
                    📍 {trip.startAddress}
                  </Text>
                  <Text style={packageStyles.packageArrow}>→</Text>
                  <Text style={packageStyles.packageLocation}>
                    📍 {trip.endAddress}
                  </Text>
                </View>

                <Text style={styles.tripDate}>
                  🕒 {new Date(trip.departureTime).toLocaleString()}
                </Text>

                {(trip.status || "").toUpperCase() !== "IN_TRANSIT" &&
                  (trip.status || "").toUpperCase() !== "IN_PROGRESS" && (
                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 12 }}
                    >
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditTrip(trip)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTrip(trip)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
              </View>
            ))
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyTitle}>No Trips Yet</Text>
              <Text style={styles.emptyText}>
                Create a trip from your driver home screen to start receiving
                package suggestions
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Edit Trip Modal */}
      <Modal
        visible={!!editingTrip}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTrip(null)}
      >
        <View style={sharedStyles.modalOverlay}>
          <View style={[sharedStyles.modalContent, { maxHeight: "60%" }]}>
            <Text style={sharedStyles.modalTitle}>Edit Trip</Text>
            <Text style={sharedStyles.modalSubtitle}>
              {editingTrip?.startAddress} → {editingTrip?.endAddress}
            </Text>

            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 16,
                marginBottom: 6,
                fontWeight: "600",
              }}
            >
              Departure Date
            </Text>
            <TouchableOpacity
              style={sharedStyles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={{
                  color: editDate ? colors.textPrimary : colors.textTertiary,
                }}
              >
                {editDate ? editDate.toLocaleDateString() : "Select date..."}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 12,
                marginBottom: 6,
                fontWeight: "600",
              }}
            >
              Departure Time
            </Text>
            <TouchableOpacity
              style={sharedStyles.input}
              onPress={() => setShowTimePicker(true)}
            >
              <Text
                style={{
                  color: editDate ? colors.textPrimary : colors.textTertiary,
                }}
              >
                {editDate
                  ? editDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Select time..."}
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 12,
                marginBottom: 6,
                fontWeight: "600",
              }}
            >
              Capacity
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["SMALL", "MEDIUM", "LARGE"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor:
                      editCapacity === c
                        ? colors.primary + "20"
                        : colors.cardBg,
                    borderWidth: 1,
                    borderColor:
                      editCapacity === c ? colors.primary : colors.border,
                    alignItems: "center",
                  }}
                  onPress={() => setEditCapacity(c)}
                >
                  <Text
                    style={{
                      color:
                        editCapacity === c
                          ? colors.primary
                          : colors.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[sharedStyles.modalButtons, { marginTop: 20 }]}>
              <TouchableOpacity
                style={[
                  sharedStyles.modalButton,
                  sharedStyles.modalCancelButton,
                ]}
                onPress={() => setEditingTrip(null)}
              >
                <Text style={sharedStyles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  sharedStyles.modalButton,
                  sharedStyles.modalButtonSubmit,
                  saving && { opacity: 0.5 },
                ]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <Text style={sharedStyles.modalButtonTextSubmit}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={editDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={(_e, selected) => {
            setShowDatePicker(false);
            if (selected && editDate) {
              const next = new Date(editDate);
              next.setFullYear(
                selected.getFullYear(),
                selected.getMonth(),
                selected.getDate(),
              );
              setEditDate(next);
            } else if (selected) {
              setEditDate(selected);
            }
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={editDate || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_e, selected) => {
            setShowTimePicker(false);
            if (selected && editDate) {
              const next = new Date(editDate);
              next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              setEditDate(next);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = {
  tripDetailCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripDetailId: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  spacesIndicator: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  spacesText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  tripDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  tripPackagesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  tripPackageItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBgLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tripCustomerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tripPackageCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tripPackageItemText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripPackageFee: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  suggestionCard: {
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestionFee: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  suggestionFeeBreakdown: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  suggestionFeeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  suggestionActions: {
    flexDirection: "row",
    gap: 8,
  },
  suggestionRejectBtn: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionRejectText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionCounterBtn: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionCounterText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionAcceptBtn: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  suggestionAcceptText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary + "20",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#FF4444" + "20",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  deleteButtonText: {
    color: "#FF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
};
