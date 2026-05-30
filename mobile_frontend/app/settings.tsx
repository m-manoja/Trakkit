import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import NotificationSettingsPanel from '../src/components/NotificationSettingsPanel';
import SharingSettings from '../src/components/SharingSettings';
import GoogleCalendarSync from '../src/components/GoogleCalendarSync';

type SettingsTab = 'notifications' | 'sharing' | 'calendar';

const TABS: { id: SettingsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { id: 'sharing', label: 'Sharing', icon: 'people-outline' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { firstSetup } = useLocalSearchParams<{ firstSetup?: string }>();
  const isFirstSetup = firstSetup === 'true';

  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');

  const handleNotifSaved = async () => {
    if (isFirstSetup && user) {
      await setUser({ ...user, settingsCompleted: true });
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        {isFirstSetup ? (
          <View style={{ width: 40 }} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {isFirstSetup && (
        <View style={styles.firstSetupBanner}>
          <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
          <Text style={styles.firstSetupText}>
            Welcome! Set your notification preferences and save to get started.
          </Text>
        </View>
      )}

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const disabled = isFirstSetup && tab.id !== 'notifications';
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive, disabled && styles.tabDisabled]}
              onPress={() => { if (!disabled) setActiveTab(tab.id); }}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={disabled ? '#ccc' : activeTab === tab.id ? COLORS.primary : '#6B7280'}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive, disabled && styles.tabLabelDisabled]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Notification preferences</Text>
            <NotificationSettingsPanel onSaved={isFirstSetup ? handleNotifSaved : undefined} />
          </View>
        )}

        {activeTab === 'sharing' && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { paddingHorizontal: 20 }]}>
              Sharing
            </Text>
            <Text style={styles.sectionDesc}>
              Manage reminders you shared and items others shared with you.
            </Text>
            <SharingSettings />
          </View>
        )}

        {activeTab === 'calendar' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Google Calendar</Text>
            <Text style={styles.sectionDesc}>
              Sync warranties, subscriptions, reminders, and to-dos to your Google Calendar.
            </Text>
            <View style={styles.calendarCard}>
              <GoogleCalendarSync />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
  firstSetupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF4FF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  firstSetupText: {
    flex: 1,
    fontSize: 13,
    color: '#4B0082',
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabDisabled: { opacity: 0.35 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: COLORS.primary },
  tabLabelDisabled: { color: '#ccc' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { gap: 12 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
});
