import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors } from '../constants/colors';

export const InputModal = ({ visible, title, placeholder, onSubmit, onCancel, keyboardType = 'default' }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={setValue}
              keyboardType={keyboardType}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancel}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSubmit}
              >
                <Text style={styles.modalButtonTextSubmit}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: colors.cardBgLight,
    color: colors.textPrimary,
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
  modalButtonCancel: {
    backgroundColor: colors.border,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: colors.textLight,
    fontWeight: '600',
  },
});

