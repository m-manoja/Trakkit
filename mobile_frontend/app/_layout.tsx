import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { TimezoneProvider } from '../src/context/TimezoneContext';
import PushNotificationRegistrar from '../src/components/PushNotificationRegistrar';
import { COLORS } from '../src/theme/colors';

function AuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const inTabs = root === '(tabs)';
    const needsAuth = inTabs || root === 'pricing' || root === 'settings' || root === 'verify-email-pending';

    if (!user && needsAuth) {
      router.replace('/login');
      return;
    }

    if (!user) return;

    // Profile completion gate: force first-time setup
    if (user.profileCompleted === false && segments[1] !== 'profile_setup') {
      router.replace('/(tabs)/profile_setup?isFirstSetup=true');
      return;
    }

    // Email verification gate: must verify before accessing app
    if (user.profileCompleted === true && user.emailVerified === false && root !== 'verify-email-pending') {
      router.replace('/verify-email-pending' as any);
      return;
    }

    // Redirect authenticated+fully set up users away from login
    if (root === 'login' && user.profileCompleted !== false && user.emailVerified !== false) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TimezoneProvider>
      <PushNotificationRegistrar />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="email_login" />
        <Stack.Screen name="pricing" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="verify-email-pending" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="google-calendar-callback" options={{ headerShown: false }} />
        <Stack.Screen
          name="(tabs)"
          options={{
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
      </Stack>
      </TimezoneProvider>
    </AuthProvider>
  );
}
