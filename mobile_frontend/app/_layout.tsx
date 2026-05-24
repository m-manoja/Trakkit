import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/theme/colors';

function AuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const inTabs = root === '(tabs)';
    const needsAuth = inTabs || root === 'pricing';

    if (!user && needsAuth) {
      router.replace('/login');
      return;
    }

    if (user && root === 'login') {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen
          name="(tabs)"
          options={{
            gestureEnabled: false,
            headerBackVisible: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
