import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/theme/colors';

// ─── AUTH GUARD ───────────────────────────────────────────────────────────────
// Watches the auth state and redirects to login or tabs as needed.
function AuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return; // Wait until AsyncStorage has been read

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      // Signed out while on a protected tab — send to login
      router.replace('/login');
    } else if (user && !inAuthGroup && segments[0] !== 'verification' && segments[0] !== 'email_login') {
      // Already logged in but on the login screen — send to tabs
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return null;
}

// ─── ROOT LAYOUT ──────────────────────────────────────────────────────────────
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