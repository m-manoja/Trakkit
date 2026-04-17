import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

// ─── FEATURE TABLE DATA ───────────────────────────────────────────────────────

type FeatureRow =
  | { label: string; free: 'yes' | 'no'; premium: 'yes' | 'no' }
  | { label: string; free: string; premium: string; isText: true };

const FEATURES: FeatureRow[] = [
  { label: 'Warranty Management',  free: 'yes', premium: 'yes' },
  { label: 'Subscription Tracking', free: 'yes', premium: 'yes' },
  { label: 'Personal Reminders',    free: 'yes', premium: 'yes' },
  { label: 'To-Do / Notes',         free: 'yes', premium: 'yes' },
  { label: 'File Uploads',          free: 'Limited', premium: 'Unlimited', isText: true } as any,
  { label: 'Family / Sharing Mode', free: 'no',  premium: 'yes' },
  { label: 'Calendar Sync',         free: 'no',  premium: 'yes' },
];

// ─── ICON CELL ────────────────────────────────────────────────────────────────

function FeatureCell({ value }: { value: string }) {
  if (value === 'yes') {
    return <Ionicons name="checkmark" size={18} color="#2ECC71" />;
  }
  if (value === 'no') {
    return <Ionicons name="close" size={18} color="#E74C3C" />;
  }
  // Text value (Limited / Unlimited)
  return (
    <Text style={styles.cellText}>{value}</Text>
  );
}

// ─── SCREEN 1: FEATURES COMPARISON ───────────────────────────────────────────

interface FeaturesScreenProps {
  onClose: () => void;
  onUpgrade: () => void;
}

function FeaturesScreen({ onClose, onUpgrade }: FeaturesScreenProps) {
  return (
    <>
      {/* Header */}
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Upgrade to Trakkit Premium</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Feature Table */}
      <View style={styles.table}>
        {/* Column headers */}
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          <Text style={[styles.colFeature, styles.colHeaderText]}>Features</Text>
          <Text style={[styles.colValue, styles.colHeaderText]}>Free</Text>
          <Text style={[styles.colValue, styles.colHeaderText]}>Premium</Text>
        </View>

        {/* Feature rows */}
        {FEATURES.map((row, i) => (
          <View
            key={row.label}
            style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
          >
            <Text style={styles.colFeature}>{row.label}</Text>
            <View style={styles.colValue}>
              <FeatureCell value={(row as any).free} />
            </View>
            <View style={styles.colValue}>
              <FeatureCell value={(row as any).premium} />
            </View>
          </View>
        ))}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Price + Upgrade CTA */}
      <View style={styles.ctaRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceSup}>$</Text>
          <Text style={styles.priceMain}>5</Text>
          <Text style={styles.priceSub}>USD</Text>
        </View>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── SCREEN 2: PAYMENT FORM ───────────────────────────────────────────────────

interface PaymentScreenProps {
  onBack: () => void;
  onClose: () => void;
}

function PaymentScreen({ onBack, onClose }: PaymentScreenProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('Sri Lanka');
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleGetPremium = async () => {
    if (!cardNumber.trim() || !expiry.trim() || !cvv.trim() || !fullName.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all payment details.');
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '🎉 Welcome to Premium!',
        'Your subscription is now active. Enjoy all premium features!',
        [{ text: 'Great!', onPress: onClose }]
      );
    }, 1500);
  };

  return (
    <>
      {/* Header */}
      <View style={styles.panelHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={[styles.panelTitle, { flex: 1, marginLeft: 6 }]}>Upgrade to Trakkit Premium</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paymentContent}>
        {/* Payment Method */}
        <Text style={styles.sectionLabel}>Payment method</Text>

        {/* Card Number */}
        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputField}
            placeholder="Card Number"
            placeholderTextColor="#AAA"
            value={cardNumber}
            onChangeText={t => setCardNumber(formatCardNumber(t))}
            keyboardType="numeric"
            maxLength={19}
          />
          <View style={styles.cardIcons}>
            <View style={styles.visaTag}>
              <Text style={styles.visaText}>VISA</Text>
            </View>
            <View style={styles.mcCircles}>
              <View style={[styles.mcCircle, { backgroundColor: '#EB001B', marginRight: -6 }]} />
              <View style={[styles.mcCircle, { backgroundColor: '#F79E1B' }]} />
            </View>
          </View>
        </View>

        {/* Expiry + CVV row */}
        <View style={styles.inputRow}>
          <View style={[styles.inputBox, { flex: 1, marginRight: 10 }]}>
            <TextInput
              style={styles.inputField}
              placeholder="Expiration Date"
              placeholderTextColor="#AAA"
              value={expiry}
              onChangeText={t => setExpiry(formatExpiry(t))}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <TextInput
              style={styles.inputField}
              placeholder="Security Code"
              placeholderTextColor="#AAA"
              value={cvv}
              onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />
          </View>
        </View>

        {/* Billing Address */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Billing address</Text>

        <View style={styles.inputBox}>
          <TextInput
            style={styles.inputField}
            placeholder="Full Name"
            placeholderTextColor="#AAA"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Country */}
        <View style={[styles.inputBox, styles.countryBox]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.countryLabel}>Country Region</Text>
            <Text style={styles.countryValue}>{country}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#555" />
        </View>

        {/* Get Premium Button */}
        <TouchableOpacity
          style={[styles.getPremiumBtn, loading && { opacity: 0.7 }]}
          onPress={handleGetPremium}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.getPremiumText}>Get Premium</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const [screen, setScreen] = useState<'features' | 'payment'>('features');

  const handleClose = () => {
    setScreen('features'); // reset to first screen on close
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.panel} onPress={() => {}}>
          {screen === 'features' ? (
            <FeaturesScreen
              onClose={handleClose}
              onUpgrade={() => setScreen('payment')}
            />
          ) : (
            <PaymentScreen
              onBack={() => setScreen('features')}
              onClose={handleClose}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay + Panel
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    width: '100%',
    maxHeight: '82%',
    overflow: 'hidden',
    paddingBottom: 20,
    elevation: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },

  // Panel header
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    flex: 1,
  },

  // Feature table
  table: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  tableHeaderRow: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  colFeature: {
    flex: 1,
    fontSize: 12.5,
    color: '#333',
  },
  colValue: {
    width: 68,
    alignItems: 'center',
  },
  colHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cellText: {
    fontSize: 11.5,
    color: '#555',
    fontWeight: '500',
  },

  // CTA row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1.5,
    borderColor: '#DCDCDC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  priceSup: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  priceMain: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 40,
  },
  priceSub: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    marginLeft: 2,
  },
  upgradeBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Payment form
  paymentContent: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 10,
  },
  inputBox: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  cardIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  visaTag: {
    borderWidth: 1,
    borderColor: '#1A1F71',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  visaText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1A1F71',
    letterSpacing: 0.5,
  },
  mcCircles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.9,
  },
  inputRow: {
    flexDirection: 'row',
  },
  countryBox: {
    justifyContent: 'space-between',
  },
  countryLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  countryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  getPremiumBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 6,
  },
  getPremiumText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
