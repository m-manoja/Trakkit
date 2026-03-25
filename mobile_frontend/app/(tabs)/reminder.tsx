import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Modal, ScrollView, ActivityIndicator, Alert, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL } from '../../src/api/config';
import { getNotificationSettings } from '../../src/api/users';
import Header from '../../src/components/Header';

export default function RemindersScreen() {
  const { user, loading: authLoading } = useAuth();
  const token = user?.token;

  // --- DATA STATES ---
  const [reminders, setReminders] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- UI STATES ---
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerData, setPickerData] = useState({ title: '', options: [] as string[], field: '' });
  const [editId, setEditId] = useState<string | null>(null);

  // --- FORM DATA (Matching your screenshot) ---
  const [formData, setFormData] = useState<{
    title: string;
    type: string;
    reminder_date: Date;
    repeat_cycle: string | null;
    remind_time: string;
    description: string;
    reminder_schedule: string;
  }>({
    title: '',
    type: '',
    reminder_date: new Date(),
    repeat_cycle: null, // No default - user must choose
    remind_time: 'On the day',  // Default from screenshot
    description: '',
    reminder_schedule: ''
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState('7,3,1');

  const reminderTypes = ['one time', 'repeat'];

  // --- API: FETCH ---
  const fetchReminders = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reminders/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setReminders(response.data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => { 
    fetchReminders();
    
    // Fetch global notification settings for the default reminder schedule
    if (token) {
      getNotificationSettings(token).then(res => {
        if (res.data?.reminder_schedule) {
          setDefaultReminderSchedule(res.data.reminder_schedule);
        }
      }).catch(err => console.log('Failed to fetch default settings:', err));
    }
  }, [fetchReminders, token]);

  // --- API: SAVE (CREATE & UPDATE) ---
  const handleSave = async () => {
    const { title, type, reminder_date, repeat_cycle, remind_time, description, reminder_schedule } = formData;

    if (!title.trim() || !type) {
      Alert.alert("Required Fields", "Please enter a Name and Type (*)");
      return;
    }

    setIsActionLoading(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        reminder_date: reminder_date.toISOString(),
        repeat_cycle: type === 'repeat' ? repeat_cycle : null,
        remind_time,
        reminder_schedule: (remind_time === 'Before the day' || remind_time === 'On and before') ? (reminder_schedule.trim() || defaultReminderSchedule) : null,
        description: description.trim(),
        userId: user?.id
      };

      if (editId) {
        await axios.put(`${API_BASE_URL}/api/reminders/${editId}`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Alert.alert("Updated", "Reminder updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/reminders/add`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Alert.alert("Success", "Reminder added!");
      }

      setIsFormVisible(false);
      resetForm();
      fetchReminders();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Operation failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Delete", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/api/reminders/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchReminders();
          } catch (error) { Alert.alert("Error", "Failed to delete."); }
        }
      }
    ]);
  };

  const handleEditPress = (item: any) => {
    setEditId(item.id);
    setFormData({
      title: item.title,
      type: item.type,
      reminder_date: new Date(item.reminder_date),
      repeat_cycle: item.repeat_cycle,
      remind_time: item.remind_time,
      description: item.description || '',
      reminder_schedule: item.reminder_schedule || defaultReminderSchedule
    });
    setIsFormVisible(true);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ title: '', type: '', reminder_date: new Date(), repeat_cycle: null, remind_time: 'On the day', description: '', reminder_schedule: defaultReminderSchedule });
  };

  const openPicker = (title: string, options: string[], field: string) => {
    setPickerData({ title, options, field });
    setPickerVisible(true);
  };

  // --- SUB-COMPONENTS ---
  const RadioButton = ({ label, value, field }: any) => (
    <TouchableOpacity
      style={styles.radioRow}
      onPress={() => setFormData({ ...formData, [field]: value })}
    >
      <Ionicons
        name={(formData as any)[field] === value ? "radio-button-on" : "radio-button-off"}
        size={22}
        color={(formData as any)[field] === value ? COLORS.primary : "#666"}
      />
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const ReminderCard = ({ item }: { item: any }) => {
    const formatDate = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleEditPress(item)}><Ionicons name="create-outline" size={20} color="#555" /></TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => handleDelete(item.id, item.title)}><Ionicons name="trash-outline" size={20} color="#E74C3C" /></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{formatDate(item.reminder_date)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{item.type}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Remind</Text>
              <Text style={styles.infoValue}>{item.remind_time}</Text>
            </View>
            {item.repeat_cycle && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Repeat</Text>
                <Text style={styles.infoValue}>{item.repeat_cycle}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (authLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <Header />

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Reminder</Text>
          <TouchableOpacity onPress={() => { resetForm(); setIsFormVisible(true); }}><Ionicons name="add-circle" size={42} color={COLORS.primary} /></TouchableOpacity>
        </View>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            placeholder="Search Reminder"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={reminders.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ReminderCard item={item} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchReminders(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons name="alarm-bell" size={100} color="#D1D1D1" />
            <Text style={styles.emptyTitle}>No Reminder found.</Text>
            <Text style={styles.emptySub}>Get started by adding your first reminder</Text>
            <TouchableOpacity style={styles.mainActionBtn} onPress={() => setIsFormVisible(true)}>
              <Text style={styles.mainActionText}>+ Add Your First Reminder</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* --- ADD/EDIT MODAL (Matching your screenshot) --- */}
      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>{editId ? 'Edit Reminder' : 'Add Reminder'}</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}><Ionicons name="close" size={28} color="black" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Reminder Name*</Text>
              <View style={styles.inputWrapper}>
                <TextInput placeholder="E.g - Meeting" value={formData.title} onChangeText={(t) => setFormData({ ...formData, title: t })} />
              </View>

              <Text style={styles.inputLabel}>Type*</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Select Type', reminderTypes, 'type')}>
                <Text style={{ color: formData.type ? '#333' : '#999' }}>{formData.type || "Select"}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Reminder Date*</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDatePicker(true)}>
                <Text>{formData.reminder_date.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>

              {/* Cycle Section - Only show for repeat type */}
              {formData.type === 'repeat' && (
                <>
                  <Text style={styles.sectionLabel}>Reminder cycle (if repeat)</Text>
                  <View style={styles.radioGrid}>
                    <View style={styles.radioCol}>
                      <RadioButton label="Everyday" value="Everyday" field="repeat_cycle" />
                      <RadioButton label="Every month" value="Every month" field="repeat_cycle" />
                    </View>
                    <View style={styles.radioCol}>
                      <RadioButton label="Every week" value="Every week" field="repeat_cycle" />
                      <RadioButton label="Every year" value="Every year" field="repeat_cycle" />
                    </View>
                  </View>
                </>
              )}

              {/* Remind Logic */}
              <Text style={styles.sectionLabel}>Remind</Text>
              <RadioButton label="On the day" value="On the day" field="remind_time" />
              <RadioButton label="Before the day" value="Before the day" field="remind_time" />
              <RadioButton label="On and before" value="On and before" field="remind_time" />

              {(formData.remind_time === 'Before the day' || formData.remind_time === 'On and before') && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Remind me (days before)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput placeholder="e.g. 7,3,1" value={formData.reminder_schedule} onChangeText={(t) => setFormData({ ...formData, reminder_schedule: t })} style={{ flex: 1, color: '#333' }} />
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  placeholder="Add any notes about this reminder."
                  multiline numberOfLines={3}
                  value={formData.description}
                  onChangeText={(t) => setFormData({ ...formData, description: t })}
                  style={{ width: '100%', textAlignVertical: 'top' }}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsFormVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                  {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{editId ? 'Update' : 'Add Reminder'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={formData.reminder_date}
            mode="date"
            onChange={(e, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, reminder_date: d }); }}
          />
        )}
      </Modal>

      {/* Picker Modal for Types */}
      <Modal visible={pickerVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            {pickerData.options.map((opt) => (
              <TouchableOpacity key={opt} style={styles.pickerItem} onPress={() => { setFormData({ ...formData, [pickerData.field]: opt }); setPickerVisible(false); }}>
                <Text style={{ color: (formData as any)[pickerData.field] === opt ? COLORS.primary : '#333' }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Styles combining your code and screenshot requirements
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, marginTop: 15, height: 45, borderWidth: 1, borderColor: '#DDD' },
  searchInput: { flex: 1, marginLeft: 10 },
  // Card styles
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 12, elevation: 4 },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', flex: 1, marginRight: 12 },
  cardActions: { flexDirection: 'row' },
  cardContent: { marginTop: 8 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 15, fontWeight: '600', color: '#2c3e50' },
  statusBadge: { backgroundColor: '#27ae60', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 11, fontWeight: '700', color: 'white', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  infoItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Empty state styles
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginHorizontal: 40, marginTop: 8 },
  mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, width: '80%', alignItems: 'center', marginTop: 25 },
  mainActionText: { color: 'white', fontWeight: 'bold' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalHeaderText: { fontSize: 20, fontWeight: 'bold' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 15, height: 48, justifyContent: 'center' },
  dropdownTrigger: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 15, height: 48, alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  radioGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  radioCol: { width: '48%' },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  radioLabel: { marginLeft: 10, fontSize: 14, color: '#333' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, paddingBottom: 10 },
  cancelBtn: { width: '45%', height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontWeight: 'bold', fontSize: 15 },
  submitBtn: { width: '45%', height: 48, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: 'white', width: '80%', borderRadius: 15, padding: 10 },
  pickerItem: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
});