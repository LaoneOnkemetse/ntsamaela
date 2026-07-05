import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import apiService from "../services/apiService";
import { useNavigation } from "../navigation/NavigationContext";

export const WalletScreen = ({ navigation: _navigation, route: _route }) => {
  const { userType } = useNavigation();
  const isDriver = (userType || "").toLowerCase() === "driver";
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [pendingRecharge, setPendingRecharge] = useState(null);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const isDriver = (userType || "").toString().toLowerCase() === "driver";
      const [balanceRes, transactionsRes, commissionRes] =
        await Promise.allSettled([
          apiService.getWalletBalance(),
          apiService.getTransactions({ limit: 50 }),
          isDriver
            ? apiService.getCommissionBreakdown().catch(() => null)
            : null,
        ]);

      const balanceValue =
        balanceRes.status === "fulfilled" ? balanceRes.value : null;
      const transactionsValue =
        transactionsRes.status === "fulfilled" ? transactionsRes.value : null;
      const commissionValue =
        commissionRes.status === "fulfilled" ? commissionRes.value : null;

      if (balanceValue?.success && balanceValue.data != null) {
        const bal = balanceValue.data?.availableBalance ?? balanceValue.data;
        setBalance(typeof bal === "number" ? bal : 0);
      } else if (
        balanceRes.status === "rejected" &&
        balanceRes.reason?.response?.status === 403
      ) {
        Alert.alert(
          "Not available",
          "Wallet is only available for drivers and customers with an account.",
        );
      }

      if (transactionsValue?.success && transactionsValue.data != null) {
        const list =
          transactionsValue.data?.transactions ?? transactionsValue.data;
        setTransactions(Array.isArray(list) ? list : []);
      } else {
        setTransactions([]);
      }

      if (commissionValue?.success && commissionValue.data) {
        setCommissionBreakdown(commissionValue.data);
      } else {
        setCommissionBreakdown(null);
      }
    } catch (error) {
      console.error("Failed to load wallet data:", error);
      Alert.alert("Error", "Failed to load wallet information");
    } finally {
      setLoading(false);
    }
  };

  const confirmPendingRecharge = useCallback(async () => {
    if (!pendingRecharge) return;
    try {
      const resp = await apiService.confirmWalletRecharge({
        companyRef: pendingRecharge.companyRef,
        transactionToken: pendingRecharge.transToken,
      });
      const data = resp?.data ?? resp;
      if (data?.completed || data?.alreadyCompleted) {
        setPendingRecharge(null);
        Alert.alert("Success", "Wallet recharged successfully");
        await loadWalletData();
      }
    } catch (e) {
      console.warn("Confirm recharge:", e?.message || e);
    }
  }, [pendingRecharge]);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingRecharge) {
        confirmPendingRecharge();
      }
    });
    return () => sub.remove();
  }, [pendingRecharge, confirmPendingRecharge]);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.rechargeWallet(amount, "DPO");

      if (response.success) {
        const paymentUrl = response.data?.paymentUrl || response.paymentUrl;
        const companyRef = response.data?.companyRef || response.companyRef;
        const transToken = response.data?.transToken || response.transToken;

        if (paymentUrl) {
          if (companyRef || transToken) {
            setPendingRecharge({ companyRef, transToken });
          }
          const canOpen = await Linking.canOpenURL(paymentUrl);
          if (canOpen) {
            await Linking.openURL(paymentUrl);
            Alert.alert(
              "DPO Payment",
              "Complete payment in your browser, then return to the app. Your wallet will update automatically.",
              [{ text: "OK", onPress: () => setShowRechargeModal(false) }],
            );
          } else {
            Alert.alert("Error", "Cannot open payment URL");
          }
        } else {
          Alert.alert("Success", "Wallet recharged successfully");
          setShowRechargeModal(false);
          setRechargeAmount("");
          loadWalletData();
        }
      } else {
        Alert.alert(
          "Error",
          response.error?.message || "Failed to recharge wallet",
        );
      }
    } catch (error) {
      console.error("Recharge error:", error);
      Alert.alert("Error", error.message || "Failed to recharge wallet");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const n = Number(amount);
    if (n !== n) return "P 0.00";
    return `P ${n.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (dateString == null) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case "DEPOSIT":
      case "EARNING":
        return colors.success;
      case "WITHDRAWAL":
      case "COMMISSION":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>My Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          {!isDriver ? (
            <TouchableOpacity
              style={styles.rechargeButton}
              onPress={() => setShowRechargeModal(true)}
            >
              <Text style={styles.rechargeButtonText}>Recharge Wallet</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.driverWalletHint}>
              Driver earnings appear here. Withdrawals are processed from your
              available balance.
            </Text>
          )}
        </View>

        {/* Commission Breakdown (for drivers) */}
        {commissionBreakdown && (
          <View style={styles.commissionCard}>
            <Text style={styles.sectionTitle}>Commission Breakdown</Text>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Total Commissions:</Text>
              <Text style={styles.commissionValue}>
                {formatCurrency(commissionBreakdown.totalCommissions || 0)}
              </Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Reserved:</Text>
              <Text style={styles.commissionValue}>
                {formatCurrency(commissionBreakdown.reservedCommissions || 0)}
              </Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>Available:</Text>
              <Text style={[styles.commissionValue, { color: colors.success }]}>
                {formatCurrency(commissionBreakdown.availableCommissions || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {loading && transactions.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            transactions.map((transaction) => (
              <View
                key={transaction.id || Math.random()}
                style={styles.transactionCard}
              >
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionType}>
                    {transaction.type || "—"}
                  </Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: getTransactionColor(transaction.type) },
                    ]}
                  >
                    {transaction.type === "WITHDRAWAL" ||
                    transaction.type === "COMMISSION"
                      ? "-"
                      : "+"}
                    {formatCurrency(Math.abs(Number(transaction.amount) || 0))}
                  </Text>
                </View>
                <Text style={styles.transactionDescription}>
                  {transaction.description || "—"}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.createdAt)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        transaction.status === "COMPLETED"
                          ? colors.success
                          : transaction.status === "PENDING"
                            ? colors.warning
                            : colors.error,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {transaction.status || "—"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Recharge Modal */}
      <Modal
        visible={showRechargeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRechargeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recharge Wallet</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRechargeModal(false);
                  setRechargeAmount("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRecharge}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textLight} />
                ) : (
                  <Text style={styles.confirmButtonText}>Recharge</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: colors.cardBg,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 16,
  },
  rechargeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rechargeButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
  driverWalletHint: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  commissionCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  commissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commissionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  transactionsSection: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textTertiary,
    marginTop: 20,
  },
  transactionCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 24,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: colors.cardBgLight,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: colors.textLight,
    fontWeight: "600",
  },
});
