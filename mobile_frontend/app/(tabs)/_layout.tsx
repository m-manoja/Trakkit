import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../src/theme/colors';

// Taller height to accommodate potential safe area issues and floating button context
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        position: 'absolute', // Ensures stable layout across re-logins
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 8,
        backgroundColor: COLORS.surface,
        borderTopWidth: 0,
        // Shadows & Elevation
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)'
          }
        }),
        zIndex: 50,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: Platform.OS === 'android' ? 5 : 0
      },
      headerShown: false,
    }}>
      <Tabs.Screen name="subscription" options={{
        title: 'Subscription',
        tabBarIcon: ({ color }) => <Ionicons name="card-outline" size={24} color={color} />,
      }} />

      <Tabs.Screen name="warranty" options={{
        title: 'Warranty',
        tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={24} color={color} />,
      }} />

      {/* THE CIRCULAR HOME BUTTON */}
      <Tabs.Screen name="index" options={{
        title: '',
        tabBarIcon: ({ focused }) => (
          <View style={[
            styles.homeButton,
            { backgroundColor: focused ? COLORS.primary : COLORS.surface, borderColor: COLORS.primary }
          ]}>
            <Ionicons name="home" size={28} color={focused ? COLORS.surface : COLORS.primary} />
          </View>
        ),
      }} />

      <Tabs.Screen name="reminder" options={{
        title: 'Reminder',
        tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
      }} />

      <Tabs.Screen name="todo" options={{
        title: 'To Do',
        tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={24} color={color} />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  homeButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    // Float the button above the tab bar
    top: -22,
    // Higher elevation to ensure it draws on top of the tab bar on Android
    elevation: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 5px rgba(0, 0, 0, 0.2)'
      }
    }),
    zIndex: 100, // For iOS stacking
  }
});