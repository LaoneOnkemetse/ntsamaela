import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import apiService from '../services/apiService';

export const WalletScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const [balanceRes, transactionsRes, commissionRes] = await Promise.all([
        apiService.getWalletBalance(),
        apiService.getTransactions({ limit: 50 }),
        apiService.getCommissionBreakdown().catch(() => null),
      ]);

      if (balanceRes.success) {
        setBalance(balanceRes.data?.availableBalance || 0);
      }

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data?.transactions || []);
      }

      if (commissionRes?.success) {
        setCommissionBreakdown(commissionRes.data);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.rechargeWallet(amount, 'PAYSTACK');
      
      if (response.success) {
        if (response.data?.paymentUrl) {
          // Open payment URL in browser
          const canOpen = await Linking.canOpenURL(response.data.paymentUrl);
          if (canOpen) {
            await Linking.openURL(response.data.paymentUrl);
            Alert.alert(
              'Payment',
              'Redirecting to payment gateway. Please complete the payment and return to the app.',
              [{ text: 'OK', onPress: () => setShowRechargeModal(false) }]
            );
          } else {
            Alert.alert('Error', 'Cannot open payment URL');
          }
        } else {
          Alert.alert('Success', 'Wallet recharged successfully');
          setShowRechargeModal(false);
          setRechargeAmount('');
          loadWalletData();
        }
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to recharge wallet');
      }
    } catch (error) {
      console.error('Recharge error:', error);
      Alert.alert('Error', error.message || 'Failed to recharge wallet');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `P ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'DEPOSIT':
      case 'EARNING':
        return colors.success;
      case 'WITHDRAWAL':
      case 'COMMISSION':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <TouchableOpacity
            style={styles.rechargeButton}
            onPress={() => setShowRechargeModal(true)}
          >
            <Text style={styles.rechargeButtonText}>Recharge Wallet</Text>
          </TouchableOpacity>
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
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionType}>{transaction.type}</Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: getTransactionColor(transaction.type) },
                    ]}
                  >
                    {transaction.type === 'WITHDRAWAL' || transaction.type === 'COMMISSION'
                      ? '-'
                      : '+'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                </View>
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        transaction.status === 'COMPLETED'
                          ? colors.success
                          : transaction.status === 'PENDING'
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>{transaction.status}</Text>
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
                  setRechargeAmount('');
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
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: colors.cardBg,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  commissionCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commissionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionsSection: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: colors.textLight,
    fontWeight: '600',
  },
});

