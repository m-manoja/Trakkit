import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { syncGoogleCalendar } from '../src/api/googleCalendar';

/**
 * Deep-link target after Google OAuth (mobilefrontend://google-calendar-callback?...).
 * Backend redirects here when platform=mobile was used for auth.
 */
export default function GoogleCalendarCallbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    googleCalendar?: string;
    email?: string;
    message?: string;
  }>();
  const handledRef = useRef(false);
  const [statusText, setStatusText] = useState('Finishing Google Calendar connection…');

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const finish = (path: '/(tabs)' | '/pricing') => {
      setTimeout(() => router.replace(path), 400);
    };

    const flag = params.googleCalendar;
    const errMsg = typeof params.message === 'string' ? params.message : undefined;
    const email = typeof params.email === 'string' ? decodeURIComponent(params.email) : undefined;

    if (flag === 'error') {
      Alert.alert(
        'Google Calendar',
        errMsg ? decodeURIComponent(errMsg) : 'Google connection failed',
        [{ text: 'OK', onPress: () => finish('/(tabs)') }]
      );
      return;
    }

    if (flag !== 'connected' || !user?.token) {
      finish('/(tabs)');
      return;
    }

    (async () => {
      try {
        setStatusText('Syncing your events to Google Calendar…');
        const result = await syncGoogleCalendar(user.token);
        const parts: string[] = [];
        if (result.created) parts.push(`${result.created} new`);
        if (result.updated) parts.push(`${result.updated} updated`);
        Alert.alert(
          'Google Calendar connected',
          `Connected${email ? ` as ${email}` : ''}.\n\nSynced ${result.total} event${result.total !== 1 ? 's' : ''} to Google Calendar` +
            (parts.length ? ` (${parts.join(', ')})` : '') +
            '.',
          [{ text: 'OK', onPress: () => finish('/(tabs)') }]
        );
      } catch (e) {
        Alert.alert(
          'Connected — sync pending',
          (e instanceof Error ? e.message : 'Sync failed') +
            '\n\nOpen the dashboard and tap Sync with Google Calendar to try again.',
          [{ text: 'OK', onPress: () => finish('/(tabs)') }]
        );
      }
    })();
  }, [params.googleCalendar, params.email, params.message, router, user?.token]);

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{statusText}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
