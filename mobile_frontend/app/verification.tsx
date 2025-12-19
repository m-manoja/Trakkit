import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import { CustomInput } from '../src/components/Input';
import { PrimaryButton } from '../src/components/Button';

export default function VerificationScreen() {
  const [code, setCode] = useState('');
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const router = useRouter();

  const handleVerify = async () => {
    try {
      const response = await fetch(`http://10.80.172.38:5000/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, token: code }),
      });

      if (response.ok) {
        router.replace("/profile_setup");
      } else {
        Alert.alert("Error", "Invalid code");
      }
    } catch (e) {
      Alert.alert("Error", "Connection failed");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text>Sent to {phoneNumber}</Text>
        <CustomInput label="6-Digit Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
        <PrimaryButton title="Verify" onPress={handleVerify} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 }
});