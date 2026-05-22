import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/theme/colors';
import {
  fetchNotifications,
  deleteNotification,
  clearAllNotifications,
  markNotificationsRead,
  AppNotification,
} from '../../src/api/notifications';

// Map reference_type to its destination tab route
const TYPE_ROUTE: Record<string, string> = {
  subscription: '/(tabs)/subscription',
  warranty: '/(tabs)/warranty',
  todo: '/(tabs)/todo',
  manual_reminder: '/(tabs)/reminder',
};

// Map reference_type to icon + color
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  subscription: { icon: 'card-outline', color: '#6C63FF', label: 'Subscription' },
  warranty: { icon: 'shield-checkmark-outline', color: '#FF6B6B', label: 'Warranty' },
  todo: { icon: 'checkbox-outline', color: '#20BF6B', label: 'Todo' },
  manual_reminder: { icon: 'alarm-outline', color: '#F7B731', label: 'Reminder' },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function groupNotificationsByDate(notifications: AppNotification[]): { title: string; data: AppNotification[] }[] {
  const groups: Record<string, AppNotification[]> = {};

  for (const n of notifications) {
    const d = new Date(n.scheduled_for);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let key: string;
    if (d.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const token = user?.token;
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const result = await fetchNotifications(token);
      setNotifications(result.notifications);
      setNewIds(result.newIds);
      // Mark newly fetched (pending/notified) as read in the background
      if (result.newIds.size > 0) {
        markNotificationsRead(Array.from(result.newIds), token).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await deleteNotification(id, token);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      Alert.alert('Error', 'Could not remove notification');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Remove all delivered notifications from your inbox?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await clearAllNotifications(token);
              // Remove all sent/notified notifications (keep none — backend deletes by status='sent')
              setNotifications([]);
              setNewIds(new Set());
            } catch {
              Alert.alert('Error', 'Could not clear notifications');
            }
          },
        },
      ]
    );
  };

  const groups = groupNotificationsByDate(notifications);
  const hasDelivered = notifications.length > 0;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const config = TYPE_CONFIG[item.reference_type] || TYPE_CONFIG.manual_reminder;
    const isNew = newIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles.notifCard, isNew && styles.notifCardNew]}
        onPress={() => setSelectedNotif(item)}
      >
        {/* Left accent */}
        <View style={[styles.typeAccent, { backgroundColor: config.color }]} />

        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
          <Ionicons name={config.icon as any} size={22} color={config.color} />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
            {isNew && <View style={styles.newDot} />}
          </View>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{formatRelativeTime(item.scheduled_for)}</Text>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => { e.stopPropagation?.(); handleDelete(item.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#AAA" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: { title: string; data: AppNotification[] } }) => (
    <View>
      <Text style={styles.groupHeader}>{item.title}</Text>
      {item.data.map(n => (
        <View key={n.id}>
          {renderNotification({ item: n })}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.length === 0 ? 'All caught up!' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={16} color={COLORS.primary} />
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="bell-sleep-outline" size={90} color="#D5D5D5" />
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySubtitle}>
            Reminders from your subscriptions, warranties, todos, and manual reminders will appear here when they're due.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.title}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); loadNotifications(); }}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* ── Notification Detail Modal ─────────────────────────────── */}
      <Modal
        visible={!!selectedNotif}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setSelectedNotif(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.detailCard}>
            {selectedNotif && (() => {
              const cfg = TYPE_CONFIG[selectedNotif.reference_type] || TYPE_CONFIG.manual_reminder;
              const route = TYPE_ROUTE[selectedNotif.reference_type] || '/(tabs)/reminder';
              return (
                <>
                  {/* Coloured top bar */}
                  <View style={[styles.detailBar, { backgroundColor: cfg.color }]} />

                  {/* Header row */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconCircle, { backgroundColor: cfg.color + '18' }]}>
                      <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
                    </View>
                    <TouchableOpacity onPress={() => setSelectedNotif(null)} style={styles.detailClose}>
                      <Ionicons name="close" size={20} color="#888" />
                    </TouchableOpacity>
                  </View>

                  {/* Type badge */}
                  <View style={[styles.detailTypeBadge, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={[styles.detailTypeBadgeText, { color: cfg.color }]}>{cfg.label} Reminder</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.detailTitle}>{selectedNotif.title}</Text>

                  {/* Body */}
                  <Text style={styles.detailBody}>{selectedNotif.body}</Text>

                  {/* Time */}
                  <View style={styles.detailTimeRow}>
                    <Ionicons name="time-outline" size={14} color="#AAA" />
                    <Text style={styles.detailTime}>
                      {new Date(selectedNotif.scheduled_for).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.detailDivider} />

                  {/* Navigation button */}
                  <TouchableOpacity
                    style={[styles.detailNavBtn, { backgroundColor: cfg.color }]}
                    onPress={() => {
                      setSelectedNotif(null);
                      router.push(route as any);
                    }}
                  >
                    <Ionicons name="arrow-forward-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.detailNavBtnText}>View {cfg.label}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2F2',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  clearAllText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  // Group section
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
  },

  // Notification card
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    alignItems: 'center',
  },
  notifCardNew: {
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    backgroundColor: '#FFF9FB',
  },
  typeAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  notifContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 10,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  notifBody: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
    marginBottom: 5,
  },
  notifTime: {
    fontSize: 10,
    color: '#AAA',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 12,
    alignSelf: 'flex-start',
  },

  // ── Detail Modal ───────────────────────────────────────────────
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 10,
  },
  detailBar: {
    height: 5,
    width: '100%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  detailIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTypeBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginHorizontal: 20,
    marginTop: 8,
    lineHeight: 24,
  },
  detailBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginHorizontal: 20,
    marginTop: 8,
  },
  detailTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 20,
    marginTop: 12,
  },
  detailTime: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 16,
  },
  detailNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  detailNavBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C0C0C0',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 21,
  },
});
