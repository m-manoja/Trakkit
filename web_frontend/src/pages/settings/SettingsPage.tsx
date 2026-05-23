import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import styles from "./SettingsPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../hooks/usePlan";
import PremiumUpgradeCard from "../../components/PremiumUpgradeCard/PremiumUpgradeCard";
import GoogleCalendarSync from "../../components/GoogleCalendarSync/GoogleCalendarSync";
import SharingSettings from "../../components/SharingSettings/SharingSettings";
import { Zap, Users } from "lucide-react";
import { 
  getProfile, 
  updateProfile, 
  getNotificationSettings, 
  updateNotificationSettings,
  initiatePhoneChange,
  verifyPhoneChange,
  uploadProfileImage,
  type UserProfile,
  type NotificationSettings
} from "../../api/users";
import { 
  User, 
  Bell, 
  Save, 
  Loader2, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Calendar,
  X
} from "lucide-react";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { isPremium } = usePlan();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "sharing" | "premium">("profile");
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  
  // Notifications state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [schedule, setSchedule] = useState("7,3,1");
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Phone Change Modal state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneModalStep, setPhoneModalStep] = useState<1 | 2>(1);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  
  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user?.id || !user?.token) return;

      try {
        setLoading(true);
        const [profileData, notifData] = await Promise.all([
          getProfile(user.token),
          getNotificationSettings(user.token)
        ]);

        if (profileData) {
          setProfile(profileData);
          setFirstName(profileData.first_name || user.firstName || "");
          setLastName(profileData.last_name || "");
          setEmail(profileData.email || user.email || "");
          setPhone(profileData.phone || user.phone || "");
          setDob(profileData.dob ? new Date(profileData.dob).toISOString().split('T')[0] : "");
        }

        if (notifData) {
          setNotifSettings(notifData);
          setEmailNotif(notifData.email_notification);
          setSmsNotif(notifData.sms_notification);
          setPushNotif(notifData.push_notification);
          setSchedule(notifData.reminder_schedule || "7,3,1");
        }
        
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        setError("Failed to load settings. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id || !user?.token) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await updateProfile({
        userId: user.id,
        firstName,
        lastName,
        email,
        dob
      }, user.token);
      
      setUser({ ...user, firstName, lastName, email });
      
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user?.token) return;
    
    if (!/^\d+(,\d+)*$/.test(schedule)) {
      setError("Invalid schedule format. Use comma separated numbers (e.g., 7,3,1)");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await updateNotificationSettings({
        email_notification: emailNotif,
        sms_notification: smsNotif,
        push_notification: pushNotif,
        reminder_schedule: schedule
      }, user.token);
      
      setNotifSettings({
        email_notification: emailNotif,
        sms_notification: smsNotif,
        push_notification: pushNotif,
        reminder_schedule: schedule
      });
      
      setSuccess("Notification preferences updated");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleInitiatePhoneChange = async () => {
    if (!user?.token) return;
    if (!newPhone || newPhone.length < 9) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }
    
    try {
      setPhoneLoading(true);
      setPhoneError(null);
      await initiatePhoneChange(newPhone, user.token);
      setPhoneModalStep(2);
    } catch (err: any) {
      setPhoneError(err.message || "Failed to initiate phone change.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneChange = async () => {
    if (!user?.token) return;
    if (!phoneOtp || phoneOtp.length < 4) {
      setPhoneError("Please enter a valid OTP.");
      return;
    }
    
    try {
      setPhoneLoading(true);
      setPhoneError(null);
      const result = await verifyPhoneChange(newPhone, phoneOtp, user.token);
      
      // Update the user context and local state
      setUser({
        ...user,
        phone: result.user.phone,
        token: result.token
      });
      setPhone(result.user.phone);
      
      // Close modal and show success
      setIsPhoneModalOpen(false);
      setSuccess("Phone number updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setPhoneError(err.message || "Verification failed. Check your OTP.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const closePhoneModal = () => {
    setIsPhoneModalOpen(false);
    setPhoneModalStep(1);
    setNewPhone("");
    setPhoneOtp("");
    setPhoneError(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.token) return;
    const file = e.target.files[0];

    try {
      setImageUploading(true);
      setError(null);
      const result = await uploadProfileImage(file, user.token);
      
      // Update local profile state and global context
      if (profile) setProfile({ ...profile, profile_picture: result.profile_picture });
      setUser({ ...user, profilePicture: result.profile_picture });
      
      setSuccess("Profile picture updated");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={48} />
          <p>Loading settings...</p>
        </div>
      </Layout>
    );
  }

  const userInitials = firstName ? `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase() : 'U';

  return (
    <Layout>
      <div className={styles.settingsContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your account settings and preferences.</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successBanner}>
            <span>{success}</span>
          </div>
        )}

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(null); }}
          >
            <User size={18} /> Profile
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'notifications' ? styles.active : ''}`}
            onClick={() => { setActiveTab('notifications'); setError(null); setSuccess(null); }}
          >
            <Bell size={18} /> Notifications
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'sharing' ? styles.active : ''}`}
            onClick={() => { setActiveTab('sharing'); setError(null); setSuccess(null); }}
          >
            <Users size={18} /> Sharing
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'premium' ? styles.active : ''}`}
            onClick={() => { setActiveTab('premium'); setError(null); setSuccess(null); }}
          >
            <Zap size={18} /> Premium
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Personal Information</h2>
              <p className={styles.cardSubtitle}>Update your personal details and contact info.</p>
            </div>
            
            <div className={styles.cardBody}>
              <div className={styles.avatarSection}>
                {profile?.profile_picture ? (
                  <img src={profile.profile_picture} alt="Profile" className={styles.avatar} />
                ) : (
                  <div className={styles.avatar}>{userInitials}</div>
                )}
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                  <button 
                    className={styles.avatarBtn} 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                  >
                    {imageUploading ? <Loader2 size={14} className={styles.spinner} style={{marginBottom:0, marginRight: '4px'}} /> : null}
                    {imageUploading ? "Uploading..." : "Change Avatar"}
                  </button>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>First Name</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input 
                    type="email" 
                    className={styles.input} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number</label>
                  <div className={styles.phoneFieldWrapper}>
                    <input 
                      type="tel" 
                      className={styles.input} 
                      value={phone}
                      disabled
                      style={{ flex: 1 }}
                    />
                    <button 
                      className={styles.changePhoneBtn}
                      onClick={() => setIsPhoneModalOpen(true)}
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date of Birth</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  {/* Empty space for alignment */}
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button 
                className={styles.btnPrimary} 
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className={styles.spinner} style={{marginBottom:0}} /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sharing' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Sharing</h2>
              <p className={styles.cardSubtitle}>
                Manage reminders you shared and items others shared with you.
              </p>
            </div>
            <div className={styles.cardBody}>
              <SharingSettings />
            </div>
          </div>
        )}

        {activeTab === 'premium' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Premium features</h2>
              <p className={styles.cardSubtitle}>
                {isPremium
                  ? 'Manage your Premium-only preferences.'
                  : 'Upgrade to unlock sharing, unlimited uploads, and Google Calendar sync.'}
              </p>
            </div>
            <div className={styles.cardBody}>
              {!isPremium ? (
                <PremiumUpgradeCard
                  title="Unlock Premium"
                  description="One-time payment for unlimited uploads, sharing reminders with other users, and Google Calendar sync."
                />
              ) : (
                <GoogleCalendarSync />
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Notification Preferences</h2>
              <p className={styles.cardSubtitle}>Choose how you'd like to receive reminder alerts.</p>
            </div>
            
            <div className={styles.cardBody}>
              <div className={styles.preferenceRow}>
                <div className={styles.preferenceInfo}>
                  <Mail size={20} color="#6B7280" />
                  <div className={styles.preferenceText}>
                    <h4>Email Notifications</h4>
                    <p>Receive reminder alerts via email.</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.preferenceRow}>
                <div className={styles.preferenceInfo}>
                  <MessageSquare size={20} color="#6B7280" />
                  <div className={styles.preferenceText}>
                    <h4>SMS Notifications</h4>
                    <p>Receive text messages for important reminders.</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={smsNotif}
                    onChange={(e) => setSmsNotif(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.preferenceRow}>
                <div className={styles.preferenceInfo}>
                  <Smartphone size={20} color="#6B7280" />
                  <div className={styles.preferenceText}>
                    <h4>Push Notifications</h4>
                    <p>Get alerts on your mobile device.</p>
                  </div>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={pushNotif}
                    onChange={(e) => setPushNotif(e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '24px' }}>
                <div className={styles.preferenceInfo} style={{ marginBottom: '16px' }}>
                  <Calendar size={20} color="#6B7280" />
                  <div className={styles.preferenceText}>
                    <h4>Reminder Schedule</h4>
                    <p>Days before expiration to send notifications (comma separated).</p>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g., 30,7,3,1"
                  />
                  <small style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px' }}>
                    Current schedule: {notifSettings?.reminder_schedule || "7,3,1"}
                  </small>
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button 
                className={styles.btnPrimary} 
                onClick={handleSaveNotifications}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className={styles.spinner} style={{marginBottom:0}} /> : <Save size={16} />}
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phone Change Modal */}
      {isPhoneModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Change Phone Number</h3>
              <button className={styles.closeModalBtn} onClick={closePhoneModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {phoneError && (
                <div className={styles.errorBanner} style={{ padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                  <span>{phoneError}</span>
                </div>
              )}
              
              {phoneModalStep === 1 ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>New Phone Number</label>
                  <input 
                    type="tel" 
                    className={styles.input} 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    autoFocus
                  />
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px', marginBottom: 0 }}>
                    We'll send an OTP to this new number to verify.
                  </p>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Enter OTP</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="Enter 4-digit code"
                    autoFocus
                  />
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px', marginBottom: 0 }}>
                    Code sent to {newPhone}.
                  </p>
                </div>
              )}
            </div>
            
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={closePhoneModal} disabled={phoneLoading}>
                Cancel
              </button>
              {phoneModalStep === 1 ? (
                <button className={styles.btnPrimary} onClick={handleInitiatePhoneChange} disabled={phoneLoading}>
                  {phoneLoading ? <Loader2 size={16} className={styles.spinner} style={{marginBottom:0}} /> : "Send OTP"}
                </button>
              ) : (
                <button className={styles.btnPrimary} onClick={handleVerifyPhoneChange} disabled={phoneLoading}>
                  {phoneLoading ? <Loader2 size={16} className={styles.spinner} style={{marginBottom:0}} /> : "Verify & Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
