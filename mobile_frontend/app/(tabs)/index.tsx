import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.greeting, { color: COLORS.textPrimary }]}>Ayubowan! 👋</Text>
      
      <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>Quick Actions</Text>
      
      <View style={styles.actionGrid}>
        <ActionBtn icon="card" label="Add Subscription" />
        <ActionBtn icon="shield-checkmark" label="Add Warranty" />
        <ActionBtn icon="calendar" label="Add Reminder" />
        <ActionBtn icon="list" label="Add Todo List" />
      </View>
    </ScrollView>
  );
}

function ActionBtn({ icon, label }: { icon: any, label: string }) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.surface, borderColor: COLORS.primary }]}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
      <Text style={[styles.actionLabel, { color: COLORS.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  greeting: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginVertical: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { 
    width: '48%', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginBottom: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  actionLabel: { marginTop: 8, fontSize: 13, fontWeight: '500' }
});