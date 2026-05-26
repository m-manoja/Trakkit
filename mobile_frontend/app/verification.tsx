import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import { CustomInput } from '../src/components/Input';
import { PrimaryButton } from '../src/components/Button';
import { verifyOTP, sendOTP } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';
import BackupPasswordPrompt from '../src/components/BackupPasswordPrompt';

export default function VerificationScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  // Timer state
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const router = useRouter();

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      await sendOTP(phone);
      Alert.alert("Success", "Code sent!");
      setTimer(30);
      setCanResend(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

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

      // 2. CORRECT EXTRACTION: Pulling from the nested 'user' object
      const token = response.token;
      const backendUser = (response as any).user; // Using 'as any' to bypass the nested type error

      const userId = backendUser?.id;
      const firstName = backendUser?.firstName || '';
      const lastName = backendUser?.lastName || '';

      // 3. Update Auth Context
      if (userId && token) {
        const profileCompleted = backendUser?.profileCompleted ?? false;
        const emailVerified = backendUser?.emailVerified ?? false;

        await setUser({
          id: userId,
          phone: phone,
          token: token,
          firstName: firstName,
          lastName: lastName,
          email: backendUser?.email || '',
          name: `${firstName} ${lastName}`.trim(),
          profileCompleted,
          emailVerified,
        });
      } else {
        throw new Error("Authentication failed: Missing User ID or Token from server response");
      }

      // 4. Navigate based on profile/verification state
      const profileCompleted = backendUser?.profileCompleted ?? false;
      const emailVerified = backendUser?.emailVerified ?? false;

      if (!profileCompleted) {
        router.replace('/(tabs)/profile_setup?isFirstSetup=true' as any);
      } else if (!emailVerified) {
        router.replace('/verify-email-pending' as any);
      } else {
        const backupPromptShown = backendUser?.backupPromptShown ?? true;
        if (!backupPromptShown) {
          setPendingRoute('/(tabs)');
          setShowBackupPrompt(true);
        } else {
          router.replace('/(tabs)');
        }
      }

    } catch (e: any) {
      console.error("Verification Error:", e);
      const message = e.response?.data?.message || e.message || "Connection failed";
      Alert.alert("Verification Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || loading}
              style={styles.resendContainer}
            >
              <Text style={[
                styles.resendText,
                { color: canResend ? COLORS.primary : '#999' }
              ]}>
                {canResend ? "Resend Code" : `Resend code in ${timer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* One-time backup login nudge */}
      <BackupPasswordPrompt
        visible={showBackupPrompt}
        onDone={() => {
          setShowBackupPrompt(false);
          if (pendingRoute) router.replace(pendingRoute as any);
        }}
      />
    </>
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
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }
    })
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
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600'
  }
});