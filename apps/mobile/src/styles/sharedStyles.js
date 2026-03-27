import { StyleSheet } from "react-native";
import { colors } from "../constants/colors";

// Shared styles used across multiple screens
export const sharedStyles = StyleSheet.create({
  // Screen containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },

  // Forms
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.cardBgLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  passwordInputWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
  },
  passwordIconText: {
    fontSize: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },

  // Documents section
  documentsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  documentsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  documentNote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    marginBottom: 8,
    fontStyle: "italic",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  // Terms
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 16,
  },
  termsCheckbox: {
    marginRight: 8,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 20,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "600",
  },

  // Login specific
  loginContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoN: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.cardBg,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  slogan: {
    fontSize: 16,
    color: colors.botswanaBlack,
    fontStyle: "italic",
    fontWeight: "400",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textLight,
  },
  phoneInputContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  countryCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBgLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    marginRight: -1,
  },
  countryCodeText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: 4,
  },
  countryCodeArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginBottom: 0,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
  },

  // Modals
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: colors.border,
  },
  modalCancelButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextSubmit: {
    color: colors.textLight,
    fontWeight: "600",
  },
  countryCodeList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  countryCodeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.cardBgLight,
  },
  countryCodeItemActive: {
    backgroundColor: colors.primary + "20",
  },
  countryCodeFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryCodeName: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  countryCodeNumber: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  roleChoiceButton: {
    backgroundColor: colors.cardBgLight,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleChoiceText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  roleModalSpacing: {
    height: 16,
  },
});
