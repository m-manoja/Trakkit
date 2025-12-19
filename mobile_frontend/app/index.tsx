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
  // 1. Basic validation
  if (!inputValue || !selectedCountry) {
    Alert.alert("Error", "Please select a country and enter your phone number");
    return;
  }

  setLoading(true);

  // 2. The Correct E.164 Format Logic
  // - Adds the '+' prefix
  // - Adds the calling code (e.g., 94)
  // - Removes all spaces from the user's input
  const callingCode = selectedCountry?.callingCode || '';
  const cleanNumber = inputValue.replace(/\D/g, '');
  const fullPhone = `+${callingCode}${cleanNumber}`;

  console.log("🚀 Sending formatted phone number:", fullPhone);

  try {
    const response = await fetch(`http://10.80.172.38:5000/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    });

    const result = await response.json();

    if (response.ok) {
      // Pass the formatted phone number to the next screen
      router.push({ 
        pathname: "/verification", 
        params: { phoneNumber: fullPhone } 
      });
    } else {
      Alert.alert("Failed", result.error || "Could not send OTP");
    }
  } catch (error) {
    Alert.alert("Connection Error", "Check if your backend is running at 10.80.172.38:5000");
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