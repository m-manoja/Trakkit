import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getNotificationSettings, updateNotificationSettings } from '../api/users';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({ visible, onClose }: NotificationSettingsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [schedule, setSchedule] = useState('7,3,1');
  const [currentSchedule, setCurrentSchedule] = useState('7,3,1');

  useEffect(() => {
    if (visible && user?.token) {
      loadSettings();
    }
  }, [visible, user?.token]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getNotificationSettings(user!.token!);
      if (res?.success && res.data) {
        setEmailNotif(res.data.email_notification);
        setSmsNotif(res.data.sms_notification);
        setPushNotif(res.data.push_notification);
        setSchedule(res.data.reminder_schedule);
        setCurrentSchedule(res.data.reminder_schedule);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate comma-separated numbers constraint
    if (!/^\d+(,\d+)*$/.test(schedule)) {
        Alert.alert("Invalid Input", "Please enter a valid comma-separated schedule (e.g., 7,3,1)");
        return;
    }

    try {
      setSaving(true);
      const res = await updateNotificationSettings({
        email_notification: emailNotif,
        sms_notification: smsNotif,
        push_notification: pushNotif,
        reminder_schedule: schedule
      }, user!.token!);
      
      if (res?.success) {
        setCurrentSchedule(schedule);
        onClose();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <Text style={styles.modalTitle}>Notification Settings</Text>

              <Text style={styles.sectionTitle}>Notification Preferences</Text>
              <Text style={styles.sectionSubtitle}>Choose how you'd like to receive reminder notifications</Text>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="mail-outline" size={20} color="#555" />
                  <Text style={styles.preferenceText}>Email Notification</Text>
                </View>
                <Switch 
                  value={emailNotif} 
                  onValueChange={setEmailNotif} 
                  trackColor={{ false: '#ccc', true: '#000' }}
                />
              </View>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="chatbubble-outline" size={20} color="#555" />
                  <Text style={styles.preferenceText}>SMS Notification</Text>
                </View>
                <Switch 
                  value={smsNotif} 
                  onValueChange={setSmsNotif} 
                  trackColor={{ false: '#ccc', true: '#000' }}
                />
              </View>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceLeft}>
                  <Ionicons name="push-outline" size={20} color="#555" />
                  <Text style={styles.preferenceText}>Push Notification</Text>
                </View>
                <Switch 
                  value={pushNotif} 
                  onValueChange={setPushNotif} 
                  trackColor={{ false: '#ccc', true: '#000' }}
                />
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Reminder Schedule</Text>
              <Text style={styles.sectionTitleBracket}>( Day before expiration )</Text>
              <Text style={styles.sectionSubtitle}>
                (e.g., 30,7,3,1 for 30 days, 7 days, 3 days, and 1 day before)
              </Text>

              <TextInput
                style={styles.input}
                value={schedule}
                onChangeText={setSchedule}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.currentScheduleText}>Current: {currentSchedule}</Text>

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSave} 
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 24,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ff4b6e', // Subtle border as per the image
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitleBracket: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 15,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceText: {
    fontSize: 15,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 5,
    backgroundColor: '#fff',
  },
  currentScheduleText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#A83B5E', // Reddish maroon color from the image
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 30,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
