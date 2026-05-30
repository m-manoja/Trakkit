import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../api/users';

/** Returns true when running inside Expo Go (StoreClient). */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export default function PushNotificationRegistrar() {
  const { user } = useAuth();
  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    // Push notifications are not supported in Expo Go (SDK 53+).
    // Skip entirely — dynamic import below is never reached, so the
    // expo-notifications side-effect file never runs in Expo Go.
    if (isExpoGo() || Platform.OS === 'web' || !user?.token || !Device.isDevice) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import: module (and its side effects) only loads in non-Expo Go builds.
        const Notifications = await import('expo-notifications');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenData.data;

        if (cancelled || !token || token === lastToken.current) return;
        await registerPushToken(token, user.token!, Platform.OS);
        lastToken.current = token;
      } catch (e) {
        console.warn('[Push] Registration skipped:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.token]);

  return null;
}
