import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../src/utils/dateFormat';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  StatusBar, Modal, ScrollView, ActivityIndicator, Alert, FlatList, RefreshControl, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../../src/theme/colors';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { usePlan } from '../../src/hooks/usePlan';
import { useItemSharing } from '../../src/hooks/useItemSharing';
import { API_BASE_URL } from '../../src/api/config';
import { getNotificationSettings } from '../../src/api/users';
import Header from '../../src/components/Header';
import ShareModal from '../../src/components/ShareModal';
import { ShareHeaderActions, SharePageNotices, shareCardStyles } from '../../src/components/SharePageHeader';

type PremiumUsage = {
  plan: 'free' | 'premium';
  document_count: number;
  document_limit: number | null;
  is_premium: boolean;
};

export default function WarrantyScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, isFree } = usePlan();
  const token = user?.token;
  const sharing = useItemSharing(isPremium, token);

  const [warranties, setWarranties] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [usage, setUsage] = useState<PremiumUsage | null>(null);
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
    fileAction: 'replace' as 'replace' | 'keep',
    reminder_schedule: ''
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState('7,3,1');

  // --- AUTO-CALCULATE EXPIRY PREVIEW ---
  useEffect(() => {
    const calculateExpiry = () => {
      const purchase = new Date(formData.purchase_date);
      const months = parseInt(formData.warranty_period) || 0;
      const expiry = new Date(purchase.setMonth(purchase.getMonth() + months));
      setFormData(prev => ({ ...prev, expiry_date: formatDate(expiry) }));
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

  const fetchUsage = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/payment/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsage(response.data?.data ?? null);
    } catch {
      setUsage(null);
    }
  }, [token]);

  useEffect(() => { 
    fetchWarranties();
    fetchUsage();
    
    // Fetch global notification settings for the default reminder schedule
    if (token) {
      getNotificationSettings(token).then(res => {
        if (res.data?.reminder_schedule) {
          setDefaultReminderSchedule(res.data.reminder_schedule);
        }
      }).catch(err => console.log('Failed to fetch default settings:', err));
    }
  }, [fetchWarranties, fetchUsage, token]);

  const handleSave = async () => {
    const { product_name, purchase_place, warranty_period, category, purchase_date, description, selectedFile, fileAction, reminder_schedule } = formData;

    if (!product_name || !purchase_place || !category) {
      Alert.alert("Required Fields", "Please fill in all mandatory fields (*)");
      return;
    }

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (purchase_date > todayEnd) {
      Alert.alert("Invalid Date", "Purchase date cannot be in the future. Please enter the actual purchase date.");
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
    data.append('reminder_schedule', reminder_schedule.trim() || defaultReminderSchedule);
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
      fetchUsage();
    } catch (error: any) {
      // Check if backend rejected due to freemium document limit
      const errorCode = error?.response?.data?.error_code;
      const currentCount = error?.response?.data?.current_count;

      if (error?.response?.status === 403 && errorCode === 'DOCUMENT_LIMIT_REACHED') {
        setIsFormVisible(false);
        const limit = error?.response?.data?.limit ?? 10;
        const count = error?.response?.data?.current_count ?? currentCount ?? limit;
        Alert.alert(
          'Free plan upload limit reached',
          `You already used ${count}/${limit} document uploads.\n\nUpgrade to Premium for unlimited uploads.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'View plans', onPress: () => router.push('/pricing') },
          ]
        );
        fetchUsage();
      } else {
        Alert.alert("Error", "Failed to save. Ensure backend is running.");
      }
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
      expiry_date: formatDate(item.expiry_date),
      description: item.description || '',
      selectedFile: null,
      existingUrl: item.document_url,
      existingFileName: fileName,
      fileAction: 'replace',
      reminder_schedule: item.reminder_schedule || defaultReminderSchedule
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
              fetchWarranties();
              fetchUsage();
            } catch (error) {
              Alert.alert("Error", "Could not delete. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleClaim = (item: any) => {
    Alert.alert(
      "Claim Warranty",
      `Are you sure you want to claim the warranty for "${item.product_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          style: "default",
          onPress: async () => {
            try {
              await axios.patch(`${API_BASE_URL}/api/warranties/${item.id}/claim`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              fetchWarranties();
              fetchUsage();
            } catch (error: any) {
              const msg = error?.response?.data?.message || "Could not claim warranty. Please try again.";
              Alert.alert("Error", msg);
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
      existingFileName: '', fileAction: 'replace', reminder_schedule: defaultReminderSchedule
    });
  };

  const handleDownload = async (url: string) => {
    if (!url) return;
    
    const firstUrl = url.split(',')[0].trim();
    
    try {
      setIsActionLoading(true);
      const filename = firstUrl.split('/').pop()?.split('?')[0] || 'warranty_document.pdf';
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const downloadRes = await FileSystem.downloadAsync(firstUrl, fileUri);
      
      if (downloadRes.status === 200) {
        if (Platform.OS === 'android') {
          // Check if we already have a saved directory URI
          let directoryUri = await AsyncStorage.getItem('download_directory_uri');
          
          // Verify if we still have access to this directory by probing it
          if (directoryUri) {
            try {
              await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
            } catch {
              // Permission was revoked or URI is stale — reset so we ask again
              directoryUri = null;
              await AsyncStorage.removeItem('download_directory_uri');
            }
          }

          // If no directory saved or not accessible, ask the user (Only once!)
          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('download_directory_uri', directoryUri);
            } else {
              setIsActionLoading(false);
              return;
            }
          }

          if (directoryUri) {
            const base64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
            
            try {
              const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                directoryUri,
                filename,
                mimeType
              );
              
              await FileSystem.writeAsStringAsync(newFileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              Alert.alert("Success", "Warranty document saved successfully to your chosen folder!");
            } catch (e) {
              // If write fails, maybe the uri is stale, reset it
              await AsyncStorage.removeItem('download_directory_uri');
              Alert.alert("Error", "Could not save file. Please try again and re-select the folder.");
            }
          }
        } else {
          // On iOS, use sharing (Standard way to Save to Files)
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadRes.uri);
          } else {
            Alert.alert("Success", "File downloaded successfully.");
          }
        }
      } else {
        Alert.alert("Error", "Failed to download file from server.");
      }
    } catch (error) {
      console.error("Download Error:", error);
      Alert.alert("Error", "An unexpected error occurred during download.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleView = (url: string) => {
    if (!url) return;
    const firstUrl = url.split(',')[0].trim();
    Linking.openURL(firstUrl);
  };

  const openPicker = (title: string, options: string[], field: string) => {
    setPickerData({ title, options, field });
    setPickerVisible(true);
  };

  const filteredWarranties = warranties.filter((w) =>
    w.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const WarrantyCard = ({ item }: { item: any }) => {
    const isClaimed = item.status === 'Claimed';
    const isExpired = item.status === 'Expired';
    const isDisabled = isClaimed || isExpired;

    const statusBgColor = isClaimed ? '#EDE9FE' : isExpired ? '#FADBD8' : '#D4EFDF';
    const statusTextColor = isClaimed ? '#5B21B6' : isExpired ? '#E74C3C' : '#27AE60';

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
            <Text style={styles.cardTitle}>{item.product_name}</Text>
            <View style={[styles.catBadge, { backgroundColor: '#FADBD8' }]}><Text style={[styles.catBadgeText, { color: COLORS.primary }]}>{item.category}</Text></View>
          </View>
          <View style={styles.cardActions}>
            {isPremium && !sharing.bulkShareMode && (
              <TouchableOpacity
                style={shareCardStyles.cardShareBtn}
                onPress={() =>
                  sharing.openShare([{ itemType: 'warranty', itemId: item.id, label: item.product_name }])
                }
              >
                <Ionicons name="share-social-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {!sharing.bulkShareMode && (
              <>
                <TouchableOpacity onPress={() => handleEditPress(item)}><Ionicons name="create-outline" size={22} color="#555" /></TouchableOpacity>
                <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={22} color="#E74C3C" /></TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <DetailRow label="Purchase from" value={item.purchase_place} />
          <DetailRow label="Expiry Date" value={formatDate(item.expiry_date)} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Warranty Document</Text>
            {item.document_url ? (
              <View style={styles.docActions}>
                <TouchableOpacity style={styles.docIconBtn} onPress={() => handleView(item.document_url)}>
                  <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.docLinkText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.docIconBtn, { marginLeft: 8 }]} onPress={() => handleDownload(item.document_url)}>
                  <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.docLinkText}>Download</Text>
                </TouchableOpacity>
              </View>
            ) : <Text style={styles.noFileText}>No file</Text>}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.statusBox, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.statusText, { color: statusTextColor }]}>{item.status || 'Active'}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.renewBtn, { borderColor: isDisabled ? '#D1D5DB' : COLORS.primary, backgroundColor: isDisabled ? '#F9FAFB' : 'transparent', opacity: isDisabled ? 0.6 : 1 }]}
          onPress={() => handleClaim(item)}
          disabled={isDisabled}
        >
          <Text style={[styles.renewBtnText, { color: isDisabled ? '#9CA3AF' : COLORS.primary }]}>
            {isClaimed ? '✓ Claimed' : 'Claim Warranty'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };


  if (authLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Header />

      <View style={styles.subHeader}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: COLORS.textPrimary }]}>Warranty</Text>
          <ShareHeaderActions
            isPremium={isPremium}
            bulkShareMode={sharing.bulkShareMode}
            selectedCount={sharing.selectedIds.size}
            onBulkShare={() =>
              sharing.handleBulkShare(
                () =>
                  filteredWarranties
                    .filter((w) => sharing.selectedIds.has(w.id))
                    .map((w) => ({ itemType: 'warranty' as const, itemId: w.id, label: w.product_name })),
                'Select at least one warranty.'
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
          upgradeDescription="Upgrade to Premium to share warranty reminders with other Trakkit users."
        />
        {usage?.document_limit != null && (
          <TouchableOpacity style={styles.usageBanner} onPress={() => router.push('/pricing')}>
            <Text style={styles.usageBannerText}>
              Documents: <Text style={styles.usageCount}>{usage.document_count}</Text> / {usage.document_limit}
            </Text>
            <Text style={styles.usageUpgradeText}>Upgrade for unlimited</Text>
          </TouchableOpacity>
        )}
        {usage?.is_premium && (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumBannerText}>Premium — unlimited document uploads</Text>
          </View>
        )}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            placeholder="Search Warranties"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredWarranties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WarrantyCard item={item} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchWarranties(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialCommunityIcons name="shield-search" size={100} color="#D1D1D1" />
            <Text style={styles.emptyTitle}>No Warranties Found</Text>
            <TouchableOpacity style={styles.mainActionBtn} onPress={() => setIsFormVisible(true)}>
              <Text style={styles.mainActionText}>+ Add Your First Warranty</Text>
            </TouchableOpacity>
          </View>
        }
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
                <Text>{formatDate(formData.purchase_date)}</Text>
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
                    <TouchableOpacity style={styles.viewFileBtn} onPress={() => handleView(formData.existingUrl!)}>
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

              <FormInput label="Remind me (days before)" placeholder="e.g. 30,14,7" value={formData.reminder_schedule} onChangeText={(t: string) => setFormData({ ...formData, reminder_schedule: t })} />
              
              <FormInput label="Description (Optional)" placeholder="Add notes..." value={formData.description} onChangeText={(t: string) => setFormData({ ...formData, description: t })} multiline={true} numberOfLines={3} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.primary }]} onPress={handleSave}>
                  {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>{editId ? 'Update Warranty' : 'Save Warranty'}</Text>}
                </TouchableOpacity>
              </View>

              {showDatePicker && <DateTimePicker value={formData.purchase_date} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, purchase_date: d }); }} />}
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

      {token ? (
        <ShareModal
          visible={sharing.shareModalVisible}
          onClose={sharing.closeShareModal}
          items={sharing.shareItems}
          token={token}
          title="Share warranty"
          onSuccess={sharing.showShareSuccess}
        />
      ) : null}

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
  subHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 20 },
  usageBanner: {
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#FFF6F8',
    borderWidth: 1,
    borderColor: '#F3D1DC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageBannerText: { color: '#7A2846', fontSize: 13, fontWeight: '600' },
  usageCount: { fontWeight: '800' },
  usageUpgradeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  premiumBanner: {
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  premiumBannerText: { color: '#065F46', fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: 'bold' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, marginTop: 15, height: 45, borderWidth: 1, borderColor: '#DDD' },
  searchInput: { flex: 1, marginLeft: 10 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 16, marginHorizontal: 20, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 4, alignSelf: 'flex-start' },
  catBadgeText: { fontSize: 11, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row' },
  cardContent: { marginVertical: 12 },
  cardDescription: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
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
  pickerItem: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#AAB7B8', marginTop: 15, marginBottom: 25 },
  mainActionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, width: '80%', alignItems: 'center' },
  mainActionText: { color: 'white', fontWeight: 'bold' },
});