import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { COLORS } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {/* Do NOT use initialRouteName here */}
        <Stack.Screen name="index" /> 
        <Stack.Screen name="verification" />
        <Stack.Screen name="profile_setup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}