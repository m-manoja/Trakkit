import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState,
  Modal, FlatList, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import PremiumModal from './PremiumModal';
import {
  fetchNotifications,
  fetchUnreadCount,
  deleteNotification,
  clearAllNotifications,
  AppNotification,
} from '../api/notifications';

// Mapping from reference_type to readable label and target route
const TYPE_META: Record<string, { label: string; route: string }> = {
  subscription:    { label: 'Subscription',   route: '/(tabs)/subscription' },
  warranty:        { label: 'Warranty',        route: '/(tabs)/warranty' },
  todo:            { label: 'To Do',           route: '/(tabs)/todo' },
  manual_reminder: { label: 'Reminder',        route: '/(tabs)/reminder' },
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
  loading: boolean;
  selectedIds: Set<string>;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectMode: () => void;
  onDeleteSelected: () => void;
  onItemPress: (item: AppNotification) => void;
  onClose: () => void;
}

function ListView({
  notifications, loading, selectedIds, selectMode,
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
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={40} color="#CCC" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          style={styles.list}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.reference_type] || { label: 'Notification', route: '/' };
            const isSelected = selectedIds.has(item.id);
            const isNew = item.status === 'pending';

            return (
              <TouchableOpacity
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
          }}
        />
      )}
    </>
  );
}

// ─── DETAIL VIEW ─────────────────────────────────────────────────────────────

interface DetailViewProps {
  item: AppNotification;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

function DetailView({ item, onBack, onClose, onNavigate }: DetailViewProps) {
  const meta = TYPE_META[item.reference_type] || { label: 'Notification', route: '/' };

  return (
    <>
      <View style={styles.panelHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailContent}>
        <View style={styles.detailMeta}>
          <Text style={styles.notifCategory}>{meta.label}</Text>
          <Text style={styles.notifDate}>{formatDate(item.scheduled_for)}</Text>
        </View>
        <Text style={styles.detailTitle}>
          {item.title.replace(/^(Subscription Renewal:|Warranty Expiry:|Todo Reminder:|Reminder:)\s?/i, '')}
        </Text>
        <Text style={styles.detailBody}>{item.body}</Text>

        <TouchableOpacity onPress={() => onNavigate(meta.route)}>
          <Text style={styles.goToLink}>Go to {meta.label.toLowerCase()}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
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
  const [premiumVisible, setPremiumVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AppNotification | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    if (!user?.token) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(user.token);
      setNotifications(data);
      setUnreadCount(0); // clear badge once opened
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const closePanel = () => {
    setPanelVisible(false);
    setSelectedItem(null);
    setSelectMode(false);
    setSelectedIds(new Set());
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

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.logoText}>Trakkit</Text>
          <Text style={styles.greetingText}>Hello, {user?.firstName || 'User'}!</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setPremiumVisible(true)}>
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
                onBack={() => setSelectedItem(null)}
                onClose={closePanel}
                onNavigate={handleNavigate}
              />
            ) : (
              <ListView
                notifications={notifications}
                loading={loading}
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

      {/* Premium Upgrade Modal */}
      <PremiumModal
        visible={premiumVisible}
        onClose={() => setPremiumVisible(false)}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.primary },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
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
  list: { flex: 1 },
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
  detailContent: { padding: 18, paddingTop: 8 },
  detailMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  detailBody: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 24 },
  goToLink: {
    fontSize: 14, fontWeight: '600', color: COLORS.primary,
    textDecorationLine: 'underline',
  },

  // Loading / empty
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { paddingVertical: 30, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#AAA' },
});
