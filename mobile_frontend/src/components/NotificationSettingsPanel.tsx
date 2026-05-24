import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getNotificationSettings, updateNotificationSettings } from '../api/users';

export default function NotificationSettingsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [schedule, setSchedule] = useState('7,3,1');
  const [currentSchedule, setCurrentSchedule] = useState('7,3,1');

  const loadSettings = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await getNotificationSettings(user.token);
      if (res?.success && res.data) {
        setEmailNotif(res.data.email_notification);
        setSmsNotif(res.data.sms_notification);
        setPushNotif(res.data.push_notification);
        setSchedule(res.data.reminder_schedule);
        setCurrentSchedule(res.data.reminder_schedule);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleSave = async () => {
    if (!/^\d+(,\d+)*$/.test(schedule)) {
      Alert.alert('Invalid input', 'Enter a valid comma-separated schedule (e.g. 7,3,1)');
      return;
    }

    try {
      setSaving(true);
      const res = await updateNotificationSettings(
        {
          email_notification: emailNotif,
          sms_notification: smsNotif,
          push_notification: pushNotif,
          reminder_schedule: schedule,
        },
        user!.token!
      );
      if (res?.success) {
        setCurrentSchedule(schedule);
        Alert.alert('Saved', 'Notification settings updated.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionSubtitle}>Choose how you receive reminder notifications</Text>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceLeft}>
          <Ionicons name="mail-outline" size={20} color="#555" />
          <Text style={styles.preferenceText}>Email notification</Text>
        </View>
        <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ false: '#ccc', true: COLORS.primary }} />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceLeft}>
          <Ionicons name="chatbubble-outline" size={20} color="#555" />
          <Text style={styles.preferenceText}>SMS notification</Text>
        </View>
        <Switch value={smsNotif} onValueChange={setSmsNotif} trackColor={{ false: '#ccc', true: COLORS.primary }} />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceLeft}>
          <Ionicons name="notifications-outline" size={20} color="#555" />
          <Text style={styles.preferenceText}>Push notification</Text>
        </View>
        <Switch value={pushNotif} onValueChange={setPushNotif} trackColor={{ false: '#ccc', true: COLORS.primary }} />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Reminder schedule</Text>
      <Text style={styles.sectionSubtitle}>(days before expiration, e.g. 30,7,3,1)</Text>
      <TextInput
        style={styles.input}
        value={schedule}
        onChangeText={setSchedule}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.currentScheduleText}>Current: {currentSchedule}</Text>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save notifications</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 24, alignItems: 'center' },
  panel: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  preferenceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preferenceText: { fontSize: 15, color: '#111' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  currentScheduleText: { fontSize: 12, color: '#888', marginTop: 6, marginBottom: 16 },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
