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

  const loadPackages = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      await refreshAvailablePackages(authToken);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const placeBid = async (pkg, amount) => {
    setSubmitting(true);
    try {
      apiService.setToken(authToken);
      const resp = await apiService.placeBidOnPackage(
        pkg.id,
        amount,
        `Bid: P${amount}`,
      );
      if (resp?.success === false) {
        const code = resp?.error?.code;
        if (code === "DUPLICATE_BID") {
          Alert.alert(
            "Bid already placed",
            "You already have a pending bid on this package. Try a different amount from My Bids or wait for the customer.",
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
        "Success",
        `Bid of P ${amount} placed!\n\nIf accepted, you'll receive P ${yourEarnings} (after 30% platform fee)`,
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
          {packages.map((pkg) => (
            <View key={pkg.id} style={packageStyles.packageCardWithPhoto}>
              {pkg.photo ? (
                <Image
                  source={{ uri: pkg.photo }}
                  style={packageStyles.packagePhoto}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[packageStyles.packagePhoto, styles.photoPlaceholder]}
                >
                  <Text style={styles.photoPlaceholderText}>📦</Text>
                </View>
              )}
              <View style={packageStyles.packageContent}>
                <View style={packageStyles.packageHeader}>
                  <Text style={packageStyles.packageId}>{pkg.id}</Text>
                  <Text style={packageStyles.packagePrice}>P {pkg.price}</Text>
                </View>
                <Text style={packageStyles.packageDesc}>{pkg.description}</Text>
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

                <View style={packageStyles.packageActions}>
                  <TouchableOpacity
                    style={[
                      packageStyles.packageActionButton,
                      packageStyles.acceptButton,
                    ]}
                    onPress={() => handleAccept(pkg)}
                    disabled={submitting}
                  >
                    <Text style={packageStyles.acceptButtonText}>Accept</Text>
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
                      Counter Bid
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
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
};
