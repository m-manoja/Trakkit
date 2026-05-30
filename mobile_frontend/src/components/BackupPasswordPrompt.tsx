import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { setBackupPassword as apiSetBackupPassword, dismissBackupPrompt as apiDismissPrompt } from '../api/users';

interface Props {
  visible: boolean;
  onDone: () => void; // called after set OR dismiss
}

export default function BackupPasswordPrompt({ visible, onDone }: Props) {
  const { user } = useAuth();
  const token = user?.token || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const handleSave = async () => {
    const finalEmail = (user as any)?.email || email.trim();
    if (!finalEmail) {
      Alert.alert('Missing email', 'Please enter an email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiSetBackupPassword(finalEmail, password, token);
      Alert.alert('✅ Backup login set!', 'You can now log in with your email & password if you lose access to your phone.');
      onDone();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save backup login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await apiDismissPrompt(token);
    } catch {
      // silent — don't block the user
    } finally {
      setDismissing(false);
      onDone();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sheet}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* Icon + heading */}
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Secure your account</Text>
            <Text style={styles.subtitle}>
              Add a backup email &amp; password so you can still log in if you ever lose access to your phone number.
            </Text>

            {/* Fields */}
            <View style={styles.fieldGroup}>
              {(user as any)?.email ? (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#555' }}>Your email address:</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 4 }}>
                    {(user as any)?.email}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={16} color="#999" style={{ marginRight: 8 }} />
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
                </>
              )}

              <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={16} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  placeholderTextColor="#BBB"
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color="#999" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>Confirm password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={16} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  placeholderTextColor="#BBB"
                />
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.primaryBtnText}>Set Backup Login</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleDismiss}
              disabled={dismissing}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>{dismissing ? 'Skipping…' : 'Skip for now'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  scrollContent: { justifyContent: 'flex-end', flexGrow: 1 },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD',
    marginTop: 12, marginBottom: 24,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 },

  fieldGroup: { width: '100%' },
  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: '#FAFAFA',
  },
  input: { flex: 1, fontSize: 14, color: '#1A1A1A' },

  primaryBtn: {
    marginTop: 24,
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  skipBtn: { marginTop: 14, padding: 8 },
  skipText: { color: '#999', fontSize: 14, fontWeight: '500' },
});
