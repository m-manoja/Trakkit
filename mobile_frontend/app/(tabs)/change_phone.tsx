import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Platform, StatusBar, KeyboardAvoidingView, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/theme/colors';
import { CustomInput } from '../../src/components/Input';
import { PrimaryButton } from '../../src/components/Button';
import { useAuth } from '../../src/context/AuthContext';
import { initiatePhoneChange, verifyPhoneChange } from '../../src/api/users';

type Step = 'enter_phone' | 'verify_otp';

export default function ChangePhoneScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('enter_phone');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  // ── Step 1: Request OTP ─────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!newPhone.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }
    if (newPhone.trim().length < 9) {
      setPhoneError('Enter a valid phone number');
      return;
    }
    setPhoneError('');
    setLoading(true);
    try {
      await initiatePhoneChange(newPhone.trim(), user!.token);
      setStep('verify_otp');
      Alert.alert('OTP Sent', `A 6-digit code has been sent to ${newPhone.trim()}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP & update ─────────────────────────────────
  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setOtpError('Enter the 6-digit OTP');
      return;
    }
    setOtpError('');
    setLoading(true);
    try {
      const result = await verifyPhoneChange(newPhone.trim(), otp.trim(), user!.token);

      // Update AuthContext with new user data and fresh token
      await setUser({
        ...user!,
        phone: result.user.phone,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        token: result.token,
      });

      Alert.alert(
        '✓ Phone Updated',
        `Your phone number has been changed to ${result.user.phone}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.message || 'The OTP is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setOtpError('');
    setLoading(true);
    try {
      await initiatePhoneChange(newPhone.trim(), user!.token);
      Alert.alert('Resent', 'A new OTP has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 'verify_otp' ? setStep('enter_phone') : router.back())}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Phone</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: step === 'enter_phone' ? '50%' : '100%' }]} />
        </View>
        <Text style={styles.stepText}>
          {step === 'enter_phone' ? 'Step 1 of 2 — Enter new number' : 'Step 2 of 2 — Verify OTP'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'enter_phone' ? (
            /* ─── Step 1 ─────────────────────────────────────────── */
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>New Phone Number</Text>
              <Text style={styles.cardSubtitle}>
                Enter your new number. We'll send a 6-digit OTP to verify it.
              </Text>

              {/* Current number — read only */}
              <View style={styles.currentPhoneRow}>
                <Ionicons name="call-outline" size={15} color={COLORS.textSecondary} />
                <Text style={styles.currentPhoneLabel}>Current: </Text>
                <Text style={styles.currentPhoneValue}>{user?.phone}</Text>
              </View>

              <CustomInput
                label="New Phone Number"
                placeholder="e.g. 077 1234567"
                value={newPhone}
                onChangeText={(v) => { setNewPhone(v); setPhoneError(''); }}
                keyboardType="phone-pad"
                autoFocus
              />
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

              <View style={styles.btnWrap}>
                <PrimaryButton
                  title={loading ? 'Sending OTP…' : 'Send OTP'}
                  onPress={handleSendOtp}
                  disabled={loading}
                  loading={loading}
                />
              </View>
            </View>
          ) : (
            /* ─── Step 2 ─────────────────────────────────────────── */
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="keypad-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>Enter OTP</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to{' '}
                <Text style={styles.highlight}>{newPhone}</Text>
              </Text>

              <CustomInput
                label="6-digit OTP"
                placeholder="• • • • • •"
                value={otp}
                onChangeText={(v) => { setOtp(v); setOtpError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

              <View style={styles.btnWrap}>
                <PrimaryButton
                  title={loading ? 'Verifying…' : 'Verify & Update'}
                  onPress={handleVerify}
                  disabled={loading}
                  loading={loading}
                />
              </View>

              <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendBtn}>
                <Text style={styles.resendText}>
                  Didn't receive it?{' '}
                  <Text style={styles.resendAction}>Resend OTP</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  stepBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stepTrack: {
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stepFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  highlight: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  currentPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
    gap: 4,
  },
  currentPhoneLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  currentPhoneValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    alignSelf: 'flex-start',
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 2,
  },
  btnWrap: {
    width: '100%',
    marginTop: 8,
  },
  resendBtn: {
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  resendAction: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
