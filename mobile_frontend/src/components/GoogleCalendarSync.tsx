import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import {
  disconnectGoogleCalendar,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  syncGoogleCalendar,
} from '../api/googleCalendar';

type Props = {
  /** Re-run status load when parent screen gains focus (e.g. after OAuth deep link). */
  refreshKey?: number;
};

export default function GoogleCalendarSync({ refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const router = useRouter();

  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!user?.token || !isPremium) {
      setLoadingStatus(false);
      return;
    }
    try {
      const status = await getGoogleCalendarStatus(user.token);
      setConnected(status.connected);
      setGoogleEmail(status.email);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  }, [user?.token, isPremium]);

  useEffect(() => {
    setSyncing(false);
    setLoadingStatus(true);
    loadStatus();
  }, [loadStatus, refreshKey]);

  const runSync = useCallback(async () => {
    if (!user?.token || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await syncGoogleCalendar(user.token);
      setConnected(true);
      if (result.email) setGoogleEmail(result.email);
      const parts: string[] = [];
      if (result.created) parts.push(`${result.created} new`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.duplicatesRemoved) parts.push(`${result.duplicatesRemoved} duplicates removed`);
      if (result.removed) parts.push(`${result.removed} removed`);
      setMessage(
        `Synced ${result.total} event${result.total !== 1 ? 's' : ''} to Google Calendar` +
          (parts.length ? ` (${parts.join(', ')})` : '')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [user?.token]);

  const handleSyncClick = async () => {
    if (!user?.token) return;

    if (connected) {
      await runSync();
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      const url = await getGoogleCalendarAuthUrl(user.token);
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Google sign-in');
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (!user?.token) return;

    Alert.alert(
      'Disconnect Google Calendar',
      'Disconnect Google Calendar from Trakkit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Remove synced events?',
              'Only events created by Trakkit sync will be deleted. Your other Google events are not affected.',
              [
                { text: 'Keep events', onPress: () => performDisconnect(false) },
                { text: 'Remove events', style: 'destructive', onPress: () => performDisconnect(true) },
              ]
            );
          },
        },
      ]
    );
  };

  const performDisconnect = async (removeEvents: boolean) => {
    if (!user?.token) return;
    setDisconnecting(true);
    setError(null);
    setMessage(null);
    try {
      const { eventsRemoved } = await disconnectGoogleCalendar(user.token, removeEvents);
      setConnected(false);
      setGoogleEmail(null);
      if (removeEvents) {
        setMessage(
          eventsRemoved > 0
            ? `Disconnected. Removed ${eventsRemoved} event${eventsRemoved !== 1 ? 's' : ''} from Google Calendar.`
            : 'Disconnected. No Trakkit events were found on Google Calendar.'
        );
      } else {
        setMessage('Disconnected. Your Google Calendar events were left unchanged.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={styles.premiumNotice}>
        <View style={styles.premiumIcon}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.premiumBody}>
          <Text style={styles.premiumLabel}>Google Calendar sync</Text>
          <Text style={styles.premiumText}>
            Connect your Gmail account and sync warranties, subscriptions, reminders, and to-dos to Google Calendar.
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/pricing')}>
          <Text style={styles.premiumLink}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.syncBtn, (syncing || loadingStatus) && styles.btnDisabled]}
          onPress={handleSyncClick}
          disabled={syncing || loadingStatus}
        >
          {syncing ? (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.syncBtnText}>{connected ? 'Syncing…' : 'Connecting…'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.syncBtnText}>Sync with Google Calendar</Text>
            </>
          )}
        </TouchableOpacity>
        {connected && (
          <TouchableOpacity
            style={[styles.disconnectBtn, (disconnecting || syncing) && styles.btnDisabled]}
            onPress={handleDisconnect}
            disabled={disconnecting || syncing}
          >
            {disconnecting ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name="unlink-outline" size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {googleEmail ? (
        <Text style={styles.connectedAs}>Connected as {googleEmail}</Text>
      ) : null}
      {!connected && !loadingStatus ? (
        <Text style={styles.hint}>
          Sign in with the Google account that has the calendar you want to use (Gmail).
        </Text>
      ) : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(185, 55, 93, 0.35)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  syncBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  disconnectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  connectedAs: { marginTop: 8, fontSize: 12, color: '#6B7280', fontWeight: '500' },
  hint: { marginTop: 8, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  success: { marginTop: 8, fontSize: 13, color: '#166534', fontWeight: '500' },
  error: { marginTop: 8, fontSize: 13, color: '#991B1B', fontWeight: '500' },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  premiumIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 55, 93, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBody: { flex: 1 },
  premiumLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  premiumText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  premiumLink: { fontSize: 14, fontWeight: '600', color: COLORS.primary, alignSelf: 'center' },
});
