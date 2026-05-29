import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../api/users';

/** Remote push is not available in Expo Go on Android (SDK 53+). Use a dev build to test. */
function isAndroidExpoGo(): boolean {
  return (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

if (!isAndroidExpoGo()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function obtainExpoPushToken(): Promise<string | null> {
  if (isAndroidExpoGo()) {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenData.data;
}

export default function PushNotificationRegistrar() {
  const { user } = useAuth();
  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.token) return;

    if (Platform.OS === 'web' || isAndroidExpoGo()) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await obtainExpoPushToken();
        if (cancelled || !token || token === lastToken.current) return;
        await registerPushToken(token, user.token!, Platform.OS);
        lastToken.current = token;
      } catch (e) {
        console.warn('[Push] Registration skipped:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  return null;
}
