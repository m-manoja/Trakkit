import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../theme/colors';

type Props = {
  title: string;
  description: string;
};

export default function PremiumUpgradeCard({ title, description }: Props) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.cardLabel}>{title}</Text>
        <Text style={styles.cardText}>{description}</Text>
      </View>
      <TouchableOpacity style={styles.cta} onPress={() => router.push('/pricing')}>
        <Ionicons name="flash-outline" size={16} color="white" />
        <Text style={styles.ctaText}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 55, 93, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  cardText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'center',
  },
  ctaText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
