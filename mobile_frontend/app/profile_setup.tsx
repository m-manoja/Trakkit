import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/theme/colors';
import { CustomInput } from '../src/components/Input';
import { PrimaryButton } from '../src/components/Button';
import { useAuth } from '../src/context/AuthContext';
import { updateProfile } from '../src/api/users';

export default function ProfileSetupScreen() {
  const { user } = useAuth(); // Gets the logged-in user ID
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: ''
  });

  const handleCompleteProfile = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Not signed in", "Please sign in again.");
      router.replace("/");
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        userId: user.id,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        dob: form.dob,
      });

      // Final step of the flow!
      router.replace("/dashboard"); 
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Provide your details to start tracking with Trakkit.</Text>

          <CustomInput 
            label="First Name" 
            placeholder="John"
            value={form.firstName}
            onChangeText={(t) => setForm({...form, firstName: t})}
          />
          <CustomInput 
            label="Last Name" 
            placeholder="Doe"
            value={form.lastName}
            onChangeText={(t) => setForm({...form, lastName: t})}
          />
          <CustomInput 
            label="Email Address" 
            placeholder="john.doe@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => setForm({...form, email: t})}
          />
          <CustomInput 
            label="Date of Birth" 
            placeholder="YYYY-MM-DD"
            value={form.dob}
            onChangeText={(t) => setForm({...form, dob: t})}
          />

          <PrimaryButton 
            title="Complete Profile" 
            onPress={handleCompleteProfile}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background, // #E7D3D3
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  }
});
