import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';
import { forgotPassword } from '../src/api/auth';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your backup email and we'll send you a link to reset your password.
          </Text>
        </View>

        {sent ? (
          /* Success state */
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.success} />
            <View style={styles.successTextGroup}>
              <Text style={styles.successTitle}>Reset link sent!</Text>
              <Text style={styles.successBody}>
                A password reset link has been sent to{' '}
                <Text style={styles.successEmail}>{email}</Text>.{'\n'}
                Check your inbox and spam folder.
              </Text>
            </View>
          </View>
        ) : (
          /* Form */
          <View style={styles.card}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
              <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#BBB"
                onSubmitEditing={handleSubmit}
                returnKeyType="send"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitBtnText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 },

  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },

  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  inputWrapperError: { borderColor: COLORS.error },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A' },

  errorText: { fontSize: 12, color: COLORS.error, marginBottom: 12, marginLeft: 2 },

  submitBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  successCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  successTextGroup: { flex: 1 },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginBottom: 6 },
  successBody: { fontSize: 14, color: '#065F46', lineHeight: 20 },
  successEmail: { fontWeight: '700' },
});
