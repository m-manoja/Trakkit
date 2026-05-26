import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  Platform, ScrollView, Dimensions, StatusBar, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { CustomInput } from '../../src/components/Input';
import { PrimaryButton } from '../../src/components/Button';
import { useAuth } from '../../src/context/AuthContext';
import { updateProfile, getProfile, uploadProfileImage, setBackupPassword } from '../../src/api/users';
import { sendEmailVerification } from '../../src/api/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ProfileSetupScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ isFirstSetup?: string }>();

  const [form, setForm] = useState({
    firstName: (user as any)?.firstName || '',
    lastName: (user as any)?.lastName || '',
    email: (user as any)?.email || '',
    dob: '',
    password: '',
    confirmPassword: '',
  });
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profileImage, setProfileImage] = useState<string | null>((user as any)?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // If isFirstSetup is passed as true, it's NOT editing. Otherwise, it is editing.
  const [isEditing, setIsEditing] = useState(params.isFirstSetup !== 'true');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch profile from server and pre-populate form with latest data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setFetching(false);
        return;
      }

      try {
        const profileData = await getProfile(user.id, user.token);
        if (profileData?.success && profileData?.data) {
          const d = profileData.data;

          setForm({
            firstName: d.first_name || (user as any)?.firstName || '',
            lastName: d.last_name || (user as any)?.lastName || '',
            email: d.email || (user as any)?.email || '',
            dob: d.date_of_birth || '',
            password: '',
            confirmPassword: '',
          });
          if (d.date_of_birth) setDate(new Date(d.date_of_birth));
          if (d.profile_picture) setProfileImage(d.profile_picture);
        }
      } catch (error) {
        // Silently fall back to data already in form from AuthContext
        console.warn('Could not fetch fresh profile:', error);
      } finally {
        setFetching(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!isEditing) {
      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (form.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      router.replace('/');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        userId: user.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        dob: form.dob,
      });

      // Also set the backup password using the registered email
      if (form.password) {
        await setBackupPassword(form.email.trim(), form.password, user.token);
      }

      const updatedUser = {
        ...user,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      };

      if (!isEditing) {
        // First-time setup: mark profile complete, trigger email verification
        await setUser({ ...updatedUser, profileCompleted: true, emailVerified: false });
        sendEmailVerification(user.token, form.email.trim()).catch(() => {});
        router.replace('/verify-email-pending' as any);
      } else {
        await setUser(updatedUser);
        Alert.alert('✓ Saved', 'Your profile has been updated.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Save Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';

      setUploadingImage(true);
      const { profileImageUrl } = await uploadProfileImage(asset.uri, mimeType, user!.token);
      setProfileImage(profileImageUrl);

      // Update context so profile page reflects immediately
      await setUser({ ...user!, profileImage: profileImageUrl } as any);

      Alert.alert('✓ Photo Updated', 'Your profile photo has been updated.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const initials = form.firstName
    ? `${form.firstName[0]}${form.lastName ? form.lastName[0] : ''}`.toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Fixed Header */}
      <View style={styles.header}>
        {isEditing ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Complete Your Profile'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Scrollable Body */}
      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickImage} activeOpacity={0.8} disabled={uploadingImage}>
          <View style={styles.avatarRing}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatar}>
                {fetching
                  ? <ActivityIndicator color={COLORS.primary} />
                  : <Text style={styles.avatarText}>{initials}</Text>
                }
              </View>
            )}
          </View>
          <View style={styles.cameraOverlay}>
            {uploadingImage
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={16} color="#fff" />
            }
          </View>
          <Text style={styles.avatarHint}>{uploadingImage ? 'Uploading…' : 'Change Photo'}</Text>
        </TouchableOpacity>

        {fetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Loading your profile…</Text>
          </View>
        ) : (
          <>
            {/* Personal Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <CustomInput
                    label="First Name"
                    placeholder="First name"
                    value={form.firstName}
                    onChangeText={(v) => onChange('firstName', v)}
                    autoCapitalize="words"
                  />
                  {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                </View>
                <View style={styles.halfField}>
                  <CustomInput
                    label="Last Name"
                    placeholder="Last name"
                    value={form.lastName}
                    onChangeText={(v) => onChange('lastName', v)}
                    autoCapitalize="words"
                  />
                  {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
                </View>
              </View>

              {/* Date of Birth */}
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.dateFieldText, !form.dob && styles.datePlaceholder]}>
                  {form.dob ? new Date(form.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Select date of birth'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contact Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: '#007AFF15' }]}>
                  <Ionicons name="mail-outline" size={18} color="#007AFF" />
                </View>
                <Text style={styles.cardTitle}>Contact Information</Text>
              </View>

              <CustomInput
                label={!isEditing ? "Email Address (Recovery Email)" : "Email Address"}
                placeholder="your@email.com"
                value={form.email}
                onChangeText={(v) => onChange('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              {!isEditing && (
                <>
                  <CustomInput
                    label="Account Recovery Password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChangeText={(v) => onChange('password', v)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    rightAccessory={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    }
                  />
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                  <CustomInput
                    label="Confirm Recovery Password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChangeText={(v) => onChange('confirmPassword', v)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    rightAccessory={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    }
                  />
                  {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                </>
              )}

              {/* Phone — read-only with change option */}
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.readonlyField}>
                <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.readonlyText}>{(user as any)?.phone || '—'}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/change_phone')}
                  style={styles.changePhoneBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changePhoneBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Button */}
            <View style={styles.saveBlock}>
              <PrimaryButton
                title={loading ? 'Saving…' : 'Save Changes'}
                onPress={handleSave}
                disabled={loading}
                loading={loading}
              />
            </View>
          </>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const formatted = selectedDate.toISOString().split('T')[0];
                setForm(prev => ({ ...prev, dob: formatted }));
                setDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 24,
    right: '32%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  halfField: {
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: -10,
    marginBottom: 8,
    marginLeft: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  dateFieldText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  datePlaceholder: {
    color: '#AAAAAA',
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9F9F9',
  },
  readonlyText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  changePhoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  changePhoneBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  saveBlock: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
