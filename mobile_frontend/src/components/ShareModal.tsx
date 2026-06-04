import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import {
  resolveShareRecipient,
  createShare,
  type ShareItemPayload,
} from '../api/sharing';

export type ShareModalItem = ShareItemPayload & {
  label: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: ShareModalItem[];
  token: string;
  title?: string;
  onSuccess?: (message: string) => void;
};

export default function ShareModal({ visible, onClose, items, token, title = 'Share reminder', onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetLookup = () => {
    setResolvedUserId(null);
    setResolvedName(null);
    setError(null);
  };

  const handleClose = () => {
    setEmail('');
    setPhone('');
    resetLookup();
    onClose();
  };

  const handleLookup = async () => {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      setError('Enter an email or phone number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await resolveShareRecipient(
        { email: trimmedEmail || undefined, phone: trimmedPhone || undefined },
        token
      );
      setResolvedUserId(result.userId);
      setResolvedName(result.displayName);
    } catch (err: unknown) {
      resetLookup();
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!resolvedUserId) {
      setError('Look up a Trakkit user first.');
      return;
    }

    try {
      setSharing(true);
      setError(null);
      const payload = items.map(({ itemType, itemId }) => ({ itemType, itemId }));
      const result = await createShare(resolvedUserId, payload, token);
      let message = `Shared with ${result.recipientDisplayName}. They'll be asked to accept.`;
      if (result.skipped?.length) {
        message += ` Already shared: ${result.skipped.join(', ')}.`;
      }
      onSuccess?.(message);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.itemsSummary}>
              <Text style={styles.itemsSummaryTitle}>
                {items.length === 1 ? '1 item' : `${items.length} items`} selected
              </Text>
              {items.slice(0, 5).map((item) => (
                <Text key={`${item.itemType}-${item.itemId}`} style={styles.itemLine}>
                  • {item.label}
                </Text>
              ))}
              {items.length > 5 && (
                <Text style={styles.itemLine}>…and {items.length - 5} more</Text>
              )}
            </View>

            <Text style={styles.hint}>
              Enter the email or phone number of their Trakkit account.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                resetLookup();
              }}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.or}>or</Text>

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                resetLookup();
              }}
              placeholder="0771234567"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.btnSecondary, loading && styles.btnDisabled]}
              onPress={handleLookup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.btnSecondaryText}>Find account</Text>
              )}
            </TouchableOpacity>

            {resolvedName && resolvedUserId ? (
              <View style={styles.resolved}>
                <Text style={styles.resolvedText}>
                  Account found: <Text style={styles.resolvedName}>{resolvedName}</Text>
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, (!resolvedUserId || sharing) && styles.btnDisabled]}
              onPress={handleShare}
              disabled={!resolvedUserId || sharing}
            >
              {sharing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={16} color="white" />
                  <Text style={styles.btnPrimaryText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  itemsSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  itemsSummaryTitle: { fontWeight: '700', fontSize: 14, marginBottom: 6 },
  itemLine: { fontSize: 13, color: '#555', marginBottom: 2 },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  or: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginVertical: 8,
    fontWeight: '600',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { fontWeight: '600', color: '#333', fontSize: 15 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  resolved: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resolvedText: { fontSize: 13, color: '#065F46' },
  resolvedName: { fontWeight: '700' },
  error: { marginTop: 12, fontSize: 13, color: '#991B1B', fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
});
