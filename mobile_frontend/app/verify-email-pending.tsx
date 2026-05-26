import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { sendEmailVerification } from '../src/api/auth';
import { getProfile } from '../src/api/users';

const STEPS = [
  'Open the email we sent to your address.',
  'Click the "Verify Email" button in the email.',
  'Come back here and tap "I\'ve Verified".',
  'You\'ll be taken straight to your dashboard.',
];

export default function VerifyEmailPendingScreen() {
  const router = useRouter();
  const { user, setUser, signOut } = useAuth();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const email = user?.email || '';

  const handleContinue = async () => {
    if (!user?.token) return;
    setChecking(true);
    try {
      const profile = await getProfile(user.id, user.token);
      const verified = profile?.data?.email_verified === true;

      if (verified) {
        await setUser({ ...user, emailVerified: true });
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Not Verified Yet',
          'We haven\'t received your verification yet. Click the link in the email first, then come back here.',
        );
      }
    } catch {
      Alert.alert('Error', 'Could not check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!user?.token || !email) return;
    setResending(true);
    try {
      await sendEmailVerification(user.token, email);
      Alert.alert('Sent!', `A new verification link has been sent to ${email}.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not resend the verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Icon */}
      <View style={styles.iconCircle}>
        <Ionicons name="mail-unread-outline" size={44} color={COLORS.primary} />
      </View>

      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We sent a verification link to:
      </Text>
      <Text style={styles.email}>{email || 'your email address'}</Text>

      {/* Steps */}
      <View style={styles.stepsCard}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Continue button */}
      <TouchableOpacity
        style={[styles.primaryBtn, checking && { opacity: 0.7 }]}
        onPress={handleContinue}
        disabled={checking}
        activeOpacity={0.85}
      >
        {checking
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.primaryBtnText}>I've Verified — Continue</Text>
        }
      </TouchableOpacity>

      {/* Resend */}
      <TouchableOpacity
        style={[styles.secondaryBtn, resending && { opacity: 0.6 }]}
        onPress={handleResend}
        disabled={resending}
        activeOpacity={0.8}
      >
        {resending
          ? <ActivityIndicator color={COLORS.primary} size="small" />
          : <Text style={styles.secondaryBtnText}>Resend Verification Email</Text>
        }
      </TouchableOpacity>

      {/* Sign out */}
      <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} activeOpacity={0.7}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  email: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 28,
    textAlign: 'center',
  },

  stepsCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 10px rgba(0,0,0,0.06)' },
    }),
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  stepNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  signOutBtn: {
    padding: 10,
  },

  signOutText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
