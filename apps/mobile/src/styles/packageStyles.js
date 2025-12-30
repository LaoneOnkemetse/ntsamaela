import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

// Package-specific styles
export const packageStyles = StyleSheet.create({
  // Form sections
  formSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Location selection
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  locationSelectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  locationSelectedAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationArrow: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  
  // Route info
  routeInfo: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  routeInfoValue: {
    fontWeight: '700',
    color: colors.primary,
  },
  routeInfoText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  
  // Urgency selector
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyButtonTextActive: {
    color: colors.textLight,
  },
  
  // Photo
  addPhotoButton: {
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  photoPreview: {
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  changePhotoButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changePhotoText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Package list
  listContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  packageCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageCardWithPhoto: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    padding: 0,
  },
  packagePhoto: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  packageContent: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageId: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  packageDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageCustomer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  packageRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  packageLocation: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  packageArrow: {
    fontSize: 14,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageDriverPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  packageDriver: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packageInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  viewBidsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Tracking
  trackingBox: {
    backgroundColor: colors.cardBgLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  trackingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  
  // Package actions
  packageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  packageActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  counterButton: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Bids modal
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  bidCard: {
    backgroundColor: colors.cardBgLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidDriverPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  bidDriverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bidDriverMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  bidFeeInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  bidFeeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bidActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bidButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  bidRejectButton: {
    backgroundColor: colors.border,
  },
  bidRejectText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  bidAcceptButton: {
    backgroundColor: colors.success,
  },
  bidAcceptText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
});

