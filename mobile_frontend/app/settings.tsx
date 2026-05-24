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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme/colors';
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.id ? COLORS.primary : '#6B7280'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Notification preferences</Text>
            <NotificationSettingsPanel />
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
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: COLORS.primary },
  scroll: { paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20 },
  section: { marginBottom: 8 },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEE',
  },
});
