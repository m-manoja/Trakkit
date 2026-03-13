import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import Header from '../../src/components/Header';

const { width } = Dimensions.get('window');

export default function DashboardHome() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    // edges={['top']} removes the bottom safe area padding
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Stats Grid */}
        <View style={styles.gridContainer}>
          <StatCard title="Active Subs" value="03" icon="card-text" color={COLORS.primary} />
          <StatCard title="Monthly Spend" value="Rs. 1580" icon="chart-line" color={COLORS.primary} />
          <StatCard title="Warranties" value="02" icon="shield-check" color={COLORS.primary} />
          <StatCard title="Due Soon" value="01" icon="alert-circle" color={COLORS.primary} />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <CompactAction label="Add Subscription" icon="add-circle" />
          <CompactAction label="Add Warranty" icon="shield-checkmark" />
          <CompactAction label="Add Reminder" icon="notifications" />
          <CompactAction label="Add To-Do" icon="list" />
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <Text style={styles.cardHeaderTitle}>Upcoming Reminders</Text>
            <TouchableOpacity><Text style={styles.viewMore}>See All</Text></TouchableOpacity>
          </View>
          <ReminderItem date="01/06" title="Spotify Family" />
          <ReminderItem date="01/20" title="Client Meeting" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const StatCard = ({ title, value, icon, color }: any) => (
  <View style={styles.statCard}>
    <MaterialCommunityIcons name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const CompactAction = ({ label, icon }: any) => (
  <TouchableOpacity style={styles.compactBtn}>
    <Ionicons name={icon} size={20} color={COLORS.primary} />
    <Text style={styles.compactLabel}>{label}</Text>
  </TouchableOpacity>
);

const ReminderItem = ({ date, title }: any) => (
  <View style={styles.reminderRow}>
    <Text style={styles.dateText}>{date}</Text>
    <Text style={styles.reminderName}>{title}</Text>
    <Ionicons name="chevron-forward" size={16} color="#999" />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 120 }, // Added padding to avoid overlapping with absolute Nav Bar
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: {
    backgroundColor: '#FFF',
    width: (width - 55) / 2,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2
  },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5, color: COLORS.textPrimary },
  statTitle: { fontSize: 11, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25, gap: 10 },
  compactBtn: {
    backgroundColor: '#FFF',
    width: (width - 55) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    elevation: 1
  },
  compactLabel: { marginLeft: 10, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  reminderCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 2 },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  cardHeaderTitle: { fontWeight: 'bold', fontSize: 16 },
  viewMore: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  dateText: { width: 50, fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  reminderName: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
});