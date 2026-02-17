import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PhoneInput from 'react-native-international-phone-number';
import { COLORS } from '../src/theme/colors';
import { PrimaryButton } from '../src/components/Button';
import { sendOTP } from '../src/api/auth';

export default function LoginScreen() {
  const [inputValue, setInputValue] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // 1. Standardize immediately
    let cleanedPhone = inputValue.replace(/\D/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = cleanedPhone.substring(1);
    }

    try {
      await login(cleanedPhone); // Send the 9-digit version to backend

      // 2. Pass the 9-digit version to the next screen
      router.push({
        pathname: "/verification",
        params: { phoneNumber: cleanedPhone }
      });
    } catch (e) {
      Alert.alert("Error", "Failed to send OTP");
    }
  };


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
      await sendOTP(fullPhone);
      // Pass the formatted phone number to the next screen
      router.push({
        pathname: "/verification",
        params: { phoneNumber: fullPhone }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      Alert.alert("Connection Error", message);
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
          placeholder="Phone Number"
          phoneInputPlaceholderTextColor="#999"
          phoneInputStyles={{
            container: {
              borderWidth: 1,
              borderColor: '#E0E0E0',
              borderRadius: 12,
              backgroundColor: '#FFF',
            },
            input: {
              fontSize: 15,
            },
            callingCode: {
              fontSize: 15,
            },
          }}
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
function login(cleanedPhone: any) {
  throw new Error('Function not implemented.');
}

