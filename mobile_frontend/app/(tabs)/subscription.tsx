import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';

export default function SubscriptionScreen() {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Subscriptions</Text>
        <Text style={styles.subtitle}>Manage your active services</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Empty State / Placeholder for List */}
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={COLORS.secondary} />
          <Text style={styles.emptyText}>No active subscriptions yet</Text>
          
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: COLORS.primary }]}
            onPress={() => {/* Add Logic Here */}}
          >
            <Ionicons name="add" size={24} color={COLORS.surface} />
            <Text style={styles.addButtonText}>Add Subscription</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background // Using #E7D3D3
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.surface, // Using #FFFFFF
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.textPrimary // Using #2D2D2D
  },
  subtitle: { 
    fontSize: 14, 
    color: COLORS.textSecondary, // Using #555555
    marginTop: 4 
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginVertical: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    marginLeft: 8,
  }
});