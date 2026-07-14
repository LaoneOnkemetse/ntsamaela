import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { sharedStyles } from "../styles/sharedStyles";
import { packageStyles } from "../styles/packageStyles";
import { useNavigation } from "../navigation/NavigationContext";
import { InputModal } from "../components/InputModal";
import apiService from "../services/apiService";

export const AvailablePackagesScreen = () => {
  const { goBack, availablePackages, refreshAvailablePackages, authToken } =
    useNavigation();
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myBids, setMyBids] = useState([]);

  const [acceptingCounterId, setAcceptingCounterId] = useState(null);

  const loadMyBids = useCallback(async () => {
    if (!authToken) return;
    try {
      apiService.setToken(authToken);
      const resp = await apiService.getMyBids();
      const bids = resp?.data ?? [];
      setMyBids(Array.isArray(bids) ? bids : []);
    } catch {
      setMyBids([]);
    }
  }, [authToken]);

  const acceptCustomerCounter = async (counterBid) => {
    setAcceptingCounterId(counterBid.id);
    try {
      apiService.setToken(authToken);
      const resp = await apiService.acceptBid(counterBid.id);
      if (resp?.success === false) {
        Alert.alert(
          "Accept failed",
          resp?.error?.message || "Could not accept customer counter",
        );
        return;
      }
      Alert.alert(
        "Counter accepted",
        `You accepted the customer's counter of P ${counterBid.amount}.`,
      );
      await loadPackages();
    } catch (e) {
      Alert.alert("Accept failed", e?.message || "Could not accept counter");
    } finally {
      setAcceptingCounterId(null);
    }
  };

  const loadPackages = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      await Promise.all([refreshAvailablePackages(authToken), loadMyBids()]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, loadMyBids]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const captureBidLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = loc.coords.latitude;
      const longitude = loc.coords.longitude;
      let locationName = null;
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const p = places?.[0];
        if (p) {
          locationName =
            [p.name, p.street, p.city || p.subregion, p.region]
              .filter(Boolean)
              .slice(0, 3)
              .join(", ") || null;
        }
      } catch {
        // ignore
      }
      apiService.setToken(authToken);
      apiService.updateDriverLocation(latitude, longitude).catch(() => {});
      return { latitude, longitude, locationName };
    } catch {
      return null;
    }
  };

  const placeBid = async (pkg, amount) => {
    setSubmitting(true);
    try {
      apiService.setToken(authToken);
      const location = await captureBidLocation();
      let resp = await apiService.placeBidOnPackage(
        pkg.id,
        amount,
        `Bid: P${amount}`,
        location,
      );

      if (resp?.success === false && resp?.error?.code === "DUPLICATE_BID") {
        const existing = myBids.find(
          (b) => b.packageId === pkg.id && b.status === "PENDING",
        );
        if (existing) {
          resp = await apiService.updateBid(
            existing.id,
            amount,
            `Updated bid: P${amount}`,
          );
        }
      }

      if (resp?.success === false) {
        const code = resp?.error?.code;
        if (code === "DUPLICATE_BID") {
          Alert.alert(
            "Bid already placed",
            "You already have a pending bid on this package.",
          );
        } else {
          Alert.alert(
            "Bid failed",
            resp?.error?.message || "Could not place bid",
          );
        }
        return;
      }
      const yourEarnings = (parseFloat(amount) * 0.7).toFixed(2);
      Alert.alert(
        "Bid placed",
        `Your bid of P ${amount} is pending customer approval.\n\nIf accepted, you'll receive P ${yourEarnings} (after 30% platform fee)`,
      );
      await loadPackages();
    } catch (e) {
      Alert.alert("Bid failed", e?.message || "Could not place bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = (pkg) => {
    const yourEarnings = (pkg.price * 0.7).toFixed(2);
    const platformFee = (pkg.price * 0.3).toFixed(2);

    Alert.alert(
      "Accept Package",
      `Accept ${pkg.id} for P ${pkg.price}?\n\nYou get: P ${yourEarnings}\nPlatform fee: P ${platformFee} (30%)`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: () => placeBid(pkg, pkg.price),
        },
      ],
    );
  };

  const handleCounterBid = (pkg) => {
    setSelectedPackage(pkg);
    setShowBidModal(true);
  };

  const handleBidSubmit = (amount) => {
    setShowBidModal(false);
    if (!selectedPackage) return;
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      placeBid(selectedPackage, parseFloat(amount));
    } else {
      Alert.alert("Error", "Please enter a valid bid amount");
    }
    setSelectedPackage(null);
  };

  const packages = Array.isArray(availablePackages) ? availablePackages : [];

  return (
    <View style={sharedStyles.screenContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sharedStyles.headerBar}>
          <TouchableOpacity onPress={goBack} style={sharedStyles.backButton}>
            <Text style={sharedStyles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={sharedStyles.headerTitle}>Available Packages</Text>
          <TouchableOpacity
            onPress={loadPackages}
            style={sharedStyles.backButton}
          >
            <Text style={sharedStyles.backButtonText}>↻</Text>
          </TouchableOpacity>
        </View>

        {loading && packages.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : null}

        <ScrollView
          style={packageStyles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {packages.length === 0 && !loading && (
            <Text style={packageStyles.sectionTitle}>
              No pending packages right now.
            </Text>
          )}
          {packages.map((pkg) => {
            const myBid = myBids.find(
              (b) =>
                b.packageId === pkg.id &&
                ["PENDING", "DRIVER_COUNTER"].includes(
                  (b.status || "").toUpperCase(),
                ) &&
                (b.offerFrom || "DRIVER").toUpperCase() !== "CUSTOMER",
            );
            const customerCounter = myBids.find(
              (b) =>
                b.packageId === pkg.id &&
                ((b.status || "").toUpperCase() === "CUSTOMER_COUNTER" ||
                  (b.offerFrom || "").toUpperCase() === "CUSTOMER"),
            );
            return (
              <View key={pkg.id} style={packageStyles.packageCardWithPhoto}>
                {pkg.photo ? (
                  <Image
                    source={{ uri: pkg.photo }}
                    style={packageStyles.packagePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      packageStyles.packagePhoto,
                      styles.photoPlaceholder,
                    ]}
                  >
                    <Text style={styles.photoPlaceholderText}>📦</Text>
                  </View>
                )}
                <View style={packageStyles.packageContent}>
                  <View style={packageStyles.packageHeader}>
                    <Text style={packageStyles.packageId}>{pkg.id}</Text>
                    <Text style={packageStyles.packagePrice}>
                      P {pkg.price}
                    </Text>
                  </View>
                  <Text style={packageStyles.packageDesc}>
                    {pkg.description}
                  </Text>
                  <Text style={packageStyles.packageCustomer}>
                    Customer: {pkg.customer}
                  </Text>
                  <View style={packageStyles.packageRoute}>
                    <Text style={packageStyles.packageLocation}>
                      📍 {pkg.pickup}
                    </Text>
                    <Text style={packageStyles.packageArrow}>→</Text>
                    <Text style={packageStyles.packageLocation}>
                      📍 {pkg.delivery}
                    </Text>
                  </View>
                  <Text style={packageStyles.packageInfo}>
                    {pkg.weight} • {pkg.distance}
                  </Text>

                  {myBid ? (
                    <View style={styles.bidPendingBadge}>
                      <Text style={styles.bidPendingText}>
                        ✓ Your bid: P {myBid.amount} — awaiting customer
                      </Text>
                    </View>
                  ) : null}

                  {customerCounter ? (
                    <View style={styles.bidPendingBadge}>
                      <Text style={styles.bidPendingText}>
                        ↕ Customer counter: P {customerCounter.amount}{" "}
                        (separate offer)
                      </Text>
                      <TouchableOpacity
                        style={[
                          packageStyles.packageActionButton,
                          packageStyles.acceptButton,
                          { marginTop: 8 },
                        ]}
                        disabled={acceptingCounterId === customerCounter.id}
                        onPress={() => acceptCustomerCounter(customerCounter)}
                      >
                        <Text style={packageStyles.acceptButtonText}>
                          {acceptingCounterId === customerCounter.id
                            ? "Accepting..."
                            : "Accept Customer Counter"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <View style={packageStyles.packageActions}>
                    <TouchableOpacity
                      style={[
                        packageStyles.packageActionButton,
                        packageStyles.acceptButton,
                        (submitting || myBid) && { opacity: 0.5 },
                      ]}
                      onPress={() => handleAccept(pkg)}
                      disabled={submitting || !!myBid}
                    >
                      <Text style={packageStyles.acceptButtonText}>
                        {myBid ? "Bid Pending" : "Accept"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        packageStyles.packageActionButton,
                        packageStyles.counterButton,
                      ]}
                      onPress={() => handleCounterBid(pkg)}
                      disabled={submitting}
                    >
                      <Text style={packageStyles.counterButtonText}>
                        {myBid ? "Update Bid" : "Counter Bid"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <InputModal
        visible={showBidModal}
        title={
          selectedPackage
            ? `Counter Bid for ${selectedPackage.id}`
            : "Counter Bid"
        }
        placeholder="Enter your bid amount (P)"
        keyboardType="decimal-pad"
        onSubmit={handleBidSubmit}
        onCancel={() => {
          setShowBidModal(false);
          setSelectedPackage(null);
        }}
      />
    </View>
  );
};

const styles = {
  photoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  bidPendingBadge: {
    backgroundColor: "#4CAF5020",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  bidPendingText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
  },
};
