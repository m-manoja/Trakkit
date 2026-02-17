import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Modal, ScrollView, ActivityIndicator, Alert, FlatList, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';

export default function WarrantyScreen() {
  const { user, loading: authLoading } = useAuth();
  const token = user?.token;
  const API_BASE_URL = 'http://10.43.147.38:5000';

  const [warranties, setWarranties] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerData, setPickerData] = useState({ title: '', options: [] as string[], field: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const categories = ['Electronics', 'Appliances', 'Furniture', 'Vehicles', 'Other'];
  const durations = ['6', '12', '18', '24', '36', '48', '60'];

  const [formData, setFormData] = useState({
    product_name: '',
    purchase_place: '',
    warranty_period: '12',
    category: '',
    purchase_date: new Date(),
    expiry_date: '',
    description: '',
    selectedFile: null as any,
    existingUrl: null as string | null,
    existingFileName: '',
    fileAction: 'replace' as 'replace' | 'keep'
  });

  // --- AUTO-CALCULATE EXPIRY PREVIEW ---
  useEffect(() => {
    const calculateExpiry = () => {
      const purchase = new Date(formData.purchase_date);
      const months = parseInt(formData.warranty_period) || 0;
      const expiry = new Date(purchase.setMonth(purchase.getMonth() + months));
      setFormData(prev => ({ ...prev, expiry_date: expiry.toLocaleDateString() }));
    };
    calculateExpiry();
  }, [formData.purchase_date, formData.warranty_period]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setFormData(prev => ({ ...prev, selectedFile: result.assets[0] }));
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const fetchWarranties = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/warranties/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setWarranties(response.data.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, user?.id]);

  useEffect(() => { fetchWarranties(); }, [fetchWarranties]);

  const handleSave = async () => {
    const { product_name, purchase_place, warranty_period, category, purchase_date, description, selectedFile, fileAction } = formData;

    if (!product_name || !purchase_place || !category) {
      Alert.alert("Required Fields", "Please fill in all mandatory fields (*)");
      return;
    }

    setIsActionLoading(true);
    const data = new FormData();
    data.append('product_name', product_name);
    data.append('purchase_place', purchase_place);
    data.append('warranty_period', warranty_period);
    data.append('category', category);
    data.append('purchase_date', purchase_date.toISOString().split('T')[0]);
    data.append('description', description || '');
    data.append('fileAction', fileAction);

    if (selectedFile) {
      const fileToUpload: any = {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      };
      data.append('document', fileToUpload);
    }

    try {
      const config = {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      };

      if (editId) {
        await axios.put(`${API_BASE_URL}/api/warranties/${editId}`, data, config);
        Alert.alert("Success", "Warranty updated successfully");
      } else {
        await axios.post(`${API_BASE_URL}/api/warranties/add`, data, config);
        Alert.alert("Success", "New warranty saved successfully");
      }
      setIsFormVisible(false);
      resetForm();
      fetchWarranties();
    } catch (error: any) {
      Alert.alert("Error", "Failed to save. Ensure backend is running.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditPress = (item: any) => {
    setEditId(item.id);
    const fileName = item.document_url ? item.document_url.split('/').pop().split('?')[0] : '';
    setFormData({
      product_name: item.product_name,
      purchase_place: item.purchase_place,
      warranty_period: item.warranty_period.toString(),
      category: item.category,
      purchase_date: new Date(item.purchase_date),
      expiry_date: new Date(item.expiry_date).toLocaleDateString(),
      description: item.description || '',
      selectedFile: null,
      existingUrl: item.document_url,
      existingFileName: fileName,
      fileAction: 'replace'
    });
    setIsFormVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Warranty",
      "Are you sure you want to permanently remove this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/api/warranties/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              // Re-fetch the list so the card disappears
              fetchWarranties();
            } catch (error) {
              Alert.alert("Error", "Could not delete. Please try again.");
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      product_name: '', purchase_place: '', warranty_period: '12',
      category: '', purchase_date: new Date(), expiry_date: '',
      description: '', selectedFile: null, existingUrl: null,
      existingFileName: '', fileAction: 'replace'
    });
  };

  const openPicker = (title: string, options: string[], field: string) => {
    setPickerData({ title, options, field });
    setPickerVisible(true);
  };

  const WarrantyCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.product_name}</Text>
          <View style={[styles.catBadge, { backgroundColor: '#FADBD8' }]}><Text style={[styles.catBadgeText, { color: COLORS.primary }]}>{item.category}</Text></View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleEditPress(item)}><Ionicons name="create-outline" size={22} color="#555" /></TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={22} color="#E74C3C" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContent}>
        <DetailRow label="Purchase from" value={item.purchase_place} />
        <DetailRow label="Expiry Date" value={new Date(item.expiry_date).toLocaleDateString()} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Warranty Document</Text>
          {item.document_url ? (
            <View style={styles.docActions}>
              <TouchableOpacity style={styles.docIconBtn} onPress={() => Linking.openURL(item.document_url)}>
                <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                <Text style={styles.docLinkText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.docIconBtn, { marginLeft: 8 }]} onPress={() => Linking.openURL(item.document_url)}>
                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                <Text style={styles.docLinkText}>Download</Text>
              </TouchableOpacity>
            </View>
          ) : <Text style={styles.noFileText}>No file</Text>}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={[styles.statusBox, { backgroundColor: item.status === 'Expired' ? '#FADBD8' : '#D4EFDF' }]}>
            <Text style={[styles.statusText, { color: item.status === 'Expired' ? '#E74C3C' : '#27AE60' }]}>{item.status || 'Active'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.renewBtn, { borderColor: COLORS.primary }]}><Text style={[styles.renewBtnText, { color: COLORS.primary }]}>Claim Warranty</Text></TouchableOpacity>
    </View>
  );


  if (authLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
          <View><Text style={styles.logoText}>Trakkit</Text><Text style={styles.greetingText}>Hello, {user?.firstName || 'User'}!</Text></View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="diamond" size={22} color="#70d8ff" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="notifications-outline" size={24} color="white" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="person-circle-outline" size={24} color="white" /></TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: COLORS.textPrimary }]}>Warranty</Text>
          <TouchableOpacity onPress={() => { resetForm(); setIsFormVisible(true); }}><Ionicons name="add-circle" size={42} color={COLORS.primary} /></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={warranties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WarrantyCard item={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchWarranties(); }} />}
      />

      <Modal visible={isFormVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>{editId ? 'Edit Warranty' : 'New Warranty'}</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}><Ionicons name="close" size={26} color="black" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FormInput label="Product Name" placeholder="E.g Samsung TV" value={formData.product_name} onChangeText={(t: string) => setFormData({ ...formData, product_name: t })} />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Duration (Months)</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Duration', durations, 'warranty_period')}>
                    <Text>{formData.warranty_period} months</Text>
                    <Ionicons name="chevron-expand" size={18} color="black" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => openPicker('Category', categories, 'category')}>
                    <Text>{formData.category || "Select"}</Text>
                    <Ionicons name="chevron-down" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>Purchase Date</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowDatePicker(true)}>
                <Text>{formData.purchase_date.toLocaleDateString()}</Text>
                <Ionicons name="calendar" size={18} color="#666" />
              </TouchableOpacity>

              <FormInput label="Purchase place" placeholder="E.g - Amazon" value={formData.purchase_place} onChangeText={(t: string) => setFormData({ ...formData, purchase_place: t })} />

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Warranty Document</Text>
                <View style={styles.fileStatusContainer}>
                  <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={pickDocument}>
                    <Ionicons name="document-attach" size={24} color={COLORS.primary} />
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {formData.selectedFile ? formData.selectedFile.name : formData.existingUrl ? `Current: ${formData.existingFileName}` : "Upload Document"}
                    </Text>
                  </TouchableOpacity>
                  {formData.existingUrl && !formData.selectedFile && (
                    <TouchableOpacity style={styles.viewFileBtn} onPress={() => Linking.openURL(formData.existingUrl!)}>
                      <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {formData.selectedFile && formData.existingUrl && (
                  <View style={styles.choiceContainer}>
                    <Text style={styles.choiceTitle}>Document exists. Choose action:</Text>
                    <View style={styles.choiceRow}>
                      <TouchableOpacity style={[styles.choiceBtn, formData.fileAction === 'replace' && styles.choiceBtnActive]} onPress={() => setFormData({ ...formData, fileAction: 'replace' })}>
                        <Text style={[styles.choiceBtnText, formData.fileAction === 'replace' && styles.choiceBtnTextActive]}>Replace Old</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.choiceBtn, formData.fileAction === 'keep' && styles.choiceBtnActive]} onPress={() => setFormData({ ...formData, fileAction: 'keep' })}>
                        <Text style={[styles.choiceBtnText, formData.fileAction === 'keep' && styles.choiceBtnTextActive]}>Keep Both</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <FormInput label="Description (Optional)" placeholder="Add notes..." value={formData.description} onChangeText={(t: string) => setFormData({ ...formData, description: t })} multiline={true} numberOfLines={3} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.primary }]} onPress={handleSave}>
                  {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{editId ? 'Update Warranty' : 'Save Warranty'}</Text>}
                </TouchableOpacity>
              </View>

              {showDatePicker && <DateTimePicker value={formData.purchase_date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, purchase_date: d }); }} />}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            {pickerData.options.map((opt) => (
              <TouchableOpacity key={opt} style={styles.pickerItem} onPress={() => { setFormData({ ...formData, [pickerData.field]: opt }); setPickerVisible(false); }}>
                <Text>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value }: any) => (
  <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
);

const FormInput = ({ label, placeholder, value, onChangeText, multiline, numberOfLines }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
      <TextInput placeholder={placeholder} style={[styles.textInput, multiline && { width: '100%', textAlignVertical: 'top' }]} value={value} onChangeText={onChangeText} multiline={multiline} numberOfLines={numberOfLines} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F4F4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 15 },
  logoText: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  greetingText: { fontSize: 12, color: '#FFD1DC' },
  subHeader: { paddingHorizontal: 20, marginTop: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 16, marginHorizontal: 20, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 4, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: 11, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row' },
  cardContent: { marginVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#555' },
  infoValue: { fontSize: 13, fontWeight: '600' },
  noFileText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  docActions: { flexDirection: 'row' },
  docIconBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F7F6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#DDD' },
  docLinkText: { fontSize: 11, color: COLORS.primary, marginLeft: 3, fontWeight: '600' },
  statusBox: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 5 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  renewBtn: { width: '100%', paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  renewBtnText: { fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalHeaderText: { fontSize: 20, fontWeight: 'bold' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 12, height: 45, justifyContent: 'center' },
  dropdownTrigger: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 12, height: 45, alignItems: 'center', justifyContent: 'space-between' },
  textInput: { fontSize: 14, color: '#333' },
  formRow: { flexDirection: 'row' },
  fileStatusContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 8 },
  fileNameText: { marginLeft: 10, fontSize: 13, color: '#333', flex: 1 },
  viewFileBtn: { padding: 5, backgroundColor: '#f0f0f0', borderRadius: 5 },
  choiceContainer: { marginTop: 10, padding: 10, backgroundColor: '#F9F9F9', borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  choiceTitle: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 6 },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  choiceBtn: { width: '48%', paddingVertical: 6, borderRadius: 5, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center' },
  choiceBtnActive: { backgroundColor: COLORS.primary },
  choiceBtnText: { fontSize: 11, color: COLORS.primary, fontWeight: 'bold' },
  choiceBtnTextActive: { color: 'white' },
  modalActions: { marginTop: 25, alignItems: 'center' },
  submitBtn: { width: '100%', height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { backgroundColor: 'white', width: '80%', borderRadius: 10, padding: 10 },
  pickerItem: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' }
});