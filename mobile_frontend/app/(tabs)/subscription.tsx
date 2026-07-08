import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../src/utils/dateFormat';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Modal, ScrollView, ActivityIndicator, Alert, FlatList, RefreshControl, Platform, Linking
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

export default function SubscriptionInitial() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, isFree } = usePlan();
  const token = user?.token;
  const sharing = useItemSharing(isPremium, token);

  // --- DATA STATES ---
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // --- UI STATES ---
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerData, setPickerData] = useState({ title: '', options: [] as string[], field: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const billingCycles = ['Weekly', 'Monthly', 'Yearly'];
  const categories = ['Entertainment', 'Productivity', 'Cloud Storage', 'Software', 'Fitness', 'Education', 'Other'];

  const [formData, setFormData] = useState({
    service_name: '',
    amount: '',
    billing_cycle: '',
    category: '',
    start_date: new Date(),
    description: '',
    reminder_schedule: '',
    manage_url: ''
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState('7,3,1');

  // --- API: FETCH ---
  const fetchSubscriptions = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/subscriptions/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSubscriptions(response.data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchSubscriptions();

    // Fetch global notification settings for the default reminder schedule
    if (token) {
      getNotificationSettings(token).then(res => {
        if (res.data?.reminder_schedule) {
          setDefaultReminderSchedule(res.data.reminder_schedule);
        }
      }).catch(err => console.log('Failed to fetch default settings:', err));
    }
  }, [fetchSubscriptions, token]);

  // --- API: DELETE ---
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Subscription",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/api/subscriptions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              fetchSubscriptions();
            } catch (error) {
              Alert.alert("Error", "Failed to delete subscription.");
            }
          }
        }
      ]
    );
  };

  // --- API: RENEW ---
  const handleRenew = (id: string, name: string, manageUrl?: string) => {
    const doRenew = async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/subscriptions/${id}/renew`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchSubscriptions();
      } catch (error) {
        Alert.alert("Error", "Failed to renew.");
      }
    };

    // With a payment link: ask whether to open it. Either choice renews.
    if (manageUrl) {
      Alert.alert(
        "Renew Subscription",
        `Do you want to go to the payment page for ${name}? It will be renewed in Trakkit either way.`,
        [
          { text: "No, just renew", onPress: () => doRenew() },
          {
            text: "Yes, go to page",
            onPress: async () => {
              await doRenew();
              Linking.openURL(manageUrl).catch(() =>
                Alert.alert("Error", "Couldn't open the payment link.")
              );
            },
          },
        ]
      );
      return;
    }

    // No payment link: plain renew confirmation.
    Alert.alert(
      "Renew Subscription",
      `Would you like to renew ${name}? This will mark it as paid and advance the date to the next cycle.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Renew", onPress: () => doRenew() },
      ]
    );
  };

  // --- UI: OPEN EDIT ---
  const handleEditPress = (item: any) => {
    setEditId(item.id);
    setFormData({
      service_name: item.service_name,
      amount: item.amount.toString(),
      billing_cycle: item.billing_cycle,
      category: item.category,
      start_date: new Date(item.start_date),
      description: item.description || '',
      reminder_schedule: item.reminder_schedule || defaultReminderSchedule,
      manage_url: item.manage_url || ''
    });
    setIsFormVisible(true);
  };

  // --- API: SAVE ---
  const handleSave = async () => {
    const { service_name, amount, billing_cycle, category, start_date, description, reminder_schedule, manage_url } = formData;

    if (!service_name.trim() || !amount || !billing_cycle || !category) {
      Alert.alert("Required Fields", "Please fill in all mandatory fields (*)");
      return;
    }

    setIsActionLoading(true);
    try {
      const payload = {
        service_name: service_name.trim(),
        amount: parseFloat(amount),
        billing_cycle,
        category,
        start_date: start_date.toISOString().split('T')[0],
        description: description.trim(),
        reminder_schedule: reminder_schedule.trim() || defaultReminderSchedule,
        manage_url: manage_url.trim(),
        userId: user?.id
      };

      if (editId) {
        await axios.put(`${API_BASE_URL}/api/subscriptions/${editId}`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Alert.alert("Updated", "Subscription updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/subscriptions/add`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Alert.alert("Success", "Subscription added!");
      }

      setIsFormVisible(false);
      resetForm();
      fetchSubscriptions();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Operation failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ service_name: '', amount: '', billing_cycle: '', category: '', start_date: new Date(), description: '', reminder_schedule: defaultReminderSchedule, manage_url: '' });
  };

  const openPicker = (title: string, options: string[], field: string) => {
    setPickerData({ title, options, field });
    setPickerVisible(true);
  };

  // --- UI HELPERS ---
  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || 'active';
    if (s === 'active') return { bg: '#D4EFDF', text: '#27AE60' };
    if (s === 'due soon') return { bg: '#FCF3CF', text: '#F1C40F' };
    return { bg: '#FADBD8', text: '#E74C3C' };
  };

  const availableCategories = Array.from(
    new Set(subscriptions.map((s) => s.category).filter(Boolean))
  ).sort();

  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch = s.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const SubscriptionCard = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {sharing.bulkShareMode && isPremium && (
            <TouchableOpacity style={shareCardStyles.checkbox} onPress={() => sharing.toggleSelect(item.id)}>
              <Ionicons
                name={sharing.selectedIds.has(item.id) ? 'checkbox' : 'square-outline'}
                size={22}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.service_name}</Text>
            <View style={styles.catBadge}><Text style={styles.catBadgeText}>{item.category}</Text></View>
          </View>
          <View style={styles.cardActions}>
            {isPremium && !sharing.bulkShareMode && (
              <TouchableOpacity
                style={shareCardStyles.cardShareBtn}
                onPress={() =>
                  sharing.openShare([{ itemType: 'subscription', itemId: item.id, label: item.service_name }])
                }
              >
                <Ionicons name="share-social-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {!sharing.bulkShareMode && (
              <>
                <TouchableOpacity onPress={() => handleEditPress(item)} style={styles.actionIcon}>
                  <Ionicons name="create-outline" size={22} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.service_name)} style={styles.actionIcon}>
                  <Ionicons name="trash-outline" size={22} color="#E74C3C" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Amount</Text><Text style={styles.infoValue}>Rs. {item.amount} / {item.billing_cycle}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Next Billing</Text><Text style={styles.infoValue}>{formatDate(item.next_billing_date || item.start_date)}</Text></View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.statusBox, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{item.status || 'Active'}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.renewBtn, item.status !== 'Active' && styles.renewBtnOverdue]}
          onPress={() => handleRenew(item.id, item.service_name, item.manage_url)}
          disabled={item.status === 'Active'}
        >
          <Text style={[styles.renewText, item.status !== 'Active' && { color: 'white' }]}>
            {item.status === 'Active' ? 'Renew' : 'Renew Now'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (authLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <Header />

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Subscriptions</Text>
          <ShareHeaderActions
            isPremium={isPremium}
            bulkShareMode={sharing.bulkShareMode}
            selectedCount={sharing.selectedIds.size}
            onBulkShare={() =>
              sharing.handleBulkShare(
                () =>
                  filteredSubscriptions
                    .filter((s) => sharing.selectedIds.has(s.id))
                    .map((s) => ({ itemType: 'subscription' as const, itemId: s.id, label: s.service_name })),
                'Select at least one subscription.'
              )
            }
            onEnterBulkMode={() => sharing.setBulkShareMode(true)}
            onExitBulkMode={sharing.exitBulkMode}
            addButton={
              <TouchableOpacity onPress={() => { resetForm(); setIsFormVisible(true); }}>
                <Ionicons name="add-circle" size={42} color={COLORS.primary} />
              </TouchableOpacity>
            }
          />
        </View>
        <SharePageNotices
          isFree={isFree}
          shareNotice={sharing.shareNotice}
          upgradeTitle="Sharing mode"
          upgradeDescription="Upgrade to Premium to share subscription reminders with other Trakkit users."
        />
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            placeholder="Search Subscriptions"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {availableCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowContent}
          >
            {['All', ...availableCategories].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                onPress={() => setCategoryFilter(cat)}
              >
                <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredSubscriptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <SubscriptionCard item={item} />}
          contentContainerStyle={{ paddingBottom: 120 }} // Prevents overlapping with Nav bar
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchSubscriptions(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="card-search-outline" size={100} color="#D1D1D1" />
              <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
              <TouchableOpacity style={styles.mainActionBtn} onPress={() => setIsFormVisible(true)}>
                <Text style={styles.mainActionText}>+ Add Your First Subscription</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* --- ADD/EDIT MODAL --- */}
      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>{editId ? "Edit Subscription" : "New Subscription"}</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}><Ionicons name="close" size={26} color="black" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FormInput label="Service Name" placeholder="Netflix..." value={formData.service_name} onChangeText={(t: string) => setFormData({ ...formData, service_name: t })} />
              <View style={styles.formRow}>
                <FormInput label="Amount" placeholder="0" containerStyle={{ flex: 1, marginRight: 10 }} keyboardType="decimal-pad" value={formData.amount} onChangeText={(t: string) => setFormData({ ...formData, amount: t })} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Billing Cycle</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Select Cycle', billingCycles, 'billing_cycle')}>
                    <Text style={{ color: formData.billing_cycle ? '#333' : '#999', fontSize: 14 }}>{formData.billing_cycle || "Select One"}</Text>
                    <Ionicons name="chevron-down" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Select Category', categories, 'category')}>
                <Text style={{ color: formData.category ? '#333' : '#999', fontSize: 14 }}>{formData.category || "Select One"}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
              <Text style={styles.inputLabel}>First Billing Date</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDatePicker(true)}>
                <Text>{formatDate(formData.start_date)}</Text>
                <Ionicons name="calendar-outline" size={18} color="#666" />
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={formData.start_date} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, start_date: d }); }} />}
              <FormInput label="Remind me (days before)" placeholder="e.g. 7,3,1" value={formData.reminder_schedule} onChangeText={(t: string) => setFormData({ ...formData, reminder_schedule: t })} />
              <FormInput label="Description" placeholder="Add a note..." value={formData.description} onChangeText={(t: string) => setFormData({ ...formData, description: t })} multiline={true} numberOfLines={3} />
              <FormInput label="Manage / billing link" placeholder="https://… (provider account: pay, change plan, or cancel)" value={formData.manage_url} onChangeText={(t: string) => setFormData({ ...formData, manage_url: t })} keyboardType="url" autoCapitalize="none" />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={isActionLoading}>
                {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{editId ? "Update" : "Save"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- PICKER MODAL --- */}
      <Modal visible={pickerVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeader}>{pickerData.title}</Text>
            {pickerData.options.map((opt) => (
              <TouchableOpacity key={opt} style={styles.pickerItem} onPress={() => { setFormData({ ...formData, [pickerData.field]: opt }); setPickerVisible(false); }}>
                <Text style={[styles.pickerItemText, (formData as any)[pickerData.field] === opt && { color: COLORS.primary, fontWeight: 'bold' }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {token ? (
        <ShareModal
          visible={sharing.shareModalVisible}
          onClose={sharing.closeShareModal}
          items={sharing.shareItems}
          token={token}
          title="Share subscription"
          onSuccess={sharing.showShareSuccess}
        />
      ) : null}
    </SafeAreaView>
  );
}

const FormInput = ({ label, placeholder, value, onChangeText, containerStyle, keyboardType, multiline, numberOfLines, autoCapitalize }: any) => (
  <View style={[styles.inputGroup, containerStyle]}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
      <TextInput placeholder={placeholder} style={[styles.textInput, multiline && { textAlignVertical: 'top', width: '100%' }]} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor="#B0B0B0" multiline={multiline} numberOfLines={numberOfLines} autoCapitalize={autoCapitalize} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, marginTop: 15, height: 45, borderWidth: 1, borderColor: '#DDD' },
  searchInput: { flex: 1, marginLeft: 10 },
  filterRow: { marginTop: 12 },
  filterRowContent: { gap: 8, paddingRight: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#DDD' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  filterChipTextActive: { color: 'white' },
  card: {
    backgroundColor: 'white', borderRadius: 15, padding: 16, marginHorizontal: 20, marginBottom: 15, elevation: 3, ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  catBadge: { backgroundColor: '#FADBD8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 4, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: 11, color: '#E74C3C', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row' },
  actionIcon: { marginLeft: 15 },
  cardContent: { marginVertical: 12 },
  cardDescription: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { fontSize: 13, color: '#7F8C8D' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#2C3E50' },
  statusBox: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  renewBtn: { width: '100%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#D5D8DC', alignItems: 'center' },
  renewBtnOverdue: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
  renewText: { fontWeight: 'bold', color: '#7F8C8D' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#AAB7B8', marginTop: 15, marginBottom: 25 },
  mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, width: '80%', alignItems: 'center' },
  mainActionText: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalHeaderText: { fontSize: 20, fontWeight: 'bold' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15, height: 50, justifyContent: 'center' },
  dropdownTrigger: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15, height: 50, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  textInput: { fontSize: 14, color: '#333' },
  formRow: { flexDirection: 'row' },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: 'white', fontWeight: 'bold' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: 'white', width: '85%', borderRadius: 15, paddingVertical: 10 },
  pickerHeader: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  pickerItem: { paddingVertical: 15, alignItems: 'center' },
  pickerItemText: { fontSize: 15, color: '#333' }
});