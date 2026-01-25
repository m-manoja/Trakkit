import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import { CustomInput } from '../src/components/Input';
import { PrimaryButton } from '../src/components/Button';
import { verifyOTP } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';

export default function VerificationScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const router = useRouter();

  // Get setUser from AuthContext
  const { setUser } = useAuth();

  const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert("Error", "Please enter the full verification code");
      return;
    }

    setLoading(true);
    try {
      if (!phone) {
        Alert.alert("Error", "Missing phone number");
        return;
      }

      // 1. Call API to verify OTP
      const response = await verifyOTP(phone, code);
      console.log("OTP Response Received:", response);

      // 2. CORRECT EXTRACTION: Pulling from the nested 'user' object
      const token = response.token;
      const backendUser = (response as any).user; // Using 'as any' to bypass the nested type error

      const userId = backendUser?.id;
      const firstName = backendUser?.firstName || '';
      const lastName = backendUser?.lastName || '';

      // 3. Update Auth Context
      if (userId && token) {
        // We cast the object to 'any' here to stop the "Property does not exist" error
        // while you wait for the AuthContext types to refresh in VS Code
        await setUser({
          id: userId,
          phone: phone,
          token: token,
          firstName: firstName,
          lastName: lastName,
          name: `${firstName} ${lastName}`.trim()
        } as any);

        console.log("✅ AUTH SUCCESS: User saved and persisted");
      } else {
        console.log("Missing data check:", { userId, token });
        throw new Error("Authentication failed: Missing User ID or Token from server response");
      }

      // 4. SMART NAVIGATION
      let targetPath = (response as any).nextScreen;

      if (!targetPath || targetPath === "/dashboard" || targetPath === "/index") {
        targetPath = "/(tabs)";
      }

      router.replace(targetPath as any);

    } catch (e: any) {
      console.error("Verification Error:", e);
      const message = e.response?.data?.message || e.message || "Connection failed";
      Alert.alert("Verification Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text style={styles.subtitle}>Sent to {phone || "your phone"}</Text>

        <CustomInput
          label="Verification Code"
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />

        <View style={{ marginTop: 10 }}>
          <PrimaryButton
            title="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20
  }
});