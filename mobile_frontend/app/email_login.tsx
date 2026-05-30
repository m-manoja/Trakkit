import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { emailLogin } from '../src/api/users';

export default function EmailLoginScreen() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await emailLogin(email.trim(), password);

      const { token, user } = response;

      await setUser({
        id: user.id,
        phone: user.phone,
        token,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        profileCompleted: true,
        emailVerified: user.emailVerified ?? true,
        settingsCompleted: user.settingsCompleted ?? true,
      });

      if (!(user.settingsCompleted ?? true)) {
        router.replace('/settings?firstSetup=true' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Incorrect email or password.');
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
          <Text style={styles.backText}>Back to Phone Login</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Backup Login</Text>
          <Text style={styles.subtitle}>
            Sign in with your backup email &amp; password if you no longer have access to your phone number.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#BBB"
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.loginBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password' as any)}
            style={styles.forgotBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Don't have backup login set up? Sign in with your phone number and add it from your profile.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: 20, paddingTop: 60 },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 4 },

  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary + '18',
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

  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  eyeBtn: { padding: 4 },

  loginBtn: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  hint: { marginTop: 24, textAlign: 'center', fontSize: 12, color: '#AAA', lineHeight: 18 },

  forgotBtn: { marginTop: 16, alignItems: 'center', padding: 6 },
  forgotText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
