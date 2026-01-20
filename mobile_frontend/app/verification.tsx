import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import { CustomInput } from '../src/components/Input';
import { PrimaryButton } from '../src/components/Button';
import { verifyOTP } from '../src/api/auth';
import { useAuth } from '../src/context/AuthContext';

export default function VerificationScreen() {
  const [code, setCode] = useState('');
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const router = useRouter();
  const { setUser } = useAuth();
  const phone = typeof phoneNumber === "string" ? phoneNumber : "";

  const handleVerify = async () => {
    try {
      if (!phone) {
        Alert.alert("Error", "Missing phone number");
        return;
      }
      const user = await verifyOTP(phone, code);
      if (user?.id) {
        setUser({ id: user.id, phone: user.phone ?? phone });
      } else {
        setUser({ id: "unknown-user", phone });
      }
      router.replace("/profile_setup");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection failed";
      Alert.alert("Error", message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text>Sent to {phone || "your phone"}</Text>
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
