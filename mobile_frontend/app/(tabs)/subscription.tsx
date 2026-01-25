import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Modal, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function SubscriptionInitial() {
  const { user, loading: authLoading } = useAuth();
  const token = user?.token;

  // UI States
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerData, setPickerData] = useState({ title: '', options: [] as string[], field: '' });

  // Options
  const billingCycles = ['Weekly', 'Monthly', 'Yearly'];
  const categories = ['Entertainment', 'Productivity', 'Cloud Storage', 'Software', 'Fitness', 'Education', 'Other'];

  // Form State
  const [formData, setFormData] = useState({
    service_name: '',
    amount: '',
    billing_cycle: '',
    category: '',
    start_date: new Date(),
    description: ''
  });

  const openPicker = (title: string, options: string[], field: string) => {
    setPickerData({ title, options, field });
    setPickerVisible(true);
  };

  const handleSave = async () => {
    const { service_name, amount, billing_cycle, category, start_date, description } = formData;

    if (!service_name.trim()) {
      Alert.alert("Required Field", "Please enter the Service Name.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric amount.");
      return;
    }

    if (!billing_cycle) {
      Alert.alert("Required Field", "Please select a Billing Cycle.");
      return;
    }
    if (!category) {
      Alert.alert("Required Field", "Please select a Category.");
      return;
    }

    if (!token) {
      Alert.alert("Session Error", "Please log out and log back in to refresh your session.");
      return;
    }

    setIsActionLoading(true);

    try {
      // Use your local IP for physical device testing
      const API_BASE_URL = 'http://10.43.147.38:5000';

      const payload = {
        service_name: service_name.trim(),
        amount: parseFloat(amount),
        billing_cycle,
        category,
        start_date: start_date.toISOString().split('T')[0],
        description: description.trim(),
        userId: user?.id // Matches your new DB column name
      };

      await axios.post(`${API_BASE_URL}/api/subscriptions/add`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      Alert.alert("Success", `${service_name} has been added!`);

      // Reset and Close
      setIsFormVisible(false);
      setFormData({
        service_name: '',
        amount: '',
        billing_cycle: '',
        category: '',
        start_date: new Date(),
        description: ''
      });

    } catch (error: any) {
      const serverMsg = error.response?.data?.message || "Failed to connect to server.";
      console.error("Save Error:", serverMsg);
      Alert.alert("Error", serverMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // If AuthContext is still loading from AsyncStorage, show a spinner
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
          <View style={styles.branding}>
            <Text style={styles.logoText}>Trakkit</Text>
            <Text style={styles.greetingText}>Hello, {user?.firstName || 'User'}!</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="person-circle-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Subscriptions</Text>
          <TouchableOpacity onPress={() => setIsFormVisible(true)}>
            <Ionicons name="add-circle" size={42} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Initial Empty View */}
      <View style={styles.emptyContent}>
        <MaterialCommunityIcons name="card-search-outline" size={100} color="#D1D1D1" />
        <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
        <TouchableOpacity style={styles.mainActionBtn} onPress={() => setIsFormVisible(true)}>
          <Text style={styles.mainActionText}>+ Add Your First Subscription</Text>
        </TouchableOpacity>
      </View>

      {/* --- ADD SUBSCRIPTION MODAL --- */}
      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>New Subscription</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                <Ionicons name="close" size={26} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FormInput
                label="Service Name"
                placeholder="Netflix, Spotify, Gym..."
                value={formData.service_name}
                onChangeText={(t: string) => setFormData({ ...formData, service_name: t })}
              />

              <View style={styles.formRow}>
                <FormInput
                  label="Amount"
                  placeholder="0"
                  containerStyle={{ flex: 1, marginRight: 10 }}
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(t: string) => setFormData({ ...formData, amount: t })}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Billing Cycle</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Select Cycle', billingCycles, 'billing_cycle')}>
                    <Text>{formData.billing_cycle}</Text>
                    <Text style={[
                      styles.pickerItemText, 
                      { color: formData.billing_cycle ? '#333' : '#999' }
                    ]}>
                      {formData.billing_cycle ? formData.billing_cycle : "Select One"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
                
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Select Category', categories, 'category')}>
                <Text>{formData.category}</Text>
                <Text style={[
                  styles.pickerItemText, 
                  { color: formData.category ? '#333' : '#999' }
                ]}>
                  {formData.category ? formData.category : "Select One"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>First Billing Date</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDatePicker(true)}>
                <Text>{formData.start_date.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={18} color="#666" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.start_date}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    setShowDatePicker(false);
                    if (d) setFormData({ ...formData, start_date: d });
                  }}
                />
              )}

              <FormInput
                label="Description (Optional)"
                placeholder="Add a note..."
                value={formData.description}
                onChangeText={(t: string) => setFormData({ ...formData, description: t })}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={isActionLoading}>
                  {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Save Subscription</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- CUSTOM PICKER MODAL --- */}
      <Modal visible={pickerVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerHeader}>{pickerData.title}</Text>
            {pickerData.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.pickerItem}
                onPress={() => { setFormData({ ...formData, [pickerData.field]: opt }); setPickerVisible(false); }}
              >
                <Text style={[
                  styles.pickerItemText,
                  (formData as any)[pickerData.field] === opt && { color: COLORS.primary, fontWeight: 'bold' }
                ]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable Input Component
const FormInput = ({ label, placeholder, value, onChangeText, containerStyle, keyboardType, multiline, numberOfLines }: any) => (
  <View style={[styles.inputGroup, containerStyle]}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
      <TextInput
        placeholder={placeholder}
        style={[styles.textInput, multiline && { textAlignVertical: 'top', width: '100%' }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#B0B0B0"
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 20, elevation: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  branding: { justifyContent: 'center' },
  logoText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  greetingText: { fontSize: 13, color: '#FFD1DC', marginTop: -2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 15 },
  subHeader: { paddingHorizontal: 20, marginTop: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 50 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15 },
  mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  mainActionText: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#F9F4F4', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalHeaderText: { fontSize: 20, fontWeight: 'bold' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15, height: 50, justifyContent: 'center' },
  dropdownTrigger: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15, height: 50, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  textInput: { fontSize: 14, color: '#333' },
  formRow: { flexDirection: 'row' },
  modalActions: { marginTop: 10 },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: 'white', width: '85%', borderRadius: 15, paddingVertical: 10, elevation: 5 },
  pickerHeader: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  pickerItem: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerItemText: { fontSize: 15, color: '#333' }
});