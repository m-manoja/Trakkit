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
  const { setUser } = useAuth();
  const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";

  const handleVerify = async () => {
    setLoading(true);
    try {
      if (!phone) {
        Alert.alert("Error", "Missing phone number");
        return;
      }

      // 1. Call API to verify OTP
      const response = await verifyOTP(phone, code);

      // 2. Extract user data and the backend's suggested next screen
      const { userId, nextScreen } = response;

      // 3. Update Auth Context so the app knows who is logged in
      if (userId) {
        setUser({ id: userId, phone: phone });
      }

      // 4. SMART NAVIGATION: Adjust path for the (tabs) group structure
      let targetPath = nextScreen;

      // If backend says "/dashboard", we must use "/(tabs)" to show the Navbar
      if (targetPath === "/dashboard" || targetPath === "/index") {
        targetPath = "/(tabs)";
      }

      router.replace({
        pathname: (targetPath || "/(tabs)") as any,
        params: { userId: userId }
      });

    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection failed";
      Alert.alert("Error", message);
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
          label="6-Digit Code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <PrimaryButton
          title="Verify"
          onPress={handleVerify}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, // Using your #E7D3D3
    justifyContent: 'center', 
    padding: 20 
  },
  card: { 
    backgroundColor: COLORS.surface, // Using your #FFFFFF
    borderRadius: 20, 
    padding: 24, 
    elevation: 4 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary, // Using your #2D2D2D
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 14, 
    color: COLORS.textSecondary, // Using your #555555
    marginBottom: 20 
  }
});