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
import { usePlan } from '../../src/hooks/usePlan';
import { useItemSharing } from '../../src/hooks/useItemSharing';
import { API_BASE_URL } from '../../src/api/config';
import { getNotificationSettings } from '../../src/api/users';
import Header from '../../src/components/Header';
import ShareModal from '../../src/components/ShareModal';
import { ShareHeaderActions, SharePageNotices, shareCardStyles } from '../../src/components/SharePageHeader';

export default function TodoScreen() {
  const { user } = useAuth();
  const { isPremium, isFree } = usePlan();
  const token = user?.token;
  const sharing = useItemSharing(isPremium, token);

  // --- STATES ---
  const [todos, setTodos] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [formData, setFormData] = useState({
    task_name: '',
    has_reminder: false,
    reminder_date: new Date(),
    reminder_time: '08:00',
    reminder_schedule: '7,3,1'  // will be updated once global settings load
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState('7,3,1');

  // --- API: FETCH ---
  const fetchTodos = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/todos/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTodos(response.data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => { 
    fetchTodos();
    
    // Fetch global notification settings for the default reminder schedule
    if (token) {
      getNotificationSettings(token).then(res => {
        if (res.data?.reminder_schedule) {
          const globalSchedule = res.data.reminder_schedule;
          setDefaultReminderSchedule(globalSchedule);
          // Also update the form so the field is pre-populated correctly
          setFormData(prev => ({
            ...prev,
            reminder_schedule: prev.reminder_schedule === '7,3,1' ? globalSchedule : prev.reminder_schedule
          }));
        }
      }).catch(err => console.log('Failed to fetch default settings:', err));
    }
  }, [fetchTodos, token]);

  // --- API: SAVE ---
  const handleSave = async () => {
    if (!formData.task_name.trim()) {
      Alert.alert("Required", "Please enter a task name");
      return;
    }

    if (formData.has_reminder) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (formData.reminder_date < todayStart) {
        Alert.alert("Invalid Date", "Reminder date cannot be in the past. Please choose today or a future date.");
        return;
      }
    }

    setIsActionLoading(true);
    try {
      const payload = {
        ...formData,
        userId: user?.id,
        reminder_date: formData.has_reminder ? formData.reminder_date.toISOString() : null,
        reminder_schedule: formData.has_reminder ? (formData.reminder_schedule.trim() || defaultReminderSchedule) : null,
        reminder_time: formData.has_reminder ? formData.reminder_time : null,
      };

      await axios.post(`${API_BASE_URL}/api/todos/add`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setIsFormVisible(false);
      setFormData({ task_name: '', has_reminder: false, reminder_date: new Date(), reminder_time: '08:00', reminder_schedule: defaultReminderSchedule });
      fetchTodos();
    } catch (error) {
      Alert.alert("Error", "Failed to add task");
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- API: TOGGLE CHECKBOX ---
  const toggleComplete = async (item: any) => {
    try {
      await axios.put(`${API_BASE_URL}/api/todos/${item.id}/toggle`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchTodos();
    } catch (error) {
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/todos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchTodos();
    } catch (error) {
      Alert.alert("Error", "Failed to delete task");
    }
  };

  const filteredTodos = todos.filter((t) =>
    t.task_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TodoItem = ({ item }: { item: any }) => (
    <View style={styles.todoRow}>
      {sharing.bulkShareMode && isPremium ? (
        <TouchableOpacity style={shareCardStyles.checkbox} onPress={() => sharing.toggleSelect(item.id)}>
          <Ionicons
            name={sharing.selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => toggleComplete(item)}>
          <Ionicons
            name={item.is_completed ? 'checkbox' : 'square-outline'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      )}
      <Text style={[styles.todoText, item.is_completed && styles.todoTextDone]}>
        {item.task_name}
      </Text>
      {isPremium && !sharing.bulkShareMode && (
        <TouchableOpacity
          style={shareCardStyles.cardShareBtn}
          onPress={() => sharing.openShare([{ itemType: 'todo', itemId: item.id, label: item.task_name }])}
        >
          <Ionicons name="share-social-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      {!sharing.bulkShareMode && (
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <Header />

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>TO DO List</Text>
          <ShareHeaderActions
            isPremium={isPremium}
            bulkShareMode={sharing.bulkShareMode}
            selectedCount={sharing.selectedIds.size}
            onBulkShare={() =>
              sharing.handleBulkShare(
                () =>
                  filteredTodos
                    .filter((t) => sharing.selectedIds.has(t.id))
                    .map((t) => ({ itemType: 'todo' as const, itemId: t.id, label: t.task_name })),
                'Select at least one task.'
              )
            }
            onEnterBulkMode={() => sharing.setBulkShareMode(true)}
            onExitBulkMode={sharing.exitBulkMode}
            addButton={
              <TouchableOpacity onPress={() => setIsFormVisible(true)}>
                <Ionicons name="add-circle" size={42} color={COLORS.primary} />
              </TouchableOpacity>
            }
          />
        </View>
        <SharePageNotices
          isFree={isFree}
          shareNotice={sharing.shareNotice}
          upgradeTitle="Sharing mode"
          upgradeDescription="Upgrade to Premium to share to-do reminders with other Trakkit users."
        />

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            placeholder="Search Task"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TodoItem item={item} />}
        contentContainerStyle={[todos.length > 0 ? styles.listContent : {}, { paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={fetchTodos} />}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons name="format-list-bulleted" size={100} color="#D1D1D1" />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <TouchableOpacity style={styles.mainActionBtn} onPress={() => setIsFormVisible(true)}>
              <Text style={styles.mainActionText}>+ Add Your First Task</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ADD TODO MODAL */}
      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>Add Todo list</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}><Ionicons name="close" size={26} color="black" /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter Task</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="E.g - Finish figma"
                value={formData.task_name}
                onChangeText={(t) => setFormData({ ...formData, task_name: t })}
              />
            </View>

            <View style={styles.reminderRow}>
              <Text style={styles.inputLabel}>Add Reminder</Text>
              <TouchableOpacity onPress={() => setFormData({ ...formData, has_reminder: !formData.has_reminder })}>
                <Ionicons
                  name={formData.has_reminder ? "checkbox" : "square-outline"}
                  size={28} color="#000"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Reminder Date</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, !formData.has_reminder && { opacity: 0.5 }]}
              onPress={() => formData.has_reminder && setShowDatePicker(true)}
            >
              <Text>{formData.reminder_date.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Reminder Time</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, !formData.has_reminder && { opacity: 0.5 }]}
              onPress={() => formData.has_reminder && setShowTimePicker(true)}
            >
              <Text>{formData.reminder_time}</Text>
              <Ionicons name="time-outline" size={20} color="#666" />
            </TouchableOpacity>

            {formData.has_reminder && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.inputLabel}>Remind me (days before)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    placeholder={`Default: ${defaultReminderSchedule}`}
                    value={formData.reminder_schedule}
                    onChangeText={(t) => setFormData({ ...formData, reminder_schedule: t })}
                    style={{ flex: 1, color: '#333' }}
                    keyboardType="default"
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  Enter comma-separated days (e.g. 7,3,1). Leave blank to use default.
                </Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsFormVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Add Task</Text>}
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.reminder_date}
                mode="date"
                minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                onChange={(e, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, reminder_date: d }); }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={(() => { const [h, m] = formData.reminder_time.split(':').map(Number); const d = new Date(); d.setHours(h ?? 8, m ?? 0, 0, 0); return d; })()}
                mode="time"
                is24Hour={true}
                onChange={(e, d) => {
                  setShowTimePicker(false);
                  if (d) {
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    setFormData({ ...formData, reminder_time: `${hh}:${mm}` });
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {token ? (
        <ShareModal
          visible={sharing.shareModalVisible}
          onClose={sharing.closeShareModal}
          items={sharing.shareItems}
          token={token}
          title="Share task"
          onSuccess={sharing.showShareSuccess}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, marginTop: 15, height: 45, borderWidth: 1, borderColor: '#DDD' },
  searchInput: { flex: 1, marginLeft: 10 },
  // List Styles
  listContent: { paddingHorizontal: 20, paddingTop: 10 },
  todoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 5, borderLeftColor: COLORS.primary },
  todoText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' },
  todoTextDone: { textDecorationLine: 'line-through', color: '#AAA' },
  // Empty State
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#AAB7B8', marginTop: 15, marginBottom: 25 },
  mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, width: '80%', alignItems: 'center' },
  mainActionText: { color: 'white', fontWeight: 'bold' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#F9F4F4', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalHeaderText: { fontSize: 20, fontWeight: 'bold' },
  inputLabel: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 15, height: 48, justifyContent: 'center' },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  dropdownTrigger: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 15, height: 48, alignItems: 'center', justifyContent: 'space-between' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  cancelBtn: { width: '45%', height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  cancelBtnText: { fontWeight: 'bold' },
  submitBtn: { width: '45%', height: 48, backgroundColor: COLORS.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold' },
});