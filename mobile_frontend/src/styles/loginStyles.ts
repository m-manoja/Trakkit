import { StyleSheet } from "react-native";
import colors from "../theme/colors";

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    marginBottom: 15,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 2,
  },
  phoneInputContainer: {
    width: "100%",
    height: 55,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 15,
  },
  phoneInputTextContainer: {
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  button: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 15,
  },
  secondaryText: {
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  message: {
    marginTop: 20,
    fontSize: 14,
    textAlign: "center",
  },
});

export default loginStyles;
