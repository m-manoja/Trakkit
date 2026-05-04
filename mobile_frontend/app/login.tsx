import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const handleSendOTP = async () => {
    if (!inputValue || !selectedCountry) {
      Alert.alert("Required", "Please select a country and enter your phone number.");
      return;
    }
    setLoading(true);
    const callingCode = selectedCountry?.callingCode || '';
    const cleanNumber = inputValue.replace(/\D/g, '');
    const fullPhone = `+${callingCode}${cleanNumber}`;

    try {
      await sendOTP(fullPhone);
      router.push({
        pathname: "/verification",
        params: { phoneNumber: fullPhone }
      });
    } catch (error) {
      Alert.alert("Connection Error", error instanceof Error ? error.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            {/* Center cluster wrapping everything seamlessly */}
            <View style={styles.centerCluster}>
              
              {/* Logo and Brand perfectly above the card */}
              <View style={styles.topSection}>
                <View style={styles.logoRing}>
                  <Image source={require('../assets/images/icon.png')} style={styles.logo} />
                </View>
                <Text style={styles.brandName}>Trakkit</Text>
                <Text style={styles.tagline}>Your personal life manager</Text>
              </View>

              {/* Centered floating card */}
              <View style={styles.cardContainer}>
              <View style={styles.card}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Enter your phone number to login</Text>
                
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
                    input: { fontSize: 15 },
                    callingCode: { fontSize: 15 },
                  }}
                />
                
                <View style={{ marginTop: 25 }}>
                  <PrimaryButton title="Send Code" onPress={handleSendOTP} loading={loading} />
                </View>

                {/* Backup login link */}
                <TouchableOpacity
                  style={styles.emailLoginLink}
                  onPress={() => router.push('/email_login' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emailLoginText}>Lost your SIM? </Text>
                  <Text style={[styles.emailLoginText, { color: COLORS.primary, fontWeight: '700' }]}>Login with email instead</Text>
                </TouchableOpacity>
              </View>
            </View>
            </View>
            
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingVertical: 40,
  },
  centerCluster: {
    width: '100%',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 20, 
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  logo: { 
    width: 86, 
    height: 86,
    borderRadius: 43,
  },
  brandName: { 
    fontSize: 40, 
    fontWeight: '900', 
    color: '#B9375D',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Heavy' : 'sans-serif-black',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#705A5A',
    marginTop: 2,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 24, 
    elevation: 5, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333', 
    textAlign: 'center',
    marginBottom: 5, 
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
  },
  emailLoginLink: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 25, 
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  emailLoginText: { 
    fontSize: 13, 
    color: '#888',
  },
});
