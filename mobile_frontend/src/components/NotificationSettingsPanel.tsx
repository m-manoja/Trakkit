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
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTimezone } from '../context/TimezoneContext';
import { getNotificationSettings, updateNotificationSettings } from '../api/users';
import { getDetectedTimezone } from '../utils/dateFormat';
import { COMMON_TIMEZONES, formatTimezoneLabel } from '../utils/timezones';

interface Props {
  onSaved?: () => void;
}

export default function NotificationSettingsPanel({ onSaved }: Props) {
  const { user } = useAuth();
  const { setTimezone: setGlobalTimezone } = useTimezone();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [schedule, setSchedule] = useState('7,3,1');
  const [currentSchedule, setCurrentSchedule] = useState('7,3,1');
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [tzPickerVisible, setTzPickerVisible] = useState(false);
  const [notifTime, setNotifTime] = useState('08:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const timezoneOptions = [...new Set([timezone, getDetectedTimezone(), ...COMMON_TIMEZONES])];

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
        setTimezone(res.data.timezone || getDetectedTimezone());
        setNotifTime(res.data.notification_time || '08:00');
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
          timezone,
          notification_time: notifTime,
        },
        user!.token!
      );
      if (res?.success) {
        setCurrentSchedule(schedule);
        setGlobalTimezone(timezone);
        if (onSaved) {
          onSaved();
        } else {
          Alert.alert('Saved', 'Notification settings updated.');
        }
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
          <Text style={styles.preferenceText}>Push notification (mobile)</Text>
        </View>
        <Switch value={pushNotif} onValueChange={setPushNotif} trackColor={{ false: '#ccc', true: COLORS.primary }} />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Timezone</Text>
      <Text style={styles.sectionSubtitle}>Reminders fire at your chosen time in this timezone</Text>
      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setTzPickerVisible(true)}>
        <Text style={styles.dropdownText}>{formatTimezoneLabel(timezone)}</Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Daily notification time</Text>
      <Text style={styles.sectionSubtitle}>Time to receive subscription and warranty alerts</Text>
      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowTimePicker(true)}>
        <Ionicons name="time-outline" size={18} color="#555" />
        <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
          {(() => {
            const [hStr, mStr] = notifTime.split(':');
            const h = parseInt(hStr ?? '8', 10);
            const m = parseInt(mStr ?? '0', 10);
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${String(m).padStart(2, '0')} ${period}`;
          })()}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#666" />
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hStr, mStr] = notifTime.split(':');
            const d = new Date();
            d.setHours(parseInt(hStr ?? '8', 10), parseInt(mStr ?? '0', 10), 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour={false}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') {
              setShowTimePicker(false);
              if (event.type !== 'set' || !selectedDate) return;
            }
            if (selectedDate) {
              const hh = String(selectedDate.getHours()).padStart(2, '0');
              const mm = String(selectedDate.getMinutes()).padStart(2, '0');
              setNotifTime(`${hh}:${mm}`);
            }
          }}
        />
      )}

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

      <Modal visible={tzPickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setTzPickerVisible(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select timezone</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {timezoneOptions.map((tz) => (
                <TouchableOpacity
                  key={tz}
                  style={styles.pickerItem}
                  onPress={() => {
                    setTimezone(tz);
                    setTzPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{formatTimezoneLabel(tz)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: { fontSize: 16, color: '#111', flex: 1 },
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111' },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerItemText: { fontSize: 16, color: '#111' },
});
