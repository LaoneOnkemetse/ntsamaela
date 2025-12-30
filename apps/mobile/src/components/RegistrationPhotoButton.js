import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export const RegistrationPhotoButton = ({ label, onPress, preview }) => (
  <View style={styles.documentRow}>
    <Text style={styles.documentLabel}>{label}</Text>
    <TouchableOpacity style={styles.documentButton} onPress={onPress}>
      {preview ? (
        <Image source={{ uri: preview.uri }} style={styles.documentPreview} />
      ) : (
        <Text style={styles.documentButtonText}>Add</Text>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  documentRow: {
    marginBottom: 15,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  documentButton: {
    height: 120,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgLight,
  },
  documentPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  documentButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

