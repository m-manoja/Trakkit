import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import PremiumUpgradeCard from './PremiumUpgradeCard';
import {
  fetchSentShares,
  fetchReceivedShares,
  revokeShare,
  type ShareListEntry,
  type ShareItemType,
} from '../api/sharing';

const TYPE_LABELS: Record<ShareItemType, string> = {
  warranty: 'Warranty',
  subscription: 'Subscription',
  reminder: 'Reminder',
  todo: 'To-do',
};

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function ItemDetails({ entry }: { entry: ShareListEntry }) {
  const item = entry.item;
  if (!item) {
    return <Text style={styles.meta}>Details are no longer available.</Text>;
  }

  const rows: { label: string; value: string; isLink?: boolean }[] = [];

  switch (entry.itemType) {
    case 'warranty':
      rows.push(
        { label: 'Product', value: String(item.product_name || '—') },
        { label: 'Category', value: String(item.category || '—') },
        { label: 'Expiry', value: formatDate(item.expiry_date) },
        { label: 'Status', value: String(item.status || '—') }
      );
      if (item.document_url) {
        const url = String(item.document_url).split(',')[0];
        rows.push({ label: 'Document', value: url, isLink: true });
      }
      break;
    case 'subscription':
      rows.push(
        { label: 'Service', value: String(item.service_name || '—') },
        { label: 'Next billing', value: formatDate(item.next_billing_date) }
      );
      break;
    case 'reminder':
      rows.push(
        { label: 'Title', value: String(item.title || '—') },
        { label: 'Type', value: String(item.type || '—') },
        { label: 'Date', value: formatDate(item.reminder_date) },
        { label: 'Remind', value: String(item.remind_time || '—') }
      );
      break;
    case 'todo':
      rows.push(
        { label: 'Task', value: String(item.task_name || '—') },
        { label: 'Reminder date', value: formatDate(item.reminder_date) }
      );
      break;
  }

  return (
    <View style={styles.detailPanel}>
      {rows.map((row) => (
        <View key={row.label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{row.label}</Text>
          {row.isLink ? (
            <TouchableOpacity onPress={() => Linking.openURL(row.value)}>
              <Text style={styles.docLink}>View document</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.detailValue}>{row.value}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export default function SharingSettings() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const [sent, setSent] = useState<ShareListEntry[]>([]);
  const [received, setReceived] = useState<ShareListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const [sentData, receivedData] = await Promise.all([
        isPremium ? fetchSentShares(user.token) : Promise.resolve([]),
        fetchReceivedShares(user.token),
      ]);
      setSent(sentData);
      setReceived(receivedData);
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.token, isPremium]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRevoke = (shareId: string) => {
    if (!user?.token) return;
    Alert.alert(
      'Stop sharing',
      'Stop sharing this item? They will no longer receive alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop sharing',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevokingId(shareId);
              await revokeShare(shareId, user.token);
              await load();
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to revoke');
            } finally {
              setRevokingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading sharing…</Text>
      </View>
    );
  }

  return (
    <View>
      {isPremium ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared by you</Text>
          <Text style={styles.sectionDesc}>
            Reminders you shared with others. Revoking removes them from both lists and stops their alerts.
          </Text>
          {sent.length === 0 ? (
            <Text style={styles.empty}>You have not shared any items yet.</Text>
          ) : (
            sent.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.cardTitle}>{entry.itemLabel}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{TYPE_LABELS[entry.itemType]}</Text>
                </View>
                <Text style={styles.meta}>
                  Shared with <Text style={styles.metaStrong}>{entry.otherUser.displayName}</Text> ·{' '}
                  {new Date(entry.createdAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity
                  style={styles.revokeBtn}
                  onPress={() => handleRevoke(entry.id)}
                  disabled={revokingId === entry.id}
                >
                  <Text style={styles.revokeBtnText}>
                    {revokingId === entry.id ? 'Removing…' : 'Stop sharing'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
          <PremiumUpgradeCard
            title="Share reminders"
            description="Premium lets you share warranties, subscriptions, reminders, and to-dos with other Trakkit users."
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared with you</Text>
        <Text style={styles.sectionDesc}>
          Read-only reminders others shared with you. Alerts follow your notification preferences.
        </Text>
        {received.length === 0 ? (
          <Text style={styles.empty}>Nothing has been shared with you yet.</Text>
        ) : (
          received.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <Text style={styles.cardTitle}>{entry.itemLabel}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{TYPE_LABELS[entry.itemType]}</Text>
              </View>
              <Text style={styles.meta}>
                Shared by <Text style={styles.metaStrong}>{entry.otherUser.displayName}</Text> ·{' '}
                {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <Text style={styles.detailBtnText}>
                  {expandedId === entry.id ? 'Hide details' : 'View details'}
                </Text>
              </TouchableOpacity>
              {expandedId === entry.id ? <ItemDetails entry={entry} /> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  empty: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(185, 55, 93, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  meta: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  metaStrong: { fontWeight: '700', color: '#374151' },
  revokeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  revokeBtnText: { color: '#B91C1C', fontWeight: '600', fontSize: 13 },
  detailBtn: { alignSelf: 'flex-start' },
  detailBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  detailPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  detailRow: { marginBottom: 8 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: '#333', marginTop: 2 },
  docLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
});
