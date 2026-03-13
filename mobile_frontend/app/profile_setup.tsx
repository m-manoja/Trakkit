import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { ScrollView, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      router.replace("/(tabs)");
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
            onChangeText={(t) => setForm({ ...form, firstName: t })}
          />
          <CustomInput
            label="Last Name"
            placeholder="Doe"
            value={form.lastName}
            onChangeText={(t) => setForm({ ...form, lastName: t })}
          />
          <CustomInput
            label="Email Address"
            placeholder="john.doe@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: form.dob ? COLORS.textPrimary : '#999' }}>
              {form.dob || "YYYY-MM-DD"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner" // Spinner makes it easier to select Year/Month for DOB
              onChange={(event, selectedDate) => {
                // On Android, the dialog closes automatically on selection/cancel
                // On iOS, we might want to keep it or handle it differently, 
                // but here we keep the same logic: close on Android, user can manually close on iOS if we added a "Done" button, 
                // but currently for iOS it stays open. 
                // Actually, for consistency let's toggle it off on selection for Android

                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }

                if (selectedDate) {
                  setDate(selectedDate);
                  const formattedDate = selectedDate.toISOString().split('T')[0];
                  setForm({ ...form, dob: formattedDate });
                }
              }}
              maximumDate={new Date()}
            />
          )}

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
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }
    })
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
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 4
  },
  dateInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  }
});
