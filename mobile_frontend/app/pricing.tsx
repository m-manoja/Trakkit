import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../src/theme/colors';
import { WEB_PRICING_URL } from '../src/api/config';
import { useAuth } from '../src/context/AuthContext';
import { usePlan } from '../src/hooks/usePlan';
import { syncPlanAfterPayment } from '../src/utils/syncPlanAfterPayment';

const FREE_FEATURES = [
  { text: 'Up to 10 document uploads', included: true },
  { text: 'Personal reminders & notifications', included: true },
  { text: 'Family sharing mode', included: false },
  { text: 'Google Calendar sync', included: false },
];

const PREMIUM_FEATURES = [
  { text: 'Unlimited document uploads', included: true },
  { text: 'Personal reminders & notifications', included: true },
  { text: 'Family sharing for warranties, subscriptions, reminders & to-dos', included: true },
  { text: 'Sync all events to your Google Calendar (Gmail)', included: true },
];

export default function PricingScreen() {
  const router = useRouter();
  const { user, refreshPlan } = useAuth();
  const { isPremium } = usePlan();
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [syncingPlan, setSyncingPlan] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.token) refreshPlan();
    }, [user?.token, refreshPlan])
  );

  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const handleUpgrade = async () => {
    if (!user?.token) {
      Alert.alert('Sign in required', 'Please log in to upgrade your plan.');
      router.replace('/login');
      return;
    }

    if (!WEB_PRICING_URL) {
      Alert.alert(
        'Checkout unavailable',
        'The web checkout URL is not configured. Set EXPO_PUBLIC_WEB_URL in mobile_frontend/.env and restart the Expo dev server.'
      );
      return;
    }

    setOpeningBrowser(true);
    try {
      await WebBrowser.openBrowserAsync(WEB_PRICING_URL, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        showInRecents: false,
      });

      setOpeningBrowser(false);
      setSyncingPlan(true);

      const plan = await syncPlanAfterPayment(refreshPlan);

      if (plan === 'premium') {
        Alert.alert(
          'Premium activated',
          'Your Premium plan is now active. Enjoy unlimited uploads and all Premium features!',
          [{ text: 'Great', onPress: () => router.back() }]
        );
      }
    } catch (e) {
      console.error('Web checkout error:', e);
      Alert.alert('Could not open checkout', 'Please try again or visit the Trakkit website in your browser.');
    } finally {
      setOpeningBrowser(false);
      setSyncingPlan(false);
    }
  };

  const upgradeBusy = openingBrowser || syncingPlan;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="star" size={12} color={COLORS.primary} />
              <Text style={styles.badgeText}>One-Time Upgrade</Text>
            </View>
            <Text style={styles.title}>
              Simple, honest{'\n'}
              <Text style={styles.titleAccent}>pricing for everyone</Text>
            </Text>
            <Text style={styles.subtitle}>
              Unlock the full power of Trakkit with a single one-time payment. No subscriptions.
              No hidden fees. Yours forever.
            </Text>
          </View>

          {/* Free Card */}
          <View style={styles.freeCard}>
            <View style={[styles.planIcon, styles.freeIcon]}>
              <Ionicons name="shield-checkmark" size={24} color="#6B7280" />
            </View>
            <Text style={styles.planName}>Free Plan</Text>
            <Text style={styles.planDesc}>
              Everything you need to get started tracking your important items.
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>LKR</Text>
              <Text style={styles.amount}>0</Text>
              <Text style={styles.period}>/ forever</Text>
            </View>
            {FREE_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons
                  name={f.included ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={f.included ? COLORS.success : '#D1D5DB'}
                />
                <Text style={[styles.featureText, !f.included && styles.lockedText]}>{f.text}</Text>
              </View>
            ))}
            <View style={styles.currentPlanBtn}>
              <Text style={styles.currentPlanText}>
                {isPremium ? 'Previous Plan' : '✓ Your Current Plan'}
              </Text>
            </View>
          </View>

          {/* Premium Card */}
          <View style={styles.premiumCard}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Best Value</Text>
            </View>
            <View style={[styles.planIcon, styles.premiumIcon]}>
              <Ionicons name="flash" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.planName}>Premium Plan</Text>
            <Text style={styles.planDesc}>
              Unlimited uploads, family sharing, and Google Calendar sync.
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>LKR</Text>
              <Text style={styles.amount}>999</Text>
              <Text style={styles.period}>/ one-time</Text>
            </View>
            {PREMIUM_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}

            {isPremium ? (
              <View style={styles.alreadyPremiumBtn}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.alreadyPremiumText}>{"You're on Premium"}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.upgradeBtn, upgradeBusy && styles.upgradeBtnDisabled]}
                onPress={handleUpgrade}
                disabled={upgradeBusy}
              >
                {upgradeBusy ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="flash" size={18} color="#FFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.upgradeBtnText}>
                  {openingBrowser
                    ? 'Opening checkout…'
                    : syncingPlan
                      ? 'Checking your plan…'
                      : 'Upgrade Now — LKR 999'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.guarantee}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
            <Text style={styles.guaranteeText}>Secured by PayHere · Safe & encrypted checkout</Text>
          </View>

          <View style={styles.webNote}>
            <Ionicons name="globe-outline" size={16} color="#9CA3AF" />
            <View style={styles.webNoteBody}>
              <Text style={styles.webNoteTitle}>Pay on the Trakkit website</Text>
              <Text style={styles.webNoteText}>
                1. Sign in on the website with the same phone number{'\n'}
                2. Complete payment with PayHere{'\n'}
                3. Return to this app — Premium updates automatically
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDF2F5' },
  topBar: { paddingHorizontal: 8, paddingBottom: 4 },
  backBtn: { padding: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { alignItems: 'center', marginBottom: 24 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(185, 55, 93, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(185, 55, 93, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  titleAccent: { color: COLORS.primary },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  freeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 24,
    marginBottom: 16,
  },
  premiumCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeIcon: { backgroundColor: '#F3F4F6' },
  premiumIcon: { backgroundColor: 'rgba(185, 55, 93, 0.12)' },
  planName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  planDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  currency: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginRight: 4 },
  amount: { fontSize: 40, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 44 },
  period: { fontSize: 14, color: '#9CA3AF', marginBottom: 8, marginLeft: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  featureText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  lockedText: { color: '#9CA3AF' },
  currentPlanBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  currentPlanText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  upgradeBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  upgradeBtnDisabled: { opacity: 0.75 },
  upgradeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  alreadyPremiumBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(185, 55, 93, 0.1)',
  },
  alreadyPremiumText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guaranteeText: { fontSize: 13, color: '#6B7280' },
  webNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webNoteBody: { flex: 1 },
  webNoteTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  webNoteText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
