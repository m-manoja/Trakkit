import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
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

    // Settings setup gate: redirect to settings on first login after email verification
    if (
      user.profileCompleted === true &&
      user.emailVerified !== false &&
      user.settingsCompleted === false &&
      root !== 'settings'
    ) {
      router.replace('/settings?firstSetup=true' as any);
      return;
    }

    // Redirect authenticated+fully set up users away from login screens
    const isAuthScreen = root === 'login' || root === 'email_login' || root === 'verification' || root === 'forgot-password';
    if (isAuthScreen && user.profileCompleted !== false && user.emailVerified !== false) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return null;
}

function RootNavigator() {
  const { loading } = useAuth();

  // While the persisted session is being restored, show a splash instead of the
  // login screen. Otherwise the login form renders during the async restore window,
  // letting the user start typing a phone number before a saved session silently
  // redirects them into the previous account — which looks like "logged in without OTP".
  if (loading) {
    return (
      <View style={styles.splash}>
        <Image source={require('../assets/images/icon.png')} style={styles.splashLogo} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
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
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TimezoneProvider>
      <PushNotificationRegistrar />
      <AuthGuard />
      <RootNavigator />
      </TimezoneProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
});
