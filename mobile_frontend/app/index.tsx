import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PhoneInput from 'react-native-international-phone-number';
import { COLORS } from '../src/theme/colors';
import { PrimaryButton } from '../src/components/Button';

export default function LoginScreen() {
  const [inputValue, setInputValue] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!inputValue) return Alert.alert("Error", "Enter phone number");
    
    setLoading(true);
    const fullPhone = `${selectedCountry?.callingCode}${inputValue.replace(/\s/g, '')}`;

    try {
      const response = await fetch(`http://YOUR_LOCAL_IP:5000/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      if (response.ok) {
        router.push({ pathname: "/verification", params: { phoneNumber: fullPhone } });
      } else {
        Alert.alert("Error", "Failed to send OTP");
      }
    } catch (e) {
      Alert.alert("Network Error", "Is your backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.brandName}>Trakkit</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in with phone</Text>
        <PhoneInput
          value={inputValue}
          onChangePhoneNumber={setInputValue}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={setSelectedCountry}
          defaultCountry="CU"
        />
        <View style={{ marginTop: 20 }}>
          <PrimaryButton title="Send Code" onPress={handleSendOTP} loading={loading} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80 },
  brandName: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, elevation: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 }
});