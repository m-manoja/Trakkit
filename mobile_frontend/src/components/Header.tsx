import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState,
  Modal, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  deleteNotification,
  clearAllNotifications,
  markNotificationsRead,
  AppNotification,
} from '../api/notifications';
import { API_BASE_URL } from '../api/config';

// Mapping from reference_type to readable label and target route
const TYPE_META: Record<string, { label: string; route: string; icon: string }> = {
  subscription:    { label: 'Subscription', route: '/(tabs)/subscription', icon: 'card-outline'             },
  warranty:        { label: 'Warranty',      route: '/(tabs)/warranty',     icon: 'shield-checkmark-outline' },
  todo:            { label: 'To Do',         route: '/(tabs)/todo',         icon: 'checkbox-outline'         },
  manual_reminder: { label: 'Reminder',      route: '/(tabs)/reminder',     icon: 'alarm-outline'            },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// ─── LIST VIEW ──────────────────────────────────────────────────────────────

interface ListViewProps {
  notifications: AppNotification[];
  newIds: Set<string>;
  loading: boolean;
  fetchError: string | null;
  selectedIds: Set<string>;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectMode: () => void;
  onDeleteSelected: () => void;
  onItemPress: (item: AppNotification) => void;
  onClose: () => void;
}

function ListView({
  notifications, newIds, loading, fetchError, selectedIds, selectMode,
  onToggleSelect, onToggleSelectMode, onDeleteSelected,
  onItemPress, onClose,
}: ListViewProps) {
  return (
    <>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Notifications</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Select bar */}
      <View style={styles.selectBar}>
        <TouchableOpacity style={styles.selectTrigger} onPress={onToggleSelectMode}>
          <View style={[styles.selectCircle, selectMode && styles.selectCircleActive]}>
            {selectMode && <View style={styles.selectCircleDot} />}
          </View>
          <Text style={styles.selectLabel}>Select</Text>
        </TouchableOpacity>
        {selectMode && selectedIds.size > 0 && (
          <TouchableOpacity onPress={onDeleteSelected}>
            <Ionicons name="trash-outline" size={20} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cloud-offline-outline" size={40} color="#FF6B6B" />
          <Text style={[styles.emptyText, { color: '#FF6B6B', textAlign: 'center', marginTop: 6 }]}>{fetchError}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={40} color="#CCC" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {notifications.map(item => {
            const meta = TYPE_META[item.reference_type] || { label: 'Notification', route: '/' };
            const isSelected = selectedIds.has(item.id);
            const isNew = newIds.has(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.notifRow, isNew && styles.notifRowNew]}
                onPress={() => selectMode ? onToggleSelect(item.id) : onItemPress(item)}
                activeOpacity={0.7}
              >
                {selectMode && (
                  <View style={[styles.rowCheckCircle, isSelected && styles.rowCheckCircleActive]}>
                    {isSelected && <View style={styles.rowCheckDot} />}
                  </View>
                )}
                <View style={styles.notifRowContent}>
                  <View style={styles.notifMeta}>
                    <Text style={styles.notifCategory}>{meta.label}</Text>
                    <Text style={styles.notifDate}>{formatDate(item.scheduled_for)}</Text>
                  </View>
                  <View style={styles.notifTitleRow}>
                    <Ionicons
                      name={isNew ? 'notifications' : 'notifications-outline'}
                      size={15}
                      color={isNew ? COLORS.primary : '#888'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.notifTitle, isNew && styles.notifTitleNew]} numberOfLines={1}>
                      {item.title.replace(/^(Subscription Renewal:|Warranty Expiry:|Todo Reminder:|Reminder:)\s?/i, '')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  );
}

// ─── DETAIL VIEW ─────────────────────────────────────────────────────────────

interface DetailViewProps {
  item: AppNotification;
  itemDetail: any;
  itemLoading: boolean;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

function renderItemFields(type: string, detail: any) {
  if (!detail) return null;
  switch (type) {
    case 'manual_reminder':
      return (
        <>
          {detail.reminder_date && <DetailRow label="Date" value={new Date(detail.reminder_date).toLocaleDateString()} />}
          {detail.type && <DetailRow label="Type" value={detail.type} />}
          {detail.remind_time && <DetailRow label="Remind" value={detail.remind_time} />}
          {detail.repeat_cycle && <DetailRow label="Repeat" value={detail.repeat_cycle} />}
          {detail.description ? <DetailRow label="Notes" value={detail.description} /> : null}
        </>
      );
    case 'subscription':
      return (
        <>
          {detail.amount && <DetailRow label="Amount" value={`Rs. ${detail.amount} / ${detail.billing_cycle}`} />}
          {detail.category && <DetailRow label="Category" value={detail.category} />}
          {detail.next_billing_date && <DetailRow label="Next Billing" value={new Date(detail.next_billing_date).toLocaleDateString()} />}
          {detail.status && <DetailRow label="Status" value={detail.status} />}
          {detail.description ? <DetailRow label="Notes" value={detail.description} /> : null}
        </>
      );
    case 'warranty':
      return (
        <>
          {detail.purchase_place && <DetailRow label="Purchased From" value={detail.purchase_place} />}
          {detail.category && <DetailRow label="Category" value={detail.category} />}
          {detail.purchase_date && <DetailRow label="Purchase Date" value={new Date(detail.purchase_date).toLocaleDateString()} />}
          {detail.expiry_date && <DetailRow label="Expiry Date" value={new Date(detail.expiry_date).toLocaleDateString()} />}
          {detail.status && <DetailRow label="Status" value={detail.status} />}
          {detail.description ? <DetailRow label="Notes" value={detail.description} /> : null}
        </>
      );
    case 'todo':
      return (
        <>
          {detail.reminder_date && <DetailRow label="Due Date" value={new Date(detail.reminder_date).toLocaleDateString()} />}
          <DetailRow label="Status" value={detail.is_completed ? 'Completed ✓' : 'Pending'} />
        </>
      );
    default:
      return null;
  }
}

function DetailView({ item, itemDetail, itemLoading, onBack, onClose, onNavigate }: DetailViewProps) {
  const meta = TYPE_META[item.reference_type] || { label: 'Notification', route: '/', icon: 'notifications-outline' };
  const title = item.title.replace(/^(Subscription Renewal:|Warranty Expiry:|Todo Reminder:|Reminder:)\s?/i, '');
  const body  = item.body;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
      {/* Coloured accent bar */}
      <View style={[styles.detailAccentBar, { backgroundColor: COLORS.primary }]} />

      {/* Top row: icon + back + close */}
      <View style={styles.detailPromptHeader}>
        <View style={[styles.detailPromptIcon, { backgroundColor: COLORS.primary + '20' }]}>
          <Ionicons name={meta.icon as any} size={28} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.detailPromptIconBtn}>
          <Ionicons name="chevron-back" size={20} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.detailPromptIconBtn}>
          <Ionicons name="close" size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Type badge */}
      <View style={[styles.detailPromptBadge, { backgroundColor: COLORS.primary + '18' }]}>
        <Text style={[styles.detailPromptBadgeText, { color: COLORS.primary }]}>{meta.label} Reminder</Text>
      </View>

      <View style={styles.detailContent}>
        {/* Title */}
        <Text style={styles.detailTitle}>{title}</Text>

        {/* Body message */}
        {!!body && (
          <View style={styles.detailBodyBox}>
            <Text style={styles.detailBody}>{body}</Text>
          </View>
        )}

        {/* Scheduled time */}
        <View style={styles.detailTimeRow}>
          <Ionicons name="time-outline" size={13} color="#AAA" />
          <Text style={styles.detailTimeText}>
            {new Date(item.scheduled_for).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Item-specific fields */}
        {itemLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 16 }} />
        ) : (
          itemDetail && (
            <View style={styles.detailFieldsBox}>
              {renderItemFields(item.reference_type, itemDetail)}
            </View>
          )
        )}

        {/* Navigation button */}
        <TouchableOpacity
          onPress={() => onNavigate(meta.route)}
          style={[styles.detailNavBtn, { backgroundColor: COLORS.primary }]}
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.detailNavBtnText}>Open in {meta.label}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
}

export default function Header({ title, showBackButton = false, showAddButton = false, onAddPress }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isProfilePage = pathname === '/(tabs)/profile' || pathname === '/(tabs)/profile_setup';

  const [unreadCount, setUnreadCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AppNotification | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemDetail, setItemDetail] = useState<any>(null);
  const [itemLoading, setItemLoading] = useState(false);

  const refreshBadge = useCallback(async () => {
    if (!user?.token) return;
    try {
      const count = await fetchUnreadCount(user.token);
      setUnreadCount(count);
    } catch { /* silent */ }
  }, [user?.token]);

  useEffect(() => {
    refreshBadge();
    const interval = setInterval(refreshBadge, 60000);
    const listener = AppState.addEventListener('change', s => { if (s === 'active') refreshBadge(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, [refreshBadge]);

  const openPanel = async () => {
    setPanelVisible(true);
    setSelectedItem(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setFetchError(null);
    if (!user?.token) return;
    setLoading(true);
    try {
      const result = await fetchNotifications(user.token);
      setNotifications(result.notifications);
      setNewIds(result.newIds);
      setUnreadCount(0); // clear badge after successful fetch
      // Mark the new (pending/notified) notifications as read in the background
      if (result.newIds.size > 0) {
        markNotificationsRead(Array.from(result.newIds), user.token).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setFetchError('Could not load notifications. Check your connection.');
    }
    finally { setLoading(false); }
  };

  const closePanel = () => {
    setPanelVisible(false);
    setSelectedItem(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setNewIds(new Set());
    setFetchError(null);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    Alert.alert('Delete', `Remove ${selectedIds.size} notification(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!user?.token) return;
          for (const id of selectedIds) {
            await deleteNotification(id, user.token).catch(() => {});
          }
          setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
          setSelectedIds(new Set());
          setSelectMode(false);
        }
      }
    ]);
  };

  const handleNavigate = (route: string) => {
    closePanel();
    router.push(route as any);
  };

  // Fetch real item data when a notification is selected
  useEffect(() => {
    if (!selectedItem || !user?.token) { setItemDetail(null); return; }
    const endpoints: Record<string, string> = {
      manual_reminder: `${API_BASE_URL}/api/reminders/${selectedItem.reference_id}`,
      subscription:    `${API_BASE_URL}/api/subscriptions/${selectedItem.reference_id}`,
      warranty:        `${API_BASE_URL}/api/warranties/${selectedItem.reference_id}`,
      todo:            `${API_BASE_URL}/api/todos/${selectedItem.reference_id}`,
    };
    const url = endpoints[selectedItem.reference_type];
    if (!url) return;
    setItemLoading(true);
    setItemDetail(null);
    fetch(url, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json())
      .then(json => setItemDetail(json.data || json))
      .catch(() => {})
      .finally(() => setItemLoading(false));
  }, [selectedItem, user?.token]);

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../../assets/images/icon.png')} style={styles.headerLogo} />
          <View>
            <Text style={styles.logoText}>Trakkit</Text>
            <Text style={styles.greetingText}>Hello, {user?.firstName || 'User'}!</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/pricing')}>
            <Ionicons name="diamond" size={22} color="#70d8ff" />
          </TouchableOpacity>

          {/* Bell */}
          <TouchableOpacity style={styles.iconButton} onPress={openPanel}>
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={24}
              color="white"
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="person-circle-outline" size={24} color={isProfilePage ? COLORS.primary : 'white'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Panel Modal */}
      <Modal visible={panelVisible} transparent animationType="fade" onRequestClose={closePanel}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closePanel}>
          <TouchableOpacity activeOpacity={1} style={styles.panel} onPress={() => {}}>
            {selectedItem ? (
              <DetailView
                item={selectedItem}
                itemDetail={itemDetail}
                itemLoading={itemLoading}
                onBack={() => setSelectedItem(null)}
                onClose={closePanel}
                onNavigate={handleNavigate}
              />
            ) : (
              <ListView
                notifications={notifications}
                newIds={newIds}
                loading={loading}
                fetchError={fetchError}
                selectedIds={selectedIds}
                selectMode={selectMode}
                onToggleSelect={handleToggleSelect}
                onToggleSelectMode={() => { setSelectMode(p => !p); setSelectedIds(new Set()); }}
                onDeleteSelected={handleDeleteSelected}
                onItemPress={setSelectedItem}
                onClose={closePanel}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.primary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: '#FFF' },
  iconButton: { marginLeft: 15, position: 'relative' },
  logoText: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  greetingText: { fontSize: 12, color: 'white', marginTop: 4 },
  badge: {
    position: 'absolute', top: -5, right: -7,
    backgroundColor: '#FF3B30', borderRadius: 9,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // Modal overlay + panel
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start', alignItems: 'center',
    paddingTop: 80, paddingHorizontal: 16,
  },
  panel: {
    backgroundColor: '#FFF', borderRadius: 16, width: '100%',
    maxHeight: '75%', overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },

  // Panel header row
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  // Select bar
  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 8,
  },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#999',
    justifyContent: 'center', alignItems: 'center',
  },
  selectCircleActive: { borderColor: COLORS.primary },
  selectCircleDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary,
  },
  selectLabel: { fontSize: 13, color: '#444' },

  // List
  list: { maxHeight: 400 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  notifRowNew: { backgroundColor: '#FFF6F8' },
  rowCheckCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: '#AAA',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10, marginTop: 2,
  },
  rowCheckCircleActive: { borderColor: COLORS.primary },
  rowCheckDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },
  notifRowContent: { flex: 1 },
  notifMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  notifCategory: { fontSize: 11, color: '#777', fontWeight: '600' },
  notifDate: { fontSize: 11, color: '#777' },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center' },
  notifTitle: { fontSize: 13, color: '#333', flex: 1 },
  notifTitleNew: { fontWeight: '700', color: '#1A1A1A' },

  // Detail
  detailContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4 },
  detailMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 10 },
  detailBodyBox: {
    backgroundColor: COLORS.primary + '0D',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  detailBody: { fontSize: 14, color: '#333', lineHeight: 22 },
  detailFieldsBox: {
    backgroundColor: '#F8F8F8', borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#EFEFEF',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  detailRowLabel: { fontSize: 13, color: '#888', flex: 1 },
  detailRowValue: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, textAlign: 'right' },
  goToBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  goToLink: {
    fontSize: 14, fontWeight: '600', color: COLORS.primary,
  },

  // Loading / empty
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { paddingVertical: 30, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#AAA' },

  // Detail prompt redesign
  detailAccentBar: { height: 5, width: '100%' },
  detailPromptHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  detailPromptIcon: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  detailPromptIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  detailPromptBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 18, marginTop: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  detailPromptBadgeText: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  detailTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 16,
  },
  detailTimeText: { fontSize: 12, color: '#AAA', fontWeight: '500' },
  detailNavBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 14, marginTop: 20,
  },
  detailNavBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

