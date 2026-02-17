import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 88 : 60,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        backgroundColor: COLORS.surface,
        borderTopWidth: 0,
        elevation: 8,
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
        title: 'Home',
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: Platform.OS === 'ios' ? 20 : 35,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  }
});